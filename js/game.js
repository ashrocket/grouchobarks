// Enhanced Phaser Game with Spotify Integration Events
class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
    this.spotifyPlayer = null;
    this.lastMovementTime = 0;
    this.movementIntensity = 0;
  }

  setSpotifyPlayer(spotifyPlayer) {
    this.spotifyPlayer = spotifyPlayer;
  }

  create() {
    this.initializeGame();
    this.setupEventHandlers();
  }

  initializeGame() {
    this.TILE = 48;
    this.COLS = 11;
    this.VIEW_W = this.COLS * this.TILE;
    this.VIEW_H = 800;
    this.SCROLL_SPEED = 120;

    this.COLOR_BG = 0x363e48;
    this.COLOR_GRID = 0x2b2b32;
    this.COLOR_PATH = 0xd2c1a5;
    this.COLOR_HEDGE = 0x19b23b;
    this.COLOR_LIGHT = 0xd6e482;
    this.COLOR_GRASS = 0x5be37d;

    this.TILE_PATH = 0;
    this.TILE_HEDGE = 1;
    this.TILE_LIGHT = 2;
    this.TILE_GRASS = 3;

    this.VISIBLE_ROWS = Math.ceil(this.VIEW_H / this.TILE) + 6;

    this.leftLightCounter = 0;
    this.rightLightCounter = 0;
    this.leftLightSpacing = Math.floor(Math.random() * 12) + 6;
    this.rightLightSpacing = Math.floor(Math.random() * 12) + 6;
    this.rows = [];

    this.initRows();

    const startCol = Math.floor(this.COLS / 2);
    this.player = this.add.text((startCol + 0.5) * this.TILE, this.VIEW_H * 0.65, '👗', {
      fontSize: (this.TILE * 0.85) + 'px'
    }).setOrigin(0.5);

    this.player.currentCol = startCol;
    this.player.lastKeys = {
      left: false, right: false, up: false, down: false
    };

    this.cursors = this.input.keyboard.createCursorKeys();
    this.aKey = this.input.keyboard.addKey('A');
    this.dKey = this.input.keyboard.addKey('D');
    this.wKey = this.input.keyboard.addKey('W');
    this.sKey = this.input.keyboard.addKey('S');
  }

  setupEventHandlers() {
    this.events.on('player-move', (direction, intensity) => {
      if (this.spotifyPlayer) {
        this.spotifyPlayer.adjustVolumeForGameEvent('player_move', intensity);
      }
    });

    this.events.on('item-collect', () => {
      if (this.spotifyPlayer) {
        this.spotifyPlayer.adjustVolumeForGameEvent('item_collect');
      }
    });
  }

  update(time, delta) {
    const dy = this.SCROLL_SPEED * (delta / 1000);
    for (const r of this.rows) r.y = r.y + dy;
    this.recycleRowsIfNeeded();
    this.handlePlayerMovement(time);
  }

  initRows() {
    this.rows = [];
    let y = -1;
    for (let i = 0; i < this.VISIBLE_ROWS; i++) {
      this.rows.push(this.makeRow(y));
      y += this.TILE;
    }
  }

  makeRow(y) {
    const g = this.add.graphics();
    const rowData = this.generateRow();
    this.drawRowGraphics(g, rowData);
    const r = { g, rowData, _y: 0 };
    Object.defineProperty(r, 'y', {
      get(){ return this._y; },
      set(v){
        this._y = Math.round(v);
        g.setY(this._y);
      }
    });
    r.y = y;
    return r;
  }

  generateRow() {
    const row = new Array(this.COLS);

    this.leftLightCounter++;
    if (this.leftLightCounter >= this.leftLightSpacing) {
      row[0] = this.TILE_LIGHT;
      this.leftLightCounter = 0;
      this.leftLightSpacing = Math.floor(Math.random() * 12) + 6;
    } else {
      row[0] = this.TILE_HEDGE;
    }

    this.rightLightCounter++;
    if (this.rightLightCounter >= this.rightLightSpacing) {
      row[this.COLS - 1] = this.TILE_LIGHT;
      this.rightLightCounter = 0;
      this.rightLightSpacing = Math.floor(Math.random() * 12) + 6;
    } else {
      row[this.COLS - 1] = this.TILE_HEDGE;
    }

    for (let c = 1; c < this.COLS - 1; c++) {
      if (c >= 4 && c <= 6) {
        row[c] = this.TILE_GRASS;
      } else {
        row[c] = this.TILE_PATH;
      }
    }

    return row;
  }

  drawRowGraphics(g, rowData) {
    g.clear();
    for (let c = 0; c < this.COLS; c++) {
      const x = c * this.TILE;
      const tileType = rowData[c];

      let fillColor;
      switch (tileType) {
        case this.TILE_HEDGE:
          fillColor = this.COLOR_HEDGE;
          break;
        case this.TILE_LIGHT:
          fillColor = this.COLOR_LIGHT;
          break;
        case this.TILE_GRASS:
          fillColor = this.COLOR_GRASS;
          break;
        case this.TILE_PATH:
        default:
          fillColor = this.COLOR_PATH;
          break;
      }
      
      g.fillStyle(fillColor).fillRect(x, 0, this.TILE, this.TILE + 1);
      g.lineStyle(1, this.COLOR_GRID, 0.35).strokeRect(x, 0, this.TILE, this.TILE + 1);
    }
  }

  recycleRowsIfNeeded() {
    const bottomLimit = this.VIEW_H + this.TILE * 2;
    let topY = this.rows[0].y;
    for (let i = 1; i < this.rows.length; i++) if (this.rows[i].y < topY) topY = this.rows[i].y;

    for (const r of this.rows) {
      if (r.y >= bottomLimit) {
        r.y = topY - this.TILE;
        r.rowData = this.generateRow();
        this.drawRowGraphics(r.g, r.rowData);
        topY = r.y;
      }
    }
  }

  handlePlayerMovement(time) {
    const leftPressed = this.cursors.left.isDown || this.aKey.isDown;
    const rightPressed = this.cursors.right.isDown || this.dKey.isDown;
    const upPressed = this.cursors.up.isDown || this.wKey.isDown;
    const downPressed = this.cursors.down.isDown || this.sKey.isDown;

    const leftJustPressed = leftPressed && !this.player.lastKeys.left;
    const rightJustPressed = rightPressed && !this.player.lastKeys.right;
    const upJustPressed = upPressed && !this.player.lastKeys.up;
    const downJustPressed = downPressed && !this.player.lastKeys.down;

    this.player.lastKeys.left = leftPressed;
    this.player.lastKeys.right = rightPressed;
    this.player.lastKeys.up = upPressed;
    this.player.lastKeys.down = downPressed;

    let hasMoved = false;
    let movementDirection = '';

    if (leftJustPressed || rightJustPressed) {
      if (leftJustPressed && this.player.currentCol > 0) {
        this.player.currentCol--;
        this.player.x = Math.round((this.player.currentCol + 0.5) * this.TILE);
        movementDirection = 'left';
        hasMoved = true;
      } else if (rightJustPressed && this.player.currentCol < this.COLS - 1) {
        this.player.currentCol++;
        this.player.x = Math.round((this.player.currentCol + 0.5) * this.TILE);
        movementDirection = 'right';
        hasMoved = true;
      }
    } else if (upJustPressed || downJustPressed) {
      if (upJustPressed) {
        const newY = this.player.y - this.TILE;
        if (newY >= this.TILE) {
          this.player.y = Math.round(newY);
          movementDirection = 'up';
          hasMoved = true;
        }
      } else if (downJustPressed) {
        const newY = this.player.y + this.TILE;
        if (newY <= this.VIEW_H - this.TILE) {
          this.player.y = Math.round(newY);
          movementDirection = 'down';
          hasMoved = true;
        }
      }
    }

    if (hasMoved) {
      const timeDiff = time - this.lastMovementTime;
      this.movementIntensity = Math.min(1.0, 500 / timeDiff);
      this.lastMovementTime = time;
      
      this.events.emit('player-move', movementDirection, this.movementIntensity);
      this.checkItemCollection();
    }
  }

  checkItemCollection() {
    const playerRow = Math.floor(this.player.y / this.TILE);
    const playerCol = this.player.currentCol;

    // Don't check collection if player is out of bounds
    if (playerCol < 0 || playerCol >= this.COLS) {
      return;
    }

    for (const row of this.rows) {
      const rowIndex = Math.floor((row.y + this.TILE / 2) / this.TILE);
      if (rowIndex === playerRow) {
        if (row.rowData[playerCol] === this.TILE_LIGHT) {
          row.rowData[playerCol] = this.TILE_PATH;
          this.drawRowGraphics(row.g, row.rowData);
          this.events.emit('item-collect');
          this.cameras.main.flash(100, 255, 255, 150, false, 0.1);
        }
        break;
      }
    }
  }
}

const GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  width: 11 * 48,
  height: 800,
  backgroundColor: 0x363e48,
  physics: { default: 'arcade' },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  render: { pixelArt: true, antialias: false, roundPixels: true },
  scene: GameScene
};