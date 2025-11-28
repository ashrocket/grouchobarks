// Fratty Pipeline - A 90s Style Vertical Scroller
// Avoid frat houses and fratbros or get transformed!

class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
    this.spotifyPlayer = null;
  }

  setSpotifyPlayer(spotifyPlayer) {
    this.spotifyPlayer = spotifyPlayer;
  }

  create() {
    this.initializeGame();
    this.setupControls();
    this.setupEventHandlers();
  }

  initializeGame() {
    // Game dimensions - wider for better gameplay
    this.TILE = 32;
    this.COLS = 12;
    this.VIEW_W = this.COLS * this.TILE;  // 384px
    this.VIEW_H = 540;
    this.SCROLL_SPEED = 60;  // Slower for more relaxed gameplay

    // 90s Color Palette
    this.COLORS = {
      sky: 0x87CEEB,
      grass: 0x32CD32,
      path: 0xDEB887,
      sidewalk: 0xC0C0C0,
      fratHouse: 0x8B0000,
      fratRoof: 0x2F4F4F,
      greekLetters: 0xFFD700,
      skin: 0xFFDBAC,
      skinAlt1: 0xD2691E,
      skinAlt2: 0x8B4513,
      sororityHair: 0xFFD700,
      sororityTop: 0xFF69B4,
      sororitySkirt: 0xFFFFFF,
    };

    // Tile types
    this.TILES = { GRASS: 0, PATH: 1, SIDEWALK: 2, TREE: 4, BUSH: 5 };

    // Game state
    this.score = 0;
    this.transformationLevel = 0;
    this.isTransformed = false;
    this.gameOver = false;
    this.isPaused = false;

    // Character types
    this.characterTypes = [
      { name: 'Punk Rocker', hair: 0xFF1493, style: 'punk' },
      { name: 'Skater', hair: 0x00BFFF, style: 'skater' },
      { name: 'Goth', hair: 0x000000, style: 'goth' },
      { name: 'Raver', hair: 0x00FF00, style: 'raver' },
      { name: 'Grunge', hair: 0x8B4513, style: 'grunge' },
    ];
    this.currentCharacter = 0;
    this.skinTone = 0;

    // Row management
    this.VISIBLE_ROWS = Math.ceil(this.VIEW_H / this.TILE) + 4;
    this.rows = [];
    this.rowCounter = 0;

    // Spawning - less frequent for less crowded gameplay
    this.nextFratHouseIn = Math.floor(Math.random() * 40) + 35;
    this.activeFratHouse = null;
    this.fratbros = [];
    this.nextFratbroIn = Math.floor(Math.random() * 50) + 40;
    this.collectibles = [];
    this.nextCollectibleIn = Math.floor(Math.random() * 25) + 20;

    this.initRows();
    this.createPlayer();
    this.createUI();
    this.mobileControls = { left: false, right: false };
  }

  initRows() {
    this.rows = [];
    let y = -this.TILE;
    for (let i = 0; i < this.VISIBLE_ROWS; i++) {
      this.rows.push(this.makeRow(y));
      y += this.TILE;
    }
  }

  makeRow(y) {
    const g = this.add.graphics();
    const rowData = this.generateRowData();
    const row = { g, rowData, y: y };
    this.drawRow(g, rowData);
    g.setY(y);
    return row;
  }

  generateRowData() {
    this.rowCounter++;
    const row = new Array(this.COLS);
    for (let c = 0; c < this.COLS; c++) {
      if (c === 0 || c === this.COLS - 1) {
        row[c] = Math.random() < 0.1 ? this.TILES.TREE : this.TILES.GRASS;
      } else if (c === 1 || c === this.COLS - 2) {
        row[c] = Math.random() < 0.15 ? this.TILES.BUSH : this.TILES.SIDEWALK;
      } else {
        row[c] = this.TILES.PATH;
      }
    }
    return row;
  }

  drawRow(g, rowData) {
    g.clear();
    for (let c = 0; c < this.COLS; c++) {
      const x = c * this.TILE;
      const tile = rowData[c];
      switch(tile) {
        case this.TILES.GRASS: this.drawGrass(g, x, 0); break;
        case this.TILES.PATH: this.drawPath(g, x, 0); break;
        case this.TILES.SIDEWALK: this.drawSidewalk(g, x, 0); break;
        case this.TILES.TREE: this.drawGrass(g, x, 0); this.drawTree(g, x, 0); break;
        case this.TILES.BUSH: this.drawSidewalk(g, x, 0); this.drawBush(g, x, 0); break;
      }
    }
  }

  drawGrass(g, x, y) {
    g.fillStyle(this.COLORS.grass);
    g.fillRect(x, y, this.TILE, this.TILE);
    g.fillStyle(0x228B22);
    for (let i = 0; i < 3; i++) {
      const gx = x + 4 + (i * 10) + Math.floor(Math.random() * 4);
      const gy = y + 8 + Math.floor(Math.random() * 16);
      g.fillRect(gx, gy, 2, 4);
    }
  }

  drawPath(g, x, y) {
    g.fillStyle(this.COLORS.path);
    g.fillRect(x, y, this.TILE, this.TILE);
    g.fillStyle(0xC4A77D);
    g.fillRect(x + 5, y + 8, 3, 2);
    g.fillRect(x + 18, y + 20, 4, 2);
  }

  drawSidewalk(g, x, y) {
    g.fillStyle(this.COLORS.sidewalk);
    g.fillRect(x, y, this.TILE, this.TILE);
    g.fillStyle(0x808080);
    g.fillRect(x, y + 15, this.TILE, 1);
    g.fillRect(x + 12, y, 1, this.TILE);
  }

  drawTree(g, x, y) {
    g.fillStyle(0x8B4513);
    g.fillRect(x + 12, y + 16, 8, 16);
    g.fillStyle(0x228B22);
    g.fillRect(x + 4, y + 2, 24, 18);
    g.fillStyle(0x32CD32);
    g.fillRect(x + 8, y + 4, 16, 12);
  }

  drawBush(g, x, y) {
    g.fillStyle(0x228B22);
    g.fillRect(x + 4, y + 12, 24, 16);
    g.fillStyle(0x32CD32);
    g.fillRect(x + 8, y + 12, 12, 8);
    if (Math.random() < 0.3) {
      g.fillStyle(0xFF69B4);
      g.fillRect(x + 10, y + 14, 3, 3);
    }
  }

  createFratHouse(startRow) {
    const house = this.add.graphics();
    const side = Math.random() < 0.5 ? 'left' : 'right';
    const col = side === 'left' ? 0 : this.COLS - 3;
    this.drawFratHouse(house, side);
    const fratHouse = {
      graphics: house, side, col,
      y: startRow.y - (this.TILE * 4),
      height: this.TILE * 4, width: this.TILE * 3,
      suckRadius: this.TILE * 2.5, isActive: true,
    };
    house.setPosition(col * this.TILE, fratHouse.y);
    this.activeFratHouse = fratHouse;
    return fratHouse;
  }

  drawFratHouse(g, side) {
    const w = this.TILE * 3, h = this.TILE * 4;
    g.fillStyle(this.COLORS.fratHouse);
    g.fillRect(0, h * 0.3, w, h * 0.7);
    g.fillStyle(this.COLORS.fratRoof);
    g.fillRect(0, 0, w, h * 0.35);
    g.fillStyle(0xFFFF00);
    g.fillRect(w * 0.15, h * 0.4, 20, 20);
    g.fillRect(w * 0.6, h * 0.4, 20, 20);
    g.fillStyle(0x000000);
    g.fillRect(w * 0.15 + 9, h * 0.4, 2, 20);
    g.fillRect(w * 0.6 + 9, h * 0.4, 2, 20);
    const doorX = side === 'left' ? w - 25 : 5;
    g.fillStyle(0x000000);
    g.fillRect(doorX, h * 0.6, 20, h * 0.4);
    g.fillStyle(0x4a0000);
    g.fillRect(doorX + 2, h * 0.62, 16, h * 0.36);
    g.fillStyle(this.COLORS.greekLetters);
    this.drawGreekLetters(g, w * 0.25, h * 0.15);
  }

  drawGreekLetters(g, x, y) {
    const letters = { 'A': [[1,0],[0,1],[2,1],[0,2],[1,2],[2,2],[0,3],[2,3]], 'X': [[0,0],[2,0],[1,1],[0,2],[2,2],[0,3],[2,3]] };
    let offsetX = 0;
    for (const char of 'AXA') {
      const pattern = letters[char];
      if (pattern) for (const [px, py] of pattern) g.fillRect(x + offsetX + px * 3, y + py * 4, 3, 4);
      offsetX += 12;
    }
  }

  createFratbro(y) {
    const g = this.add.graphics();
    const col = 2 + Math.floor(Math.random() * (this.COLS - 4));
    this.drawFratbro(g);
    const fratbro = { graphics: g, col, x: col * this.TILE, y, direction: Math.random() < 0.5 ? -1 : 1, moveTimer: 0, suckRadius: this.TILE * 1.5 };
    g.setPosition(fratbro.x, fratbro.y);
    this.fratbros.push(fratbro);
    return fratbro;
  }

  drawFratbro(g) {
    const s = this.TILE;
    g.fillStyle(0xFF0000);
    g.fillRect(s * 0.2, s * 0.05, s * 0.6, s * 0.15);
    g.fillRect(s * 0.5, s * 0.15, s * 0.35, s * 0.08);
    g.fillStyle(this.COLORS.skin);
    g.fillRect(s * 0.25, s * 0.15, s * 0.5, s * 0.35);
    g.fillStyle(0x000000);
    g.fillRect(s * 0.28, s * 0.22, s * 0.18, s * 0.08);
    g.fillRect(s * 0.54, s * 0.22, s * 0.18, s * 0.08);
    g.fillStyle(0xFFB6C1);
    g.fillRect(s * 0.15, s * 0.5, s * 0.7, s * 0.3);
    g.fillStyle(0xF5DEB3);
    g.fillRect(s * 0.2, s * 0.78, s * 0.25, s * 0.15);
    g.fillRect(s * 0.55, s * 0.78, s * 0.25, s * 0.15);
    g.fillStyle(0x8B4513);
    g.fillRect(s * 0.15, s * 0.92, s * 0.3, s * 0.08);
    g.fillRect(s * 0.55, s * 0.92, s * 0.3, s * 0.08);
    g.fillStyle(0xFF0000);
    g.fillRect(s * 0.75, s * 0.55, s * 0.2, s * 0.25);
  }

  createPlayer() {
    this.player = this.add.graphics();
    this.playerCol = Math.floor(this.COLS / 2);
    this.playerX = this.playerCol * this.TILE + this.TILE / 2;
    this.playerY = this.VIEW_H * 0.75;
    this.drawPlayer();
    this.player.setPosition(this.playerX - this.TILE / 2, this.playerY - this.TILE / 2);
  }

  drawPlayer() {
    this.player.clear();
    if (this.isTransformed) this.drawSororityGirl(this.player);
    else this.drawPunkCharacter(this.player, this.characterTypes[this.currentCharacter]);
  }

  drawPunkCharacter(g, charType) {
    const s = this.TILE;
    const skinColors = [this.COLORS.skin, this.COLORS.skinAlt1, this.COLORS.skinAlt2];
    const skin = skinColors[this.skinTone];
    g.fillStyle(charType.hair);
    if (charType.style === 'punk') for (let i = 0; i < 5; i++) g.fillRect(s * (0.3 + i * 0.1), s * (0.05 - i * 0.01), s * 0.08, s * (0.15 + i * 0.02));
    else if (charType.style === 'skater') { g.fillRect(s * 0.2, s * 0.05, s * 0.6, s * 0.2); g.fillRect(s * 0.15, s * 0.15, s * 0.2, s * 0.15); }
    else if (charType.style === 'goth') { g.fillRect(s * 0.15, s * 0.05, s * 0.7, s * 0.25); g.fillRect(s * 0.1, s * 0.2, s * 0.2, s * 0.4); }
    else if (charType.style === 'raver') { g.fillRect(s * 0.25, s * 0.02, s * 0.1, s * 0.18); g.fillStyle(0xFF00FF); g.fillRect(s * 0.4, s * 0, s * 0.1, s * 0.2); }
    else { g.fillRect(s * 0.15, s * 0.05, s * 0.7, s * 0.2); g.fillRect(s * 0.1, s * 0.15, s * 0.8, s * 0.3); }
    g.fillStyle(skin);
    g.fillRect(s * 0.25, s * 0.18, s * 0.5, s * 0.32);
    g.fillStyle(0x000000);
    g.fillRect(s * 0.32, s * 0.26, s * 0.1, s * 0.08);
    g.fillRect(s * 0.58, s * 0.26, s * 0.1, s * 0.08);
    if (charType.style === 'punk' || charType.style === 'goth') g.fillStyle(0x000000);
    else if (charType.style === 'skater') g.fillStyle(0x4169E1);
    else if (charType.style === 'raver') g.fillStyle(0xFF00FF);
    else g.fillStyle(0x228B22);
    g.fillRect(s * 0.15, s * 0.5, s * 0.7, s * 0.28);
    g.fillStyle(skin);
    g.fillRect(s * 0.05, s * 0.52, s * 0.12, s * 0.25);
    g.fillRect(s * 0.83, s * 0.52, s * 0.12, s * 0.25);
    g.fillStyle(charType.style === 'raver' ? 0x00FF00 : 0x1a1a1a);
    g.fillRect(s * 0.2, s * 0.78, s * 0.25, s * 0.15);
    g.fillRect(s * 0.55, s * 0.78, s * 0.25, s * 0.15);
    g.fillStyle(charType.style === 'skater' ? 0xFFFFFF : 0x000000);
    g.fillRect(s * 0.15, s * 0.92, s * 0.3, s * 0.08);
    g.fillRect(s * 0.55, s * 0.92, s * 0.3, s * 0.08);
    if (charType.style === 'skater') { g.fillStyle(0x8B4513); g.fillRect(s * 0.1, s * 0.98, s * 0.8, s * 0.04); }
  }

  drawSororityGirl(g) {
    const s = this.TILE, skin = this.COLORS.skin;
    g.fillStyle(this.COLORS.sororityHair);
    g.fillRect(s * 0.2, s * 0.05, s * 0.6, s * 0.2);
    g.fillRect(s * 0.6, s * 0.02, s * 0.15, s * 0.35);
    g.fillStyle(skin);
    g.fillRect(s * 0.25, s * 0.18, s * 0.5, s * 0.32);
    g.fillStyle(0x000000);
    g.fillRect(s * 0.3, s * 0.26, s * 0.14, s * 0.1);
    g.fillRect(s * 0.56, s * 0.26, s * 0.14, s * 0.1);
    g.fillStyle(0xFFFFFF);
    g.fillRect(s * 0.32, s * 0.27, s * 0.04, s * 0.04);
    g.fillRect(s * 0.58, s * 0.27, s * 0.04, s * 0.04);
    g.fillStyle(0xFF69B4);
    g.fillRect(s * 0.38, s * 0.42, s * 0.24, s * 0.06);
    g.fillStyle(this.COLORS.sororityTop);
    g.fillRect(s * 0.2, s * 0.5, s * 0.6, s * 0.2);
    g.fillStyle(skin);
    g.fillRect(s * 0.08, s * 0.52, s * 0.14, s * 0.2);
    g.fillRect(s * 0.78, s * 0.52, s * 0.14, s * 0.2);
    g.fillStyle(this.COLORS.sororitySkirt);
    g.fillRect(s * 0.18, s * 0.68, s * 0.64, s * 0.2);
    g.fillStyle(skin);
    g.fillRect(s * 0.25, s * 0.86, s * 0.18, s * 0.08);
    g.fillRect(s * 0.57, s * 0.86, s * 0.18, s * 0.08);
    g.fillStyle(0xFFFFFF);
    g.fillRect(s * 0.2, s * 0.92, s * 0.25, s * 0.08);
    g.fillRect(s * 0.55, s * 0.92, s * 0.25, s * 0.08);
  }

  createCollectible(y) {
    const g = this.add.graphics();
    const col = 2 + Math.floor(Math.random() * (this.COLS - 4));
    const type = Math.random() < 0.5 ? 'coffee' : 'zine';
    this.drawCollectible(g, type);
    const collectible = { graphics: g, col, x: col * this.TILE, y, type };
    g.setPosition(collectible.x, collectible.y);
    this.collectibles.push(collectible);
    return collectible;
  }

  drawCollectible(g, type) {
    const s = this.TILE;
    if (type === 'coffee') {
      g.fillStyle(0x8B4513);
      g.fillRect(s * 0.3, s * 0.2, s * 0.4, s * 0.6);
      g.fillStyle(0xFFFFFF);
      g.fillRect(s * 0.32, s * 0.22, s * 0.36, s * 0.1);
      g.fillRect(s * 0.4, s * 0.1, s * 0.04, s * 0.1);
    } else {
      g.fillStyle(0xFF1493);
      g.fillRect(s * 0.2, s * 0.15, s * 0.6, s * 0.7);
      g.fillStyle(0x000000);
      g.fillRect(s * 0.25, s * 0.2, s * 0.5, s * 0.2);
      g.fillStyle(0xFFFFFF);
      g.fillRect(s * 0.28, s * 0.45, s * 0.44, s * 0.08);
      g.fillRect(s * 0.28, s * 0.58, s * 0.44, s * 0.08);
    }
  }

  createUI() {
    this.transformMeterBg = this.add.graphics();
    this.transformMeterBg.fillStyle(0x000000);
    this.transformMeterBg.fillRect(10, 10, 100, 16);
    this.transformMeterBg.setScrollFactor(0).setDepth(100);
    this.transformMeter = this.add.graphics();
    this.transformMeter.setScrollFactor(0).setDepth(101);
    this.scoreText = this.add.text(this.VIEW_W - 10, 10, 'Score: 0', { fontSize: '14px', fontFamily: 'Arial', color: '#FFFFFF', stroke: '#000000', strokeThickness: 2 });
    this.scoreText.setOrigin(1, 0).setScrollFactor(0).setDepth(100);
    this.charText = this.add.text(10, 30, this.characterTypes[this.currentCharacter].name, { fontSize: '10px', fontFamily: 'Arial', color: '#FFFFFF', stroke: '#000000', strokeThickness: 1 });
    this.charText.setScrollFactor(0).setDepth(100);
    this.updateTransformMeter();
  }

  updateTransformMeter() {
    this.transformMeter.clear();
    const r = Math.floor((this.transformationLevel / 100) * 255);
    const g = Math.floor((1 - this.transformationLevel / 100) * 255);
    const color = (r << 16) | (g << 8) | 0;
    this.transformMeter.fillStyle(color);
    this.transformMeter.fillRect(12, 12, (this.transformationLevel / 100) * 96, 12);
  }

  setupControls() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.aKey = this.input.keyboard.addKey('A');
    this.dKey = this.input.keyboard.addKey('D');
    this.spaceKey = this.input.keyboard.addKey('SPACE');
    this.cKey = this.input.keyboard.addKey('C');
    this.sKey = this.input.keyboard.addKey('S');
    this.lastKeys = { left: false, right: false };
  }

  setupEventHandlers() {
    this.events.on('player-move', () => {
      if (this.spotifyPlayer) this.spotifyPlayer.adjustVolumeForGameEvent('player_move', 0.5);
    });
  }

  update(time, delta) {
    if (this.gameOver || this.isPaused) return;
    if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) { this.togglePause(); return; }
    if (Phaser.Input.Keyboard.JustDown(this.cKey)) this.cycleCharacter();
    if (Phaser.Input.Keyboard.JustDown(this.sKey)) this.cycleSkinTone();
    const dy = this.SCROLL_SPEED * (delta / 1000);
    this.scrollWorld(dy);
    this.handleMovement();
    this.updateFratHouse(delta);
    this.updateFratbros(delta);
    this.updateCollectibles();
    this.handleSpawning();
    this.score += delta * 0.01;
    this.scoreText.setText('Score: ' + Math.floor(this.score));
    if (this.transformationLevel > 0) {
      this.transformationLevel = Math.max(0, this.transformationLevel - delta * 0.005);
      this.updateTransformMeter();
    }
  }

  scrollWorld(dy) {
    for (const row of this.rows) { row.y += dy; row.g.setY(Math.round(row.y)); }
    const bottomLimit = this.VIEW_H + this.TILE * 2;
    let topY = Math.min(...this.rows.map(r => r.y));
    for (const row of this.rows) {
      if (row.y >= bottomLimit) {
        row.y = topY - this.TILE;
        row.rowData = this.generateRowData();
        this.drawRow(row.g, row.rowData);
        row.g.setY(Math.round(row.y));
        topY = row.y;
      }
    }
    if (this.activeFratHouse) {
      this.activeFratHouse.y += dy;
      this.activeFratHouse.graphics.setY(Math.round(this.activeFratHouse.y));
      if (this.activeFratHouse.y > this.VIEW_H + this.TILE * 4) {
        this.activeFratHouse.graphics.destroy();
        this.activeFratHouse = null;
      }
    }
    for (const bro of this.fratbros) { bro.y += dy; bro.graphics.setY(Math.round(bro.y)); }
    this.fratbros = this.fratbros.filter(bro => { if (bro.y > this.VIEW_H + this.TILE) { bro.graphics.destroy(); return false; } return true; });
    for (const c of this.collectibles) { c.y += dy; c.graphics.setY(Math.round(c.y)); }
    this.collectibles = this.collectibles.filter(c => { if (c.y > this.VIEW_H + this.TILE) { c.graphics.destroy(); return false; } return true; });
  }

  handleMovement() {
    const leftPressed = this.cursors.left.isDown || this.aKey.isDown || this.mobileControls.left;
    const rightPressed = this.cursors.right.isDown || this.dKey.isDown || this.mobileControls.right;
    const leftJust = leftPressed && !this.lastKeys.left;
    const rightJust = rightPressed && !this.lastKeys.right;
    this.lastKeys.left = leftPressed;
    this.lastKeys.right = rightPressed;
    if (leftJust && this.playerCol > 1) {
      this.playerCol--;
      this.playerX = this.playerCol * this.TILE + this.TILE / 2;
      this.player.setX(this.playerX - this.TILE / 2);
      this.events.emit('player-move');
    } else if (rightJust && this.playerCol < this.COLS - 2) {
      this.playerCol++;
      this.playerX = this.playerCol * this.TILE + this.TILE / 2;
      this.player.setX(this.playerX - this.TILE / 2);
      this.events.emit('player-move');
    }
  }

  updateFratHouse(delta) {
    if (!this.activeFratHouse) return;
    const house = this.activeFratHouse;
    const doorX = house.side === 'left' ? (house.col + 2.5) * this.TILE : house.col * this.TILE + this.TILE * 0.5;
    const doorY = house.y + house.height * 0.7;
    const dx = this.playerX - doorX, dy = this.playerY - doorY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < house.suckRadius) {
      const intensity = 1 - (dist / house.suckRadius);
      this.transformationLevel = Math.min(100, this.transformationLevel + intensity * delta * 0.05);
      this.updateTransformMeter();
      const pullStrength = intensity * 0.3;
      this.playerX += (doorX - this.playerX) * pullStrength * (delta / 16);
      this.playerY += (doorY - this.playerY) * pullStrength * (delta / 16);
      this.player.setPosition(this.playerX - this.TILE / 2, this.playerY - this.TILE / 2);
      if (this.transformationLevel >= 100) this.triggerTransformation();
    }
  }

  updateFratbros(delta) {
    for (const bro of this.fratbros) {
      bro.moveTimer += delta;
      if (bro.moveTimer > 500) {
        bro.moveTimer = 0;
        if (Math.random() < 0.3) bro.direction *= -1;
        const newCol = bro.col + bro.direction;
        if (newCol >= 2 && newCol <= this.COLS - 3) { bro.col = newCol; bro.x = bro.col * this.TILE; bro.graphics.setX(bro.x); }
      }
      const dx = this.playerX - (bro.x + this.TILE / 2), dy = this.playerY - (bro.y + this.TILE / 2);
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < bro.suckRadius) {
        const intensity = 1 - (dist / bro.suckRadius);
        this.transformationLevel = Math.min(100, this.transformationLevel + intensity * delta * 0.03);
        this.updateTransformMeter();
        if (this.transformationLevel >= 100) this.triggerTransformation();
      }
    }
  }

  updateCollectibles() {
    for (let i = this.collectibles.length - 1; i >= 0; i--) {
      const c = this.collectibles[i];
      const dx = this.playerX - (c.x + this.TILE / 2), dy = this.playerY - (c.y + this.TILE / 2);
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < this.TILE * 0.8) {
        if (c.type === 'coffee') { this.transformationLevel = Math.max(0, this.transformationLevel - 25); this.score += 100; }
        else { this.transformationLevel = Math.max(0, this.transformationLevel - 40); this.score += 200; }
        this.updateTransformMeter();
        c.graphics.destroy();
        this.collectibles.splice(i, 1);
      }
    }
  }

  handleSpawning() {
    this.nextFratHouseIn--;
    if (this.nextFratHouseIn <= 0 && !this.activeFratHouse) {
      const topRow = this.rows.reduce((a, b) => a.y < b.y ? a : b);
      this.createFratHouse(topRow);
      this.nextFratHouseIn = Math.floor(Math.random() * 50) + 45;
    }
    this.nextFratbroIn--;
    if (this.nextFratbroIn <= 0) {
      const topRow = this.rows.reduce((a, b) => a.y < b.y ? a : b);
      this.createFratbro(topRow.y - this.TILE);
      this.nextFratbroIn = Math.floor(Math.random() * 60) + 50;
    }
    this.nextCollectibleIn--;
    if (this.nextCollectibleIn <= 0) {
      const topRow = this.rows.reduce((a, b) => a.y < b.y ? a : b);
      this.createCollectible(topRow.y - this.TILE);
      this.nextCollectibleIn = Math.floor(Math.random() * 35) + 25;
    }
  }

  triggerTransformation() {
    if (this.isTransformed) return;
    this.isTransformed = true;
    this.drawPlayer();
    this.charText.setText('Sorority Girl (transformed!)');
    if (window.spotifyPlayer) window.pauseTrack();
    this.time.delayedCall(3000, () => { this.transformationLevel = 50; this.updateTransformMeter(); });
  }

  cycleCharacter() {
    if (this.isTransformed) return;
    this.currentCharacter = (this.currentCharacter + 1) % this.characterTypes.length;
    this.drawPlayer();
    this.charText.setText(this.characterTypes[this.currentCharacter].name);
  }

  cycleSkinTone() {
    if (this.isTransformed) return;
    this.skinTone = (this.skinTone + 1) % 3;
    this.drawPlayer();
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    if (this.isPaused && window.spotifyPlayer) window.pauseTrack();
    else if (!this.isPaused && window.spotifyPlayer) window.resumeTrack();
  }
}

const GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  width: 384,
  height: 540,
  backgroundColor: 0x87CEEB,
  physics: { default: 'arcade' },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  render: { pixelArt: true, antialias: false, roundPixels: true },
  scene: GameScene
};
