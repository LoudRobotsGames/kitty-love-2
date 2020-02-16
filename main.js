const GAME_WIDTH = 968;
const GAME_HEIGHT = 480;
const ZOOM_SCALE = 2;
const GRAVITY = 600 * ZOOM_SCALE;
const PLAYER_SPEED = 200 * ZOOM_SCALE;
const PLAYER_JUMP = 220 * ZOOM_SCALE;
const PLAYER_SCALE = 3 * ZOOM_SCALE;
const TILEMAP_SCALE = 2.5 * ZOOM_SCALE;
const SPIKES_INDEX = 18;
const TABLE_LEFT_INDEX = 80;
const TABLE_MIDDLE_INDEX = 81;
const TABLE_RIGHT_INDEX = 82;
const COIN_INDEX = 5;

const LEVEL_LAYER = 'Level';

Boot = function (game) { };

Boot.prototype = {
	preload: function () {
        game.scale.pageAlignHorizontally = true;
        game.scale.pageAlignVertically = true;
        game.scale.updateLayout(true);

        game.scale.fullScreenScaleMode = Phaser.ScaleManager.SHOW_ALL;
        game.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
        game.renderer.renderSession.roundPixels = true;
        Phaser.Canvas.setImageRenderingCrisp(this.game.canvas);
        game.scale.refresh();

		game.stage.backgroundColor = '#0';
		game.load.image('loading', 'assets/loading.png');
		game.load.image('loading2', 'assets/loading2.png');
	},
	create: function() {
		this.game.state.start('Load');
	}
};

Load = function (game) { };

Load.prototype = {
	preload: function () {
        var w = GAME_WIDTH;
        var h = GAME_HEIGHT;
	    this.label2 = game.add.text(Math.floor(w/2)+0.5, Math.floor(h/2)-15+0.5, 'loading...', { font: '30px Arial', fill: '#fff' });
		this.label2.anchor.setTo(0.5, 0.5);

		this.preloading2 = game.add.sprite(w/2, h/2+15, 'loading2');
		this.preloading2.x -= this.preloading2.width/2;
		this.preloading = game.add.sprite(w/2, h/2+19, 'loading');
		this.preloading.x -= this.preloading.width/2;
        game.load.setPreloadSprite(this.preloading);

        game.load.tilemap('level-1', 'assets/level-1.json', null, Phaser.Tilemap.TILED_JSON);
        game.load.tilemap('level-2', 'assets/level-2.json', null, Phaser.Tilemap.TILED_JSON);
        game.load.tilemap('level-3', 'assets/level-3.json', null, Phaser.Tilemap.TILED_JSON);
        game.load.image('platform_tiles', 'assets/platform_tiles.png');

        game.load.image('wall', 'assets/brick.png');
        game.load.image('heart', 'assets/heart.png');
        game.load.image('enemy', 'assets/spikes.png');
        game.load.image('dust', 'assets/dust.png');
        game.load.image('exp', 'assets/exp.png');
        if (!game.device.desktop) {
			game.load.image('right', 'assets/right.png');
            game.load.image('left', 'assets/left.png');
            game.load.image('jump', 'assets/up.png');
		}
		
        game.load.spritesheet('kitty', 'assets/kitty.png', 8, 8);

        game.load.audio('dead', 'assets/dead.wav');
        game.load.audio('dust', 'assets/dust.wav');
        game.load.audio('heart', 'assets/coin.wav');
        game.load.audio('jump', 'assets/jump.wav');
        game.load.audio('music', 'assets/music.mp3');
    },
	create: function () {
        this.label2.text = "Press Any Key To Play";
        this.preloading2.visible = false;
        this.preloading.visible = false;

        game.input.keyboard.onDownCallback = this.advance;
    },
    advance: function() {
        game.input.keyboard.onDownCallback = undefined;
        game.state.start('main');
    },
    update: function () {
        if (game.input.activePointer.isDown) {
            this.advance();
        }
    }
}

