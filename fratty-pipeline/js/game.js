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
    this.gameOver = false;
    this.isPaused = false;

    // Head collection system - collect 5 to trigger effect
    this.punkHeads = 0;  // Collect from shops/items
    this.fratHeads = 0;  // Get from being near frat houses/fratbros
    this.MAX_HEADS = 5;

    // Transformation state
    this.isTransformed = false;  // Turned into sorority girl
    this.transformationCount = 0;  // Total times transformed (2 = game over)

    // Joint power-up (from getting 5 punk heads)
    this.hasJoint = false;
    this.jointTimer = 0;  // 10 seconds of invincibility
    this.JOINT_DURATION = 10000;  // 10 seconds in ms

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

    // University frat houses - the frat row!
    this.universities = {
      'USC': ['Alpha Epsilon Pi', 'Alpha Tau Omega', 'Beta Theta Pi', 'Delta Chi', 'Delta Tau Delta', 'Kappa Alpha Order', 'Kappa Sigma', 'Lambda Chi Alpha', 'Phi Delta Theta', 'Phi Kappa Psi', 'Pi Kappa Alpha', 'Sigma Alpha Epsilon', 'Sigma Chi', 'Sigma Nu', 'Sigma Phi Epsilon', 'Theta Chi', 'Zeta Beta Tau'],
      'UCLA': ['Alpha Epsilon Pi', 'Beta Theta Pi', 'Delta Tau Delta', 'Lambda Chi Alpha', 'Phi Delta Theta', 'Phi Gamma Delta', 'Phi Kappa Psi', 'Pi Kappa Phi', 'Sigma Alpha Epsilon', 'Sigma Chi', 'Sigma Nu', 'Sigma Phi Epsilon', 'Theta Chi', 'Theta Delta Chi', 'Zeta Beta Tau', 'Zeta Psi'],
      'UC Berkeley': ['Alpha Delta Phi', 'Alpha Epsilon Pi', 'Alpha Tau Omega', 'Beta Theta Pi', 'Chi Phi', 'Chi Psi', 'Delta Chi', 'Delta Kappa Epsilon', 'Delta Tau Delta', 'Delta Upsilon', 'Kappa Alpha Order', 'Kappa Sigma', 'Lambda Chi Alpha', 'Phi Delta Theta', 'Phi Gamma Delta', 'Phi Kappa Psi', 'Phi Kappa Sigma', 'Pi Kappa Alpha', 'Pi Kappa Phi', 'Psi Upsilon', 'Sigma Alpha Epsilon', 'Sigma Alpha Mu', 'Sigma Chi', 'Sigma Nu', 'Sigma Phi', 'Sigma Phi Epsilon', 'Tau Kappa Epsilon', 'Theta Chi', 'Theta Delta Chi', 'Theta Xi', 'Zeta Beta Tau', 'Zeta Psi'],
      'University of Texas': ['Acacia', 'Alpha Epsilon Pi', 'Alpha Tau Omega', 'Beta Theta Pi', 'Delta Chi', 'Delta Kappa Epsilon', 'Delta Sigma Phi', 'Delta Tau Delta', 'Delta Upsilon', 'Kappa Alpha Order', 'Kappa Sigma', 'Lambda Chi Alpha', 'Phi Delta Theta', 'Phi Gamma Delta', 'Phi Kappa Psi', 'Phi Kappa Sigma', 'Pi Kappa Alpha', 'Pi Kappa Phi', 'Sigma Alpha Epsilon', 'Sigma Chi', 'Sigma Nu', 'Sigma Phi Epsilon', 'Tau Kappa Epsilon', 'Theta Chi', 'Zeta Beta Tau'],
      'University of Michigan': ['Acacia', 'Alpha Delta Phi', 'Alpha Epsilon Pi', 'Alpha Sigma Phi', 'Alpha Tau Omega', 'Beta Theta Pi', 'Chi Phi', 'Chi Psi', 'Delta Chi', 'Delta Kappa Epsilon', 'Delta Sigma Phi', 'Delta Tau Delta', 'Delta Upsilon', 'Evans Scholars', 'Kappa Sigma', 'Lambda Chi Alpha', 'Phi Delta Theta', 'Phi Gamma Delta', 'Phi Kappa Psi', 'Phi Kappa Sigma', 'Phi Kappa Tau', 'Phi Sigma Kappa', 'Pi Kappa Alpha', 'Pi Kappa Phi', 'Psi Upsilon', 'Sigma Alpha Epsilon', 'Sigma Alpha Mu', 'Sigma Chi', 'Sigma Nu', 'Sigma Phi', 'Sigma Phi Epsilon', 'Tau Kappa Epsilon', 'Theta Chi', 'Theta Delta Chi', 'Theta Xi', 'Triangle', 'Zeta Beta Tau', 'Zeta Psi'],
    };
    this.selectedUniversity = 'USC';  // Default
    this.fratRowHouses = [];  // All frat houses in the row
    this.burnedHouses = new Set();  // Houses that have been burned (by ID)

    // Spawning - very relaxed for easy early game
    this.nextFratHouseIn = Math.floor(Math.random() * 100) + 120;  // First frat house after ~2-4 seconds
    this.activeFratHouse = null;
    this.fratbros = [];
    this.nextFratbroIn = Math.floor(Math.random() * 150) + 180;  // First fratbro after ~3-5 seconds
    this.collectibles = [];
    this.trashcans = [];  // Trashcans in front of frat houses

    // Coffee shops - friendly buildings that give coffee (spawn VERY early!)
    this.coffeeShops = [];
    this.nextCoffeeShopIn = 10;  // First coffee shop almost immediately!

    // Record stores - friendly buildings that give vinyl records
    this.recordStores = [];
    this.nextRecordStoreIn = 30;  // First record store soon

    // Skate shops - friendly buildings that give skateboards
    this.skateShops = [];
    this.nextSkateShopIn = 50;  // First skate shop

    // Zines spawn randomly on the street (less frequent now)
    this.nextZineIn = Math.floor(Math.random() * 150) + 120;

    this.initRows();
    this.createPlayer();
    this.createUI();
    this.mobileControls = { left: false, right: false, up: false, down: false };
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
    // Get frat house name from the university's list
    const fratNames = this.universities[this.selectedUniversity];
    const houseIndex = this.fratRowHouses.length % fratNames.length;
    const houseName = fratNames[houseIndex];
    const houseId = `${houseName}_${houseIndex}`;

    // Check if this house has been burned
    const isBurned = this.burnedHouses.has(houseId);

    const house = this.add.graphics();
    const side = Math.random() < 0.5 ? 'left' : 'right';
    const col = side === 'left' ? 0 : this.COLS - 3;

    if (isBurned) {
      this.drawBurnedFratHouse(house, side);
    } else {
      this.drawFratHouse(house, side);
    }

    const fratHouse = {
      graphics: house, side, col,
      y: startRow.y - (this.TILE * 4),
      height: this.TILE * 4, width: this.TILE * 3,
      suckRadius: isBurned ? 0 : this.TILE * 2.5,  // Burned houses can't suck you in
      isActive: !isBurned,
      isBurned: isBurned,
      name: houseName,
      id: houseId,
    };
    house.setPosition(col * this.TILE, fratHouse.y);

    // Create trashcan in front of the house (only if not burned)
    if (!isBurned) {
      this.createTrashcan(fratHouse);
    }

    // Add name label
    const labelX = col * this.TILE + this.TILE * 1.5;
    const labelY = fratHouse.y - 10;
    const label = this.add.text(labelX, labelY, this.getGreekAbbrev(houseName), {
      fontSize: '10px', fontFamily: 'Arial', color: isBurned ? '#666666' : '#FFD700',
      stroke: '#000000', strokeThickness: 2
    });
    label.setOrigin(0.5, 1);
    fratHouse.label = label;

    this.activeFratHouse = fratHouse;
    this.fratRowHouses.push(fratHouse);
    return fratHouse;
  }

  getGreekAbbrev(name) {
    // Convert frat name to Greek letter abbreviation
    const abbrevs = {
      'Alpha': 'A', 'Beta': 'B', 'Gamma': 'Γ', 'Delta': 'Δ', 'Epsilon': 'E',
      'Zeta': 'Z', 'Eta': 'H', 'Theta': 'Θ', 'Iota': 'I', 'Kappa': 'K',
      'Lambda': 'Λ', 'Mu': 'M', 'Nu': 'N', 'Xi': 'Ξ', 'Omicron': 'O',
      'Pi': 'Π', 'Rho': 'P', 'Sigma': 'Σ', 'Tau': 'T', 'Upsilon': 'Y',
      'Phi': 'Φ', 'Chi': 'X', 'Psi': 'Ψ', 'Omega': 'Ω', 'Order': ''
    };
    return name.split(' ').map(w => abbrevs[w] || w[0]).join('');
  }

  createTrashcan(fratHouse) {
    const g = this.add.graphics();
    this.drawTrashcan(g);
    const trashcan = {
      graphics: g,
      x: fratHouse.side === 'left' ? (fratHouse.col + 3) * this.TILE : (fratHouse.col - 1) * this.TILE,
      y: fratHouse.y + fratHouse.height - this.TILE,
      fratHouse: fratHouse,
    };
    g.setPosition(trashcan.x, trashcan.y);
    this.trashcans.push(trashcan);
    return trashcan;
  }

  drawTrashcan(g) {
    const s = this.TILE;
    // Bright green trashcan - easy to spot!
    g.fillStyle(0x00AA00);
    g.fillRect(s * 0.15, s * 0.2, s * 0.7, s * 0.75);
    g.fillStyle(0x008800);
    g.fillRect(s * 0.2, s * 0.25, s * 0.6, s * 0.65);
    // Lid
    g.fillStyle(0x00CC00);
    g.fillRect(s * 0.1, s * 0.08, s * 0.8, s * 0.15);
    // Fire symbol on the can
    g.fillStyle(0xFF4500);
    g.fillRect(s * 0.4, s * 0.45, s * 0.2, s * 0.3);
    g.fillRect(s * 0.35, s * 0.55, s * 0.3, s * 0.15);
  }

  drawBurnedFratHouse(g, side) {
    const w = this.TILE * 3, h = this.TILE * 4;
    // Charred remains
    g.fillStyle(0x1a1a1a);
    g.fillRect(0, h * 0.5, w, h * 0.5);
    g.fillStyle(0x2d2d2d);
    g.fillRect(0, h * 0.3, w, h * 0.25);
    // Smoke wisps
    g.fillStyle(0x404040);
    g.fillRect(w * 0.2, h * 0.1, 4, 20);
    g.fillRect(w * 0.5, h * 0.05, 4, 25);
    g.fillRect(w * 0.7, h * 0.15, 4, 15);
    // Broken window frames
    g.fillStyle(0x000000);
    g.fillRect(w * 0.15, h * 0.55, 15, 15);
    g.fillRect(w * 0.6, h * 0.55, 15, 15);
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

  createCoffeeShop(startRow) {
    const house = this.add.graphics();
    // Spawn on opposite side from last frat house if possible
    let side = Math.random() < 0.5 ? 'left' : 'right';
    if (this.activeFratHouse) {
      side = this.activeFratHouse.side === 'left' ? 'right' : 'left';
    }
    const col = side === 'left' ? 0 : this.COLS - 3;
    this.drawCoffeeShop(house, side);
    const coffeeShop = {
      graphics: house, side, col,
      y: startRow.y - (this.TILE * 3),
      height: this.TILE * 3, width: this.TILE * 3,
      coffeeSpawnTimer: 0,
      hasCoffeeReady: true,  // Can spawn a coffee
    };
    house.setPosition(col * this.TILE, coffeeShop.y);
    house.setDepth(10);  // Make sure it's visible
    this.coffeeShops.push(coffeeShop);
    return coffeeShop;
  }

  drawCoffeeShop(g, side) {
    const w = this.TILE * 3, h = this.TILE * 3;
    // Building base - warm brown color
    g.fillStyle(0x8B4513);
    g.fillRect(0, h * 0.2, w, h * 0.8);
    // Roof - dark green awning
    g.fillStyle(0x006400);
    g.fillRect(0, 0, w, h * 0.25);
    // Striped awning detail
    g.fillStyle(0x228B22);
    for (let i = 0; i < 6; i++) {
      g.fillRect(i * (w / 6), h * 0.1, w / 12, h * 0.15);
    }
    // Window
    g.fillStyle(0xFFFF00);
    g.fillRect(w * 0.15, h * 0.35, 25, 20);
    g.fillStyle(0x000000);
    g.fillRect(w * 0.15 + 11, h * 0.35, 2, 20);
    // Door on the inner side
    const doorX = side === 'left' ? w - 22 : 2;
    g.fillStyle(0x000000);
    g.fillRect(doorX, h * 0.5, 20, h * 0.5);
    g.fillStyle(0x654321);
    g.fillRect(doorX + 2, h * 0.52, 16, h * 0.46);
    // Coffee cup sign
    g.fillStyle(0xFFFFFF);
    g.fillRect(w * 0.55, h * 0.35, 18, 22);
    g.fillStyle(0x8B4513);
    g.fillRect(w * 0.55 + 4, h * 0.35 + 6, 10, 14);
    // Steam from cup
    g.fillStyle(0xC0C0C0);
    g.fillRect(w * 0.55 + 6, h * 0.35 - 4, 2, 4);
    g.fillRect(w * 0.55 + 10, h * 0.35 - 6, 2, 6);
  }

  spawnCoffeeAtShop(shop) {
    // Spawn coffee in front of the shop (on the walkable path)
    const g = this.add.graphics();
    const col = shop.side === 'left' ? 3 : this.COLS - 4;
    this.drawCollectible(g, 'coffee');
    const coffee = { graphics: g, col, x: col * this.TILE, y: shop.y + this.TILE * 1.5, type: 'coffee' };
    g.setPosition(coffee.x, coffee.y);
    this.collectibles.push(coffee);
  }

  createRecordStore(startRow) {
    const store = this.add.graphics();
    // Spawn on opposite side from last frat house if possible
    let side = Math.random() < 0.5 ? 'left' : 'right';
    if (this.activeFratHouse) {
      side = this.activeFratHouse.side === 'left' ? 'right' : 'left';
    }
    const col = side === 'left' ? 0 : this.COLS - 3;
    this.drawRecordStore(store, side);
    const recordStore = {
      graphics: store, side, col,
      y: startRow.y - (this.TILE * 3),
      height: this.TILE * 3, width: this.TILE * 3,
      hasVinylReady: true,  // Can spawn a vinyl record
    };
    store.setPosition(col * this.TILE, recordStore.y);
    store.setDepth(10);  // Make sure it's visible
    this.recordStores.push(recordStore);
    return recordStore;
  }

  drawRecordStore(g, side) {
    const w = this.TILE * 3, h = this.TILE * 3;
    // Building base - purple/black for that indie vibe
    g.fillStyle(0x2D1B4E);
    g.fillRect(0, h * 0.2, w, h * 0.8);
    // Roof - orange/red awning
    g.fillStyle(0xFF4500);
    g.fillRect(0, 0, w, h * 0.25);
    // Striped awning detail
    g.fillStyle(0xFF6347);
    for (let i = 0; i < 6; i++) {
      g.fillRect(i * (w / 6), h * 0.1, w / 12, h * 0.15);
    }
    // Window with neon glow effect
    g.fillStyle(0xFF00FF);
    g.fillRect(w * 0.1, h * 0.32, 30, 24);
    g.fillStyle(0x000000);
    g.fillRect(w * 0.1 + 3, h * 0.32 + 3, 24, 18);
    // Door on the inner side
    const doorX = side === 'left' ? w - 22 : 2;
    g.fillStyle(0x000000);
    g.fillRect(doorX, h * 0.5, 20, h * 0.5);
    g.fillStyle(0x1a1a1a);
    g.fillRect(doorX + 2, h * 0.52, 16, h * 0.46);
    // Vinyl record sign
    g.fillStyle(0x000000);
    g.fillRect(w * 0.58, h * 0.35, 20, 20);
    g.fillStyle(0x1a1a1a);
    g.fillRect(w * 0.58 + 4, h * 0.35 + 4, 12, 12);
    g.fillStyle(0xFF0000);
    g.fillRect(w * 0.58 + 8, h * 0.35 + 8, 4, 4);
  }

  spawnVinylAtStore(store) {
    // Spawn vinyl in front of the store (on the walkable path)
    const g = this.add.graphics();
    const col = store.side === 'left' ? 3 : this.COLS - 4;
    this.drawCollectible(g, 'vinyl');
    const vinyl = { graphics: g, col, x: col * this.TILE, y: store.y + this.TILE * 1.5, type: 'vinyl' };
    g.setPosition(vinyl.x, vinyl.y);
    this.collectibles.push(vinyl);
  }

  createSkateShop(startRow) {
    const shop = this.add.graphics();
    // Spawn on opposite side from last frat house if possible
    let side = Math.random() < 0.5 ? 'left' : 'right';
    if (this.activeFratHouse) {
      side = this.activeFratHouse.side === 'left' ? 'right' : 'left';
    }
    const col = side === 'left' ? 0 : this.COLS - 3;
    this.drawSkateShop(shop, side);
    const skateShop = {
      graphics: shop, side, col,
      y: startRow.y - (this.TILE * 3),
      height: this.TILE * 3, width: this.TILE * 3,
      hasSkateboardReady: true,  // Can spawn a skateboard
    };
    shop.setPosition(col * this.TILE, skateShop.y);
    shop.setDepth(10);  // Make sure it's visible
    this.skateShops.push(skateShop);
    return skateShop;
  }

  drawSkateShop(g, side) {
    const w = this.TILE * 3, h = this.TILE * 3;
    // Building base - teal/cyan skate shop vibe
    g.fillStyle(0x008B8B);
    g.fillRect(0, h * 0.2, w, h * 0.8);
    // Roof - bright yellow awning
    g.fillStyle(0xFFD700);
    g.fillRect(0, 0, w, h * 0.25);
    // Striped awning detail
    g.fillStyle(0xFFA500);
    for (let i = 0; i < 6; i++) {
      g.fillRect(i * (w / 6), h * 0.1, w / 12, h * 0.15);
    }
    // Window with neon glow
    g.fillStyle(0x00FFFF);
    g.fillRect(w * 0.1, h * 0.32, 30, 24);
    g.fillStyle(0x000000);
    g.fillRect(w * 0.1 + 3, h * 0.32 + 3, 24, 18);
    // Door on the inner side
    const doorX = side === 'left' ? w - 22 : 2;
    g.fillStyle(0x000000);
    g.fillRect(doorX, h * 0.5, 20, h * 0.5);
    g.fillStyle(0x006666);
    g.fillRect(doorX + 2, h * 0.52, 16, h * 0.46);
    // Skateboard sign
    g.fillStyle(0x8B4513);  // Board
    g.fillRect(w * 0.55, h * 0.4, 24, 6);
    g.fillStyle(0x000000);  // Wheels
    g.fillRect(w * 0.55 + 3, h * 0.4 + 6, 4, 4);
    g.fillRect(w * 0.55 + 17, h * 0.4 + 6, 4, 4);
  }

  spawnSkateboardAtShop(shop) {
    // Spawn skateboard in front of the shop (on the walkable path)
    const g = this.add.graphics();
    const col = shop.side === 'left' ? 3 : this.COLS - 4;
    this.drawCollectible(g, 'skateboard');
    const skateboard = { graphics: g, col, x: col * this.TILE, y: shop.y + this.TILE * 1.5, type: 'skateboard' };
    g.setPosition(skateboard.x, skateboard.y);
    this.collectibles.push(skateboard);
  }

  createPlayer() {
    this.player = this.add.graphics();
    this.player.setDepth(50);  // Ensure player is always visible on top of tiles/hazards
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

  createZine(y) {
    const g = this.add.graphics();
    const col = 2 + Math.floor(Math.random() * (this.COLS - 4));
    this.drawCollectible(g, 'zine');
    const zine = { graphics: g, col, x: col * this.TILE, y, type: 'zine' };
    g.setPosition(zine.x, zine.y);
    this.collectibles.push(zine);
    return zine;
  }

  drawCollectible(g, type) {
    const s = this.TILE;
    if (type === 'coffee') {
      g.fillStyle(0x8B4513);
      g.fillRect(s * 0.3, s * 0.2, s * 0.4, s * 0.6);
      g.fillStyle(0xFFFFFF);
      g.fillRect(s * 0.32, s * 0.22, s * 0.36, s * 0.1);
      g.fillRect(s * 0.4, s * 0.1, s * 0.04, s * 0.1);
    } else if (type === 'vinyl') {
      // Vinyl record - black disc with colored label
      g.fillStyle(0x000000);
      g.fillRect(s * 0.15, s * 0.15, s * 0.7, s * 0.7);
      g.fillStyle(0x1a1a1a);
      g.fillRect(s * 0.2, s * 0.2, s * 0.6, s * 0.6);
      // Colored label in center
      g.fillStyle(0xFF4500);
      g.fillRect(s * 0.35, s * 0.35, s * 0.3, s * 0.3);
      // Center hole
      g.fillStyle(0x000000);
      g.fillRect(s * 0.45, s * 0.45, s * 0.1, s * 0.1);
    } else if (type === 'skateboard') {
      // Skateboard - radical!
      g.fillStyle(0x00BFFF);  // Bright blue deck
      g.fillRect(s * 0.1, s * 0.4, s * 0.8, s * 0.2);
      // Curved ends
      g.fillRect(s * 0.05, s * 0.42, s * 0.1, s * 0.16);
      g.fillRect(s * 0.85, s * 0.42, s * 0.1, s * 0.16);
      // Trucks (metal)
      g.fillStyle(0xC0C0C0);
      g.fillRect(s * 0.2, s * 0.58, s * 0.15, s * 0.08);
      g.fillRect(s * 0.65, s * 0.58, s * 0.15, s * 0.08);
      // Wheels
      g.fillStyle(0xFF4500);
      g.fillRect(s * 0.15, s * 0.64, s * 0.1, s * 0.1);
      g.fillRect(s * 0.3, s * 0.64, s * 0.1, s * 0.1);
      g.fillRect(s * 0.6, s * 0.64, s * 0.1, s * 0.1);
      g.fillRect(s * 0.75, s * 0.64, s * 0.1, s * 0.1);
      // Deck graphic
      g.fillStyle(0xFFFF00);
      g.fillRect(s * 0.4, s * 0.44, s * 0.2, s * 0.12);
    } else {
      // Zine - pink/punk aesthetic
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
    // Head collection display - punk heads on left, frat heads on right
    this.punkHeadsText = this.add.text(10, 4, '🖤🖤🖤🖤🖤', {
      fontSize: '16px', fontFamily: 'Arial', color: '#000000',
      stroke: '#FFFFFF', strokeThickness: 2
    });
    this.punkHeadsText.setScrollFactor(0).setDepth(102);

    this.fratHeadsText = this.add.text(this.VIEW_W - 10, 4, '💛💛💛💛💛', {
      fontSize: '16px', fontFamily: 'Arial', color: '#FFD700',
      stroke: '#000000', strokeThickness: 2
    });
    this.fratHeadsText.setOrigin(1, 0).setScrollFactor(0).setDepth(102);

    // Status text in center
    this.statusText = this.add.text(this.VIEW_W / 2, 6, 'BALANCED', {
      fontSize: '12px', fontFamily: 'Arial', color: '#FFFFFF',
      stroke: '#000000', strokeThickness: 2
    });
    this.statusText.setOrigin(0.5, 0).setScrollFactor(0).setDepth(100);

    this.scoreText = this.add.text(this.VIEW_W - 10, 24, 'Score: 0', { fontSize: '12px', fontFamily: 'Arial', color: '#FFFFFF', stroke: '#000000', strokeThickness: 2 });
    this.scoreText.setOrigin(1, 0).setScrollFactor(0).setDepth(100);

    // Burn progress
    this.burnText = this.add.text(this.VIEW_W - 10, 40, 'Burned: 0/' + this.getTotalHouses(), { fontSize: '10px', fontFamily: 'Arial', color: '#FF4500', stroke: '#000000', strokeThickness: 1 });
    this.burnText.setOrigin(1, 0).setScrollFactor(0).setDepth(100);

    // Joint/power-up status (bottom left)
    this.powerText = this.add.text(10, this.VIEW_H - 20, '', { fontSize: '12px', fontFamily: 'Arial', color: '#00FF00', stroke: '#000000', strokeThickness: 2 });
    this.powerText.setScrollFactor(0).setDepth(100);

    this.charText = this.add.text(10, 24, this.characterTypes[this.currentCharacter].name, { fontSize: '10px', fontFamily: 'Arial', color: '#FFFFFF', stroke: '#000000', strokeThickness: 1 });
    this.charText.setScrollFactor(0).setDepth(100);

    // Fratbro warning - big visible box at center of screen
    this.warningBg = this.add.graphics();
    this.warningBg.setScrollFactor(0).setDepth(150);
    this.warningBg.setVisible(false);

    this.fratbroWarning = this.add.text(this.VIEW_W / 2, this.VIEW_H / 2, '', {
      fontSize: '16px', fontFamily: 'Arial', color: '#FFFFFF',
      stroke: '#000000', strokeThickness: 3,
      backgroundColor: '#FF0000',
      padding: { x: 10, y: 8 }
    });
    this.fratbroWarning.setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(151);
    this.fratbroWarning.setVisible(false);

    this.updateHeadsDisplay();
  }

  updateHeadsDisplay() {
    // Update punk display (skateboards - filled = collected)
    let punkDisplay = '';
    for (let i = 0; i < this.MAX_HEADS; i++) {
      punkDisplay += i < this.punkHeads ? '🛹' : '○';
    }
    this.punkHeadsText.setText(punkDisplay);

    // Update frat display (red solo cups)
    let fratDisplay = '';
    for (let i = 0; i < this.MAX_HEADS; i++) {
      fratDisplay += i < this.fratHeads ? '🥤' : '○';
    }
    this.fratHeadsText.setText(fratDisplay);

    // Update status text
    if (this.isTransformed) {
      this.statusText.setText('SORORITY! Get 5 🛹 to recover!');
      this.statusText.setColor('#FFD700');
    } else if (this.hasJoint) {
      const timeLeft = Math.ceil(this.jointTimer / 1000);
      this.statusText.setText('🌿 BLAZING! ' + timeLeft + 's - Touch frats to BURN!');
      this.statusText.setColor('#00FF00');
    } else if (this.punkHeads >= 4) {
      this.statusText.setText('Almost there! 1 more 🛹!');
      this.statusText.setColor('#FF00FF');
    } else if (this.fratHeads >= 4) {
      this.statusText.setText('DANGER! Avoid 🥤!');
      this.statusText.setColor('#FF0000');
    } else if (this.fratHeads > this.punkHeads) {
      this.statusText.setText('Slipping toward frat...');
      this.statusText.setColor('#FFAA00');
    } else if (this.punkHeads > this.fratHeads) {
      this.statusText.setText('Staying punk!');
      this.statusText.setColor('#FF00FF');
    } else {
      this.statusText.setText('Balanced');
      this.statusText.setColor('#FFFFFF');
    }

    // Update power-up text
    if (this.hasJoint) {
      const timeLeft = Math.ceil(this.jointTimer / 1000);
      this.powerText.setText('🌿 INVINCIBLE! ' + timeLeft + 's');
      this.powerText.setColor('#00FF00');
    } else {
      this.powerText.setText('');
    }
  }

  // Add a punk head when collecting items
  addPunkHead() {
    if (this.isTransformed) {
      // When transformed, punk heads help recover
      this.punkHeads++;
      if (this.punkHeads >= this.MAX_HEADS) {
        this.revertTransformation();
      }
    } else {
      this.punkHeads++;
      if (this.punkHeads >= this.MAX_HEADS) {
        this.getJoint();
      }
    }
    this.updateHeadsDisplay();
  }

  // Add a frat head when near frat houses/fratbros
  addFratHead() {
    if (this.hasJoint) return;  // Invincible!
    this.fratHeads++;
    if (this.fratHeads >= this.MAX_HEADS) {
      this.triggerTransformation();
    }
    this.updateHeadsDisplay();
  }

  // Get the joint power-up
  getJoint() {
    this.hasJoint = true;
    this.jointTimer = this.JOINT_DURATION;
    this.punkHeads = 0;  // Reset punk heads
    this.fratHeads = 0;  // Reset frat heads
    this.cameras.main.flash(300, 0, 255, 0);  // Green flash
    this.charText.setText('🌿 JOINT ACQUIRED! You are BLAZING!');
    this.updateHeadsDisplay();
  }

  setupControls() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.aKey = this.input.keyboard.addKey('A');
    this.dKey = this.input.keyboard.addKey('D');
    this.wKey = this.input.keyboard.addKey('W');
    this.sKeyMove = this.input.keyboard.addKey('S');  // For movement (down)
    this.spaceKey = this.input.keyboard.addKey('SPACE');
    this.cKey = this.input.keyboard.addKey('C');  // Cycle character
    this.tKey = this.input.keyboard.addKey('T');  // Cycle skin tone
    this.fKey = this.input.keyboard.addKey('F');  // Drop cigarette to burn frat house
    this.lastKeys = { left: false, right: false, up: false, down: false };
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
    if (Phaser.Input.Keyboard.JustDown(this.tKey)) this.cycleSkinTone();
    if (Phaser.Input.Keyboard.JustDown(this.fKey)) this.tryDropCigarette();

    // Only scroll if not being drained (near frat house or fratbro)
    const isBeingDrained = this.fratHeads >= 3;  // Slow down when close to transformation
    const dy = isBeingDrained ? this.SCROLL_SPEED * 0.5 * (delta / 1000) : this.SCROLL_SPEED * (delta / 1000);
    this.scrollWorld(dy);

    this.handleMovement();

    // Keep player from going off the bottom of the screen
    if (this.playerY > this.VIEW_H - this.TILE) {
      this.playerY = this.VIEW_H - this.TILE;
      this.player.setY(this.playerY - this.TILE / 2);
    }

    this.updateFratHouse(delta);
    this.updateFratbros(delta);
    this.updateCoffeeShops(delta);
    this.updateRecordStores(delta);
    this.updateSkateShops(delta);
    this.updateTrashcans();
    this.updateCollectibles();
    this.handleSpawning();
    this.checkWinCondition();

    this.score += delta * 0.01;
    this.scoreText.setText('Score: ' + Math.floor(this.score));

    // Update joint timer
    if (this.hasJoint) {
      this.jointTimer -= delta;
      if (this.jointTimer <= 0) {
        this.hasJoint = false;
        this.jointTimer = 0;
        this.charText.setText(this.characterTypes[this.currentCharacter].name);
      }
      this.updateHeadsDisplay();
    }
  }

  tryDropCigarette() {
    if (!this.hasCigarette || this.isTransformed) return;

    // Check if near a trashcan
    for (const trashcan of this.trashcans) {
      const dx = this.playerX - (trashcan.x + this.TILE / 2);
      const dy = this.playerY - (trashcan.y + this.TILE / 2);
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < this.TILE * 1.5 && trashcan.fratHouse && !trashcan.fratHouse.isBurned) {
        this.burnFratHouse(trashcan.fratHouse);
        this.hasCigarette = false;
        this.punkPower = 0;
        this.updateCigaretteUI();
        return;
      }
    }
  }

  burnFratHouse(fratHouse) {
    if (fratHouse.isBurned) return;

    fratHouse.isBurned = true;
    fratHouse.isActive = false;
    fratHouse.suckRadius = 0;
    this.burnedHouses.add(fratHouse.id);

    // Redraw as burned
    fratHouse.graphics.clear();
    this.drawBurnedFratHouse(fratHouse.graphics, fratHouse.side);

    // Update label color
    if (fratHouse.label) {
      fratHouse.label.setColor('#666666');
    }

    // Fire effect!
    this.cameras.main.flash(300, 255, 100, 0);
    this.score += 1000;

    // Update burn counter
    this.burnText.setText('Burned: ' + this.getBurnedCount() + '/' + this.getTotalHouses());

    // Show message
    this.charText.setText(fratHouse.name + ' BURNED!');
    this.time.delayedCall(2000, () => {
      if (!this.isTransformed) {
        this.charText.setText(this.characterTypes[this.currentCharacter].name + (this.hasCigarette ? ' [CIG]' : ''));
      }
    });
  }

  getBurnedCount() {
    return this.burnedHouses.size;
  }

  getTotalHouses() {
    return this.universities[this.selectedUniversity].length;
  }

  getCigarette() {
    this.hasCigarette = true;
    this.charText.setText(this.characterTypes[this.currentCharacter].name + ' [CIG] - F to burn!');
    this.cameras.main.flash(200, 255, 200, 0);
    this.updateCigaretteUI();
  }

  updateCigaretteUI() {
    // Update character text to show cigarette status
    if (this.hasCigarette && !this.isTransformed) {
      this.charText.setText(this.characterTypes[this.currentCharacter].name + ' [CIG]');
    }
  }

  checkWinCondition() {
    if (this.getBurnedCount() >= this.getTotalHouses()) {
      this.triggerWin();
    }
  }

  triggerWin() {
    this.gameOver = true;
    this.charText.setText('YOU WIN! All frats burned!');
    this.cameras.main.flash(1000, 255, 0, 255);
    // Could add a win screen here
  }

  updateTrashcans() {
    // Just keep trashcans in sync - they move with scrollWorld
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
      if (this.activeFratHouse.label) {
        this.activeFratHouse.label.setY(this.activeFratHouse.y - 10);
      }
      if (this.activeFratHouse.y > this.VIEW_H + this.TILE * 4) {
        this.activeFratHouse.graphics.destroy();
        if (this.activeFratHouse.label) this.activeFratHouse.label.destroy();
        this.activeFratHouse = null;
      }
    }
    // Move trashcans
    for (const trashcan of this.trashcans) {
      trashcan.y += dy;
      trashcan.graphics.setY(Math.round(trashcan.y));
    }
    this.trashcans = this.trashcans.filter(t => {
      if (t.y > this.VIEW_H + this.TILE) {
        t.graphics.destroy();
        return false;
      }
      return true;
    });
    for (const bro of this.fratbros) { bro.y += dy; bro.graphics.setY(Math.round(bro.y)); }
    this.fratbros = this.fratbros.filter(bro => { if (bro.y > this.VIEW_H + this.TILE) { bro.graphics.destroy(); return false; } return true; });
    for (const c of this.collectibles) { c.y += dy; c.graphics.setY(Math.round(c.y)); }
    this.collectibles = this.collectibles.filter(c => { if (c.y > this.VIEW_H + this.TILE) { c.graphics.destroy(); return false; } return true; });
    // Move coffee shops
    for (const shop of this.coffeeShops) { shop.y += dy; shop.graphics.setY(Math.round(shop.y)); }
    this.coffeeShops = this.coffeeShops.filter(shop => { if (shop.y > this.VIEW_H + this.TILE * 4) { shop.graphics.destroy(); return false; } return true; });
    // Move record stores
    for (const store of this.recordStores) { store.y += dy; store.graphics.setY(Math.round(store.y)); }
    this.recordStores = this.recordStores.filter(store => { if (store.y > this.VIEW_H + this.TILE * 4) { store.graphics.destroy(); return false; } return true; });
    // Move skate shops
    for (const shop of this.skateShops) { shop.y += dy; shop.graphics.setY(Math.round(shop.y)); }
    this.skateShops = this.skateShops.filter(shop => { if (shop.y > this.VIEW_H + this.TILE * 4) { shop.graphics.destroy(); return false; } return true; });
  }

  handleMovement() {
    const leftPressed = this.cursors.left.isDown || this.aKey.isDown || this.mobileControls.left;
    const rightPressed = this.cursors.right.isDown || this.dKey.isDown || this.mobileControls.right;
    const upPressed = this.cursors.up.isDown || this.wKey.isDown || this.mobileControls.up;
    const downPressed = this.cursors.down.isDown || this.sKeyMove.isDown || this.mobileControls.down;

    const leftJust = leftPressed && !this.lastKeys.left;
    const rightJust = rightPressed && !this.lastKeys.right;
    const upJust = upPressed && !this.lastKeys.up;
    const downJust = downPressed && !this.lastKeys.down;

    this.lastKeys.left = leftPressed;
    this.lastKeys.right = rightPressed;
    this.lastKeys.up = upPressed;
    this.lastKeys.down = downPressed;

    // Left/Right movement
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

    // Up/Down movement (forward/backward)
    if (upJust && this.playerY > this.TILE * 3) {
      this.playerY -= this.TILE;
      this.player.setY(this.playerY - this.TILE / 2);
      this.events.emit('player-move');
    } else if (downJust && this.playerY < this.VIEW_H - this.TILE * 2) {
      this.playerY += this.TILE;
      this.player.setY(this.playerY - this.TILE / 2);
      this.events.emit('player-move');
    }
  }

  updateFratHouse(delta) {
    this.beingDrainedByHouse = false;
    if (!this.activeFratHouse) return;
    const house = this.activeFratHouse;

    // If we have a joint, we can burn frat houses by touching them!
    if (this.hasJoint && !house.isBurned) {
      const houseCenterX = (house.col + 1.5) * this.TILE;
      const houseCenterY = house.y + house.height / 2;
      const dx = this.playerX - houseCenterX;
      const dy = this.playerY - houseCenterY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < this.TILE * 2) {
        this.burnFratHouse(house);
        return;
      }
    }

    const doorX = house.side === 'left' ? (house.col + 2.5) * this.TILE : house.col * this.TILE + this.TILE * 0.5;
    const doorY = house.y + house.height * 0.7;
    const dx = this.playerX - doorX, dy = this.playerY - doorY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < house.suckRadius && !this.hasJoint) {
      this.beingDrainedByHouse = true;
      const intensity = 1 - (dist / house.suckRadius);

      // Add frat heads over time when near frat house
      this.fratDrainTimer = (this.fratDrainTimer || 0) + delta;
      if (this.fratDrainTimer > 500) {  // Add a frat head every 0.5 seconds
        this.fratDrainTimer = 0;
        this.addFratHead();
      }

      const pullStrength = intensity * 0.3;
      this.playerX += (doorX - this.playerX) * pullStrength * (delta / 16);
      this.playerY += (doorY - this.playerY) * pullStrength * (delta / 16);
      this.player.setPosition(this.playerX - this.TILE / 2, this.playerY - this.TILE / 2);
      // Show frat house warning
      if (!this.isTransformed) {
        this.fratbroWarning.setText('🏠 FRAT HOUSE PULLING YOU IN! 🏠');
        this.fratbroWarning.setVisible(true);
      }
    }
  }

  updateFratbros(delta) {
    let beingDrained = false;
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
      if (dist < bro.suckRadius && !this.hasJoint) {
        beingDrained = true;
        // Add frat heads over time when near fratbro
        bro.drainTimer = (bro.drainTimer || 0) + delta;
        if (bro.drainTimer > 600) {  // Add a frat head every 0.6 seconds
          bro.drainTimer = 0;
          this.addFratHead();
        }
      }
    }
    // Show/hide fratbro warning (but not if frat house is already showing)
    if (beingDrained && !this.isTransformed && !this.beingDrainedByHouse) {
      this.fratbroWarning.setText('⚠️ FRATBRO DRAINING PUNK! ⚠️');
      this.fratbroWarning.setVisible(true);
    } else if (!this.beingDrainedByHouse) {
      this.fratbroWarning.setVisible(false);
    }
  }

  updateCoffeeShops(delta) {
    for (const shop of this.coffeeShops) {
      // Check if player is near the coffee shop and can get coffee
      const shopCenterX = shop.side === 'left' ? (shop.col + 1.5) * this.TILE : (shop.col + 1.5) * this.TILE;
      const shopCenterY = shop.y + shop.height / 2;
      const dx = this.playerX - shopCenterX;
      const dy = this.playerY - shopCenterY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // If player is near and coffee is ready, spawn it
      if (dist < this.TILE * 3 && shop.hasCoffeeReady) {
        this.spawnCoffeeAtShop(shop);
        shop.hasCoffeeReady = false;
      }
    }
  }

  updateRecordStores(delta) {
    for (const store of this.recordStores) {
      // Check if player is near the record store and can get vinyl
      const storeCenterX = store.side === 'left' ? (store.col + 1.5) * this.TILE : (store.col + 1.5) * this.TILE;
      const storeCenterY = store.y + store.height / 2;
      const dx = this.playerX - storeCenterX;
      const dy = this.playerY - storeCenterY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // If player is near and vinyl is ready, spawn it
      if (dist < this.TILE * 3 && store.hasVinylReady) {
        this.spawnVinylAtStore(store);
        store.hasVinylReady = false;
      }
    }
  }

  updateSkateShops(delta) {
    for (const shop of this.skateShops) {
      // Check if player is near the skate shop and can get a skateboard
      const shopCenterX = shop.side === 'left' ? (shop.col + 1.5) * this.TILE : (shop.col + 1.5) * this.TILE;
      const shopCenterY = shop.y + shop.height / 2;
      const dx = this.playerX - shopCenterX;
      const dy = this.playerY - shopCenterY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // If player is near and skateboard is ready, spawn it
      if (dist < this.TILE * 3 && shop.hasSkateboardReady) {
        this.spawnSkateboardAtShop(shop);
        shop.hasSkateboardReady = false;
      }
    }
  }

  updateCollectibles() {
    for (let i = this.collectibles.length - 1; i >= 0; i--) {
      const c = this.collectibles[i];
      const dx = this.playerX - (c.x + this.TILE / 2), dy = this.playerY - (c.y + this.TILE / 2);
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < this.TILE * 0.8) {
        // Collecting items gives you a punk head (skateboard)!
        this.addPunkHead();

        // Also give points based on type
        if (c.type === 'coffee') { this.score += 100; }
        else if (c.type === 'vinyl') { this.score += 175; }
        else if (c.type === 'skateboard') { this.score += 150; }
        else { this.score += 200; }  // Zines

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
      this.nextFratHouseIn = Math.floor(Math.random() * 120) + 100;  // ~3-4 seconds between frat houses
    }
    this.nextFratbroIn--;
    if (this.nextFratbroIn <= 0) {
      const topRow = this.rows.reduce((a, b) => a.y < b.y ? a : b);
      this.createFratbro(topRow.y - this.TILE);
      this.nextFratbroIn = Math.floor(Math.random() * 150) + 120;  // ~3-5 seconds between fratbros
    }
    // Spawn coffee shops - coffee only comes from these! (very frequent)
    this.nextCoffeeShopIn--;
    if (this.nextCoffeeShopIn <= 0) {
      const topRow = this.rows.reduce((a, b) => a.y < b.y ? a : b);
      this.createCoffeeShop(topRow);
      this.nextCoffeeShopIn = Math.floor(Math.random() * 40) + 30;  // Every ~1-2 seconds
    }
    // Spawn record stores - vinyl only comes from these!
    this.nextRecordStoreIn--;
    if (this.nextRecordStoreIn <= 0) {
      const topRow = this.rows.reduce((a, b) => a.y < b.y ? a : b);
      this.createRecordStore(topRow);
      this.nextRecordStoreIn = Math.floor(Math.random() * 50) + 40;  // Every ~1.5-3 seconds
    }
    // Spawn skate shops - skateboards only come from these!
    this.nextSkateShopIn--;
    if (this.nextSkateShopIn <= 0) {
      const topRow = this.rows.reduce((a, b) => a.y < b.y ? a : b);
      this.createSkateShop(topRow);
      this.nextSkateShopIn = Math.floor(Math.random() * 60) + 50;  // Every ~2-3 seconds
    }
    // Zines spawn rarely on the street now
    this.nextZineIn--;
    if (this.nextZineIn <= 0) {
      const topRow = this.rows.reduce((a, b) => a.y < b.y ? a : b);
      this.createZine(topRow.y - this.TILE);
      this.nextZineIn = Math.floor(Math.random() * 200) + 150;  // Zines are rare now
    }
  }

  triggerTransformation() {
    if (this.isTransformed) return;
    this.isTransformed = true;
    this.transformationCount++;
    this.fratHeads = 0;  // Reset frat heads
    this.punkHeads = 0;  // Reset punk heads - need to collect 5 to recover
    this.hasCigarette = false;  // Lose cigarette when transformed
    this.hasJoint = false;  // Lose joint when transformed

    // Check for game over (transformed twice)
    if (this.transformationCount >= 2) {
      this.triggerGameOver();
      return;
    }

    this.drawPlayer();
    this.charText.setText('SORORITY GIRL! Get 5 🛹 to recover! (' + this.transformationCount + '/2)');
    this.cameras.main.flash(500, 255, 182, 193);  // Pink flash
    this.updateHeadsDisplay();
  }

  triggerGameOver() {
    this.gameOver = true;
    this.isTransformed = true;
    this.drawGiantSororityHead();
    this.charText.setText('GAME OVER - You became a sorority girl forever!');
    this.cameras.main.shake(500, 0.02);
  }

  drawGiantSororityHead() {
    // Clear the player and draw a giant sorority girl head
    this.player.clear();
    const s = this.TILE * 3;  // 3x bigger
    const g = this.player;
    const skin = this.COLORS.skin;

    // Giant blonde hair
    g.fillStyle(this.COLORS.sororityHair);
    g.fillRect(-s * 0.3, -s * 0.3, s * 1.6, s * 0.6);
    g.fillRect(s * 0.6, -s * 0.35, s * 0.4, s * 1);

    // Giant face
    g.fillStyle(skin);
    g.fillRect(0, 0, s, s * 0.8);

    // Giant eyes
    g.fillStyle(0x000000);
    g.fillRect(s * 0.15, s * 0.2, s * 0.25, s * 0.2);
    g.fillRect(s * 0.6, s * 0.2, s * 0.25, s * 0.2);
    g.fillStyle(0xFFFFFF);
    g.fillRect(s * 0.18, s * 0.22, s * 0.08, s * 0.08);
    g.fillRect(s * 0.63, s * 0.22, s * 0.08, s * 0.08);

    // Giant pink smile
    g.fillStyle(0xFF69B4);
    g.fillRect(s * 0.25, s * 0.55, s * 0.5, s * 0.15);

    // Position in center
    this.player.setPosition(this.VIEW_W / 2 - s / 2, this.VIEW_H / 2 - s / 2);
  }

  revertTransformation() {
    this.isTransformed = false;
    this.punkHeads = 0;  // Reset punk heads
    this.fratHeads = 0;  // Reset frat heads
    this.drawPlayer();
    this.charText.setText(this.characterTypes[this.currentCharacter].name + ' - RECOVERED!');
    this.score += 500;  // Bonus for recovering
    this.updateHeadsDisplay();

    // Flash effect to celebrate
    this.cameras.main.flash(500, 255, 0, 255);

    // Reset text after a moment
    this.time.delayedCall(2000, () => {
      if (!this.isTransformed) {
        this.charText.setText(this.characterTypes[this.currentCharacter].name);
      }
    });
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