var mainState = {
    preload: function() {
    },
    create: function() {
        game.stage.backgroundColor = "#1A1726";
        game.physics.startSystem(Phaser.Physics.ARCADE);
        game.world.enableBody = true;

		this.deadSound = game.add.audio('dead', 0.1);
		this.jumpSound = game.add.audio('jump', 0.1);
		this.dustSound = game.add.audio('dust', 0.1);
        this.heartSound = game.add.audio('heart', 0.1);
        this.musicLoop = game.add.audio('music', 0.1, true);
        this.musicLoop.play();

        this.background = game.add.group();
        this.labels = game.add.group();
        
        this.cursor = game.input.keyboard.createCursorKeys();
        this.wasd = {
            up: game.input.keyboard.addKey(Phaser.Keyboard.W),
            down: game.input.keyboard.addKey(Phaser.Keyboard.S),
            left: game.input.keyboard.addKey(Phaser.Keyboard.A),
            right: game.input.keyboard.addKey(Phaser.Keyboard.D),
          };
        game.input.keyboard.addKeyCapture([Phaser.Keyboard.SPACEBAR]);

        this.player = game.add.sprite(100, 100, 'kitty');
        this.player.body.gravity.y = GRAVITY;
        this.player.animations.add('idle', [5, 5, 6, 6, 5], 5, true);
        this.player.animations.add('run', [0, 1, 4, 3], 8, true);
        this.player.animations.add('walk', [0, 1, 2, 3], 4, true);
        this.player.body.setSize(6.5, 6.5, 0, 1.8);
        this.player.smoothing = false;
        this.player.anchor.setTo(0.5, 0.5);
        game.physics.enable(this.player);
        game.camera.follow(this.player, Phaser.Camera.FOLLOW_PLATFORMER, 0.5, 0.5);

        this.level = game.add.group();
        this.hearts = game.add.group();
        this.foreground = game.add.group();

        this.playerDead = false;
        this.heartsTotal = 20;
        this.heartsCollected = 0;

        this.currentLevel = 1;
        this.totalLevels = 2;

        this.scoreString = 'Hearts : ';
        this.scoreText = game.add.text(GAME_WIDTH / 2, 10, this.scoreString + this.heartsCollected, { font: '18px Arial', fill: '#fff' });
        this.scoreText.anchor.setTo(0.5, 0.5);

        this.loadLevel();
        this.setParticles();

        this.spawnPlayer();

		if (!game.device.desktop) {
            this.addMobileInputs();
        }
    },
    update: function() {
        game.physics.arcade.collide(this.player, this.tileLayer);
        game.physics.arcade.overlap(this.player, this.hearts, this.takeCoin, null, this);

        this.inputs();
        this.exp.forEachAlive(function(p){
			p.alpha = game.math.clamp(p.lifespan / 100, 0, 1);
        }, this);
    },

    inputs: function() {
        if (this.input.keyboard.justPressed(Phaser.Keyboard.ONE))
        {
            this.currentLevel = 1;
            this.loadLevel();
            this.spawnPlayer();
            return;
        } else if (this.input.keyboard.justPressed(Phaser.Keyboard.TWO))
        {
            this.currentLevel = 2;
            this.loadLevel();
            this.spawnPlayer();
            return;
        }

        if (this.cursor.left.isDown || this.wasd.left.isDown || this.moveLeft) {
            this.player.body.velocity.x = -PLAYER_SPEED;
            if (this.player.scale.x > 0) {
                this.player.scale.x *= -1;
            }
            if (!this.hasContactDown()) {
                this.player.frame = 4;
            } else { 
                this.player.animations.play('run');
            }
        }
        else if (this.cursor.right.isDown || this.wasd.right.isDown || this.moveRight) {
            this.player.body.velocity.x = PLAYER_SPEED;
            if (this.player.scale.x < 0) {
                this.player.scale.x *= -1;
            }
            if (!this.hasContactDown()) {
                this.player.frame = 4;
            } else { 
                this.player.animations.play('run');
            }
        }
        else  {
            this.player.body.velocity.x = 0;
        }

        if (this.player.body.velocity.x == 0) {
            this.player.animations.play('idle');
        }

        if (this.hasContactDown() && this.player.body.velocity.y < 100) {			
			if (this.hasJumped) {
				this.dustSound.play();
				this.dust.x = this.player.x;
				this.dust.y = this.player.y+10;
				this.dust.start(true, 220, null, 8);
			}

			this.hasJumped = false;
        }
        if (this.cursor.up.isDown || this.wasd.up.isDown || this.input.keyboard.isDown(Phaser.Keyboard.SPACEBAR)) {
			this.jumpPlayer();
        }
    },
    hasTileAbove: function() {
        var tilex = Math.floor((this.player.x / TILEMAP_SCALE) / this.tileMap.tileWidth);
        var tiley = Math.floor((this.player.y / TILEMAP_SCALE) / this.tileMap.tileHeight);
        var tile = this.tileMap.getTile(tilex, tiley - 1, LEVEL_LAYER);
        if (tile != null && tile.collideDown) {
            return true;
        }
        return false;
    },
    hasContactDown: function() {
        return this.player.body.blocked.down || this.player.body.touching.down;
    },
	jumpPlayer: function() {
		if (this.hasContactDown() && !this.hasTileAbove()) {
			game.sound.mute = false;
			this.hasJumped = true;
			this.jumpSound.play();
            this.player.body.velocity.y = -PLAYER_JUMP;
            var a = this.player.angle + 90;
            var tween = game.add.tween(this.player).to({angle: a}, 100).start();
            tween.onComplete.add(this.rotateComplete, this);
		}
    },
    rotateComplete: function() {
        this.player.angle = 0
    },
    hitTrap: function(player, tile) {
        var y = tile.y * TILEMAP_SCALE * this.tileMap.tileHeight;
        if (y < this.player.y) {
            return true;
        }
        this.spawnPlayer(true);
        return false;
    },
    spawnPlayer: function(dead) {
        if (this.playerDead) {
            this.exp.x = this.player.x;
            this.exp.y = this.player.y + 10;
            this.exp.start(true, 300, null, 20);

            if (dead) {
                game.camera.shake(0.01, 50);
                //this.shakeEffect(this.tileLayer);
                //this.shakeEffect(this.enemies);
                this.deadSound.play();
            }
        }

		this.player.scale.setTo(0, 0);
		game.add.tween(this.player.scale).to({x:PLAYER_SCALE, y:PLAYER_SCALE}, 300).start();
		this.player.reset(100, 100);
		
		this.hasJumped = true;
		this.playerDead = true;

		this.moveLeft = false;
		this.moveRight = false;
    },
    getLevel: function() {
        var level_name = '';
        if (this.currentLevel > this.totalLevels) {
            this.gameOver = true;
            level_name = 'level-3';
        }
        else if (this.currentLevel == 1) {
            level_name = 'level-1';
        } else if (this.currentLevel == 2) {
            level_name = 'level-2';
        }
        if (this.tileMap != null) {
            this.tileMap.destroy();
        }
        this.tileMap = game.add.tilemap(level_name);
        this.tileMap.addTilesetImage('platform_tiles', 'platform_tiles');
        var index = this.tileMap.getLayer(LEVEL_LAYER);
        if (index !== null) {
            var layer = this.tileMap.createLayer('Background');

            layer.setScale(TILEMAP_SCALE, TILEMAP_SCALE);
            this.background.add(layer);

            this.tileMap.createFromObjects('Objects', 27, '', 0,  true, false, this.labels);

            this.tileLayer = this.tileMap.createLayer(LEVEL_LAYER);
            this.level.add(this.tileLayer);
            this.tileLayer.setScale(TILEMAP_SCALE, TILEMAP_SCALE);
            this.tileLayer.resizeWorld();
            this.tileMap.setLayer(index);
            this.tileMap.setCollisionByExclusion([COIN_INDEX, 120], LEVEL_LAYER);
            this.tileMap.setTileIndexCallback(SPIKES_INDEX, this.hitTrap, this, LEVEL_LAYER);

            var fore = this.tileMap.createLayer('Foreground');
            if (fore != undefined && fore != null) {
                fore.setScale(TILEMAP_SCALE, TILEMAP_SCALE);
                this.foreground.add(fore);
            }
        }
    },
    loadLevel: function() {
        this.background.forEachAlive(function(child){
            child.destroy();
        });
        this.background.removeAll();
        this.level.forEach(function(child) {
            child.destroy();
        });
        this.level.removeAll();
        this.labels.forEachAlive(function(child) {
            child.destroy();
        });
        this.labels.removeAll();
        this.foreground.forEachAlive(function(child) {
            child.destroy();
        });
        this.foreground.removeAll();
        this.hearts.forEach(function(child) {
            child.destroy();
        });
        this.hearts.removeAll();

        this.heartsCollected = 0;
        this.scoreText.text = this.scoreString + this.heartsCollected;
        this.getLevel();

        this.heartsTotal = 0;
        var layer = this.tileMap.layers[this.tileMap.getLayer(LEVEL_LAYER)];
        for (var tiley = 0; tiley < layer.data.length; ++tiley) {
            for (var tilex = 0; tilex < layer.data[tiley].length; ++ tilex) {
                var tile = this.tileMap.getTile(tilex, tiley, LEVEL_LAYER);
                if (tile != null) {
                    if (tile.index == COIN_INDEX) {
                        this.tileMap.removeTile(tilex, tiley, LEVEL_LAYER);
                        var x = tilex * TILEMAP_SCALE * this.tileMap.tileWidth;
                        var y = tiley * TILEMAP_SCALE * this.tileMap.tileHeight;
                        var heart = game.add.sprite(x + (4 * TILEMAP_SCALE), y + (4 * TILEMAP_SCALE), 'heart');
                        heart.smoothing = false;
                        this.hearts.add(heart);
                        this.heartsTotal += 1;
                    }
                    /*else if (tile.index == TABLE_LEFT_INDEX || 
                             tile.index == TABLE_MIDDLE_INDEX ||
                             tile.index == TABLE_RIGHT_INDEX) {
                        tile.setCollision(false, false, true, true);
                    }*/
                }
            }
        }

        // animate hearts spawning
        this.hearts.forEachAlive(function(e){
			e.isTaken = false;
			e.scale.setTo(0,0);
			e.anchor.setTo(0.5);
			game.add.tween(e.scale).to({x:TILEMAP_SCALE, y:TILEMAP_SCALE}, 200).start();
        }, this);
        
        this.labels.forEachAlive(function(l){
			l.label = game.add.text(l.x * TILEMAP_SCALE, l.y * TILEMAP_SCALE, l.text, { font: '22px Arial', fill: '#fff' });
			l.label.anchor.setTo(0.5, 0);
            l.label.x += 10;
		}, this);	
    },
    takeCoin: function(player, heart) {
		heart.body.enable = false;
		game.add.tween(heart.scale).to({x:0}, 150).start();
        game.add.tween(heart).to({y:50}, 150).start();
        this.heartSound.play();
        this.heartsCollected += 1;
        this.scoreText.text = this.scoreString + this.heartsCollected;
        if (this.heartsCollected == this.heartsTotal) {
            this.currentLevel += 1;
            this.loadLevel();
            this.spawnPlayer();
        }
    },

    setParticles: function() {
        this.dust = game.add.emitter(0, 0, 20);
        this.dust.makeParticles('dust');
        this.dust.setYSpeed(-10, 75);
        this.dust.setXSpeed(-100, 100);
        this.dust.gravity = 0;

        this.exp = game.add.emitter(0, 0, 20);
        this.exp.makeParticles('exp');
        this.exp.setYSpeed(-150, 150);
        this.exp.setXSpeed(-150, 150);
        this.exp.gravity = 0;
    },
    shakeEffect: function(g) {
        var move = 5;
        var time = 20;
        game.add.tween(g)
        .to({y:"-"+move}, time).to({y:"+"+move*2}, time*2).to({y:"-"+move}, time)
        .to({y:"-"+move}, time).to({y:"+"+move*2}, time*2).to({y:"-"+move}, time)
        .to({y:"-"+move/2}, time).to({y:"+"+move}, time*2).to({y:"-"+move/2}, time)
        .start();

        game.add.tween(g)
        .to({x:"-"+move}, time).to({x:"+"+move*2}, time*2).to({x:"-"+move}, time)
        .to({x:"-"+move}, time).to({x:"+"+move*2}, time*2).to({x:"-"+move}, time)
        .to({x:"-"+move/2}, time).to({x:"+"+move}, time*2).to({x:"-"+move/2}, time)
        .start();
    },
    addMobileInputs: function() {
		this.jumpButton = game.add.sprite(GAME_WIDTH - 100, GAME_HEIGHT - 100, 'jump');
		this.jumpButton.inputEnabled = true;
		this.jumpButton.events.onInputDown.add(this.jumpPlayer, this);
		this.jumpButton.alpha = 0.5;

		this.moveLeft = false;
		this.moveRight = false;

		this.leftButton = game.add.sprite(10, GAME_HEIGHT - 100, 'left');
		this.leftButton.inputEnabled = true;
		this.leftButton.events.onInputOver.add(function(){this.moveLeft=true;}, this);
		this.leftButton.events.onInputOut.add(function(){this.moveLeft=false;}, this);
		this.leftButton.events.onInputDown.add(function(){this.moveLeft=true;}, this);
		this.leftButton.events.onInputUp.add(function(){this.moveLeft=false;}, this);
		this.leftButton.alpha = 0.5;

		this.rightButton = game.add.sprite(110, GAME_HEIGHT - 100, 'right');
		this.rightButton.inputEnabled = true;
		this.rightButton.events.onInputOver.add(function(){this.moveRight=true;}, this);
		this.rightButton.events.onInputOut.add(function(){this.moveRight=false;}, this);
		this.rightButton.events.onInputDown.add(function(){this.moveRight=true;}, this);
		this.rightButton.events.onInputUp.add(function(){this.moveRight=false;}, this);
		this.rightButton.alpha = 0.5;
	},
    restart: function() {
        game.state.start('main');
    },
    render: function() {
        //game.debug.body(this.player);//, 32, 400);
    }
};

var game = new Phaser.Game(GAME_WIDTH, GAME_HEIGHT, Phaser.AUTO, 'ld29', null, false, false);
game.state.add('main', mainState);
game.state.add('Boot', Boot);
game.state.add('Load', Load);
game.state.start('Boot');
