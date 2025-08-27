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
    this.VIEW_H = 500;
    this.SCROLL_SPEED = 120;

    this.COLOR_BG = 0x363e48;
    this.COLOR_GRID = 0x2b2b32;
    this.COLOR_PATH = 0xd2c1a5;
    this.COLOR_HEDGE = 0x19b23b;
    this.COLOR_LIGHT = 0xd6e482;
    this.COLOR_GRASS = 0x5be37d;
    this.COLOR_BENCH = 0x2A5434; // Dark green metal for benches
    this.COLOR_BENCH_DARK = 0x1A3A24; // Darker green for shadows
    this.COLOR_BENCH_LIGHT = 0x3A6444; // Lighter green for highlights
    this.COLOR_BENCH_OUTLINE = 0x0A1A14; // Very dark green for outlines

    this.TILE_PATH = 0;
    this.TILE_HEDGE = 1;
    this.TILE_LIGHT = 2;
    this.TILE_GRASS = 3;
    this.TILE_BENCH = 4;

    this.VISIBLE_ROWS = Math.ceil(this.VIEW_H / this.TILE) + 6;

    this.leftLightCounter = 0;
    this.rightLightCounter = 0;
    this.leftLightSpacing = Math.floor(Math.random() * 18) + 6;
    this.rightLightSpacing = Math.floor(Math.random() * 18) + 6;
    
    // Bench counters for median left (col 4) and median right (col 6)
    this.leftBenchCounter = 0;
    this.rightBenchCounter = 0;
    this.leftBenchSpacing = Math.floor(Math.random() * 12) + 8;  // 8-19 rows spacing
    this.rightBenchSpacing = Math.floor(Math.random() * 12) + 8; // 8-19 rows spacing
    this.benchHeight = 2; // Benches are 2 rows tall
    this.leftBenchRowsRemaining = 0;  // For median left (col 4)
    this.rightBenchRowsRemaining = 0; // For median right (col 6)
    
    // Track bench positions for connecting planks
    this.leftBenchStartRow = -1;
    this.rightBenchStartRow = -1;
    
    this.rows = [];

    // Pride flag definitions for new sprite system - MUST BE DEFINED BEFORE PLAYER CREATION
    this.FLAGS = {
      rainbow:  ['#E40303','#FF8C00','#FFED00','#008026','#004DFF','#750787'],
      trans:    ['#5BCEFA','#F5A9B8','#FFFFFF','#F5A9B8','#5BCEFA'],
      bi:       ['#D60270','#9B4F96','#0038A8'],
      pan:      ['#FF218C','#FFD800','#21B1FF'],
      nonbin:   ['#FCF434','#FFFFFF','#9C59D1','#2C2C2C'],
      lesbian:  ['#D52D00','#FF9A56','#FFFFFF','#D362A4','#A30262'],
      ace:      ['#000000','#A3A3A3','#FFFFFF','#800080'],
      intersex: ['#FFD800','#7A00AC'],
      gq:       ['#B77FDD','#FFFFFF','#4A8123'],
      progress: ['#000000','#784F17','#E40303','#FF8C00','#FFED00','#008026','#004DFF','#750787']
    };

    this.initRows();

    // QUEER: Create character with random variation from 10 new tiny sprite options
    const startCol = Math.floor(this.COLS / 2);
    this.player = this.add.graphics();
    this.playerVariation = Math.floor(Math.random() * 10) + 1; // Random 1-10 for new sprites
    this.useTinySprites = true; // Flag to use new system
    
    // Draw using new tiny sprite system
    if (this.useTinySprites) {
      const config = this.getTinyCharacterConfig(this.playerVariation);
      this.drawTinyCharacter(this.player, config, 0, 0);
    } else {
      this.drawCharacter(this.player, 0, 0, this.playerVariation);
    }
    
    this.player.x = (startCol + 0.5) * this.TILE;
    this.player.y = this.VIEW_H * 0.65;

    this.player.currentCol = startCol;
    this.player.lastKeys = {
      left: false, right: false, up: false, down: false
    };

    this.cursors = this.input.keyboard.createCursorKeys();
    this.aKey = this.input.keyboard.addKey('A');
    this.dKey = this.input.keyboard.addKey('D');
    this.wKey = this.input.keyboard.addKey('W');
    this.sKey = this.input.keyboard.addKey('S');
    this.spaceKey = this.input.keyboard.addKey('SPACE');
    this.cKey = this.input.keyboard.addKey('C'); // Cycle player variations
    this.xKey = this.input.keyboard.addKey('X'); // Export spritesheet
    this.tKey = this.input.keyboard.addKey('T'); // Toggle tiny sprites
    
    // Game pause state
    this.isPaused = false;
    
    // Blocking state - when player hits a bench
    this.isBlocked = false;
    this.wasPlayingBeforeBlock = false;
    
    // Mobile control state
    this.mobileControls = {
      leftPressed: false,
      rightPressed: false
    };
  }

  // QUEER: Draw character with 14 variations (4 punk + 10 queer-positive)
  drawCharacter(g, x, y, variation = 1) {
    g.clear();
    
    // Get color scheme for this variation
    const colors = this.getCharacterColors(variation);
    
    // Character is 80% size, centered in tile (38x38 pixels in 48x48 tile)
    const offsetX = 5; // Center horizontally
    const offsetY = 5; // Center vertically
    
    // Hair base (black with shaved sides)
    g.fillStyle(colors.hairBase);
    g.fillRect(x + offsetX + 8, y + offsetY + 6, 22, 4);
    g.fillRect(x + offsetX + 12, y + offsetY + 3, 14, 3);
    
    // Mohawk hair (if present)
    if (colors.mohawk) {
      g.fillStyle(colors.mohawk);
      g.fillRect(x + offsetX + 14, y + offsetY + 0, 10, 3);
      g.fillRect(x + offsetX + 16, y + offsetY + 3, 6, 3);
      g.fillRect(x + offsetX + 18, y + offsetY + 6, 2, 3);
    }
    
    // Face
    g.fillStyle(colors.skin);
    g.fillRect(x + offsetX + 10, y + offsetY + 10, 18, 8);
    g.fillRect(x + offsetX + 12, y + offsetY + 8, 14, 4);
    
    // Eyes
    g.fillStyle(colors.eyes);
    g.fillRect(x + offsetX + 13, y + offsetY + 11, 3, 2);
    g.fillRect(x + offsetX + 22, y + offsetY + 11, 3, 2);
    
    // Eyeliner
    g.fillStyle(colors.eyeliner);
    g.fillRect(x + offsetX + 12, y + offsetY + 10, 5, 1);
    g.fillRect(x + offsetX + 21, y + offsetY + 10, 5, 1);
    
    // Lips/mouth
    g.fillStyle(colors.lips);
    g.fillRect(x + offsetX + 17, y + offsetY + 15, 4, 1);
    
    // Jacket/top
    g.fillStyle(colors.jacket);
    g.fillRect(x + offsetX + 6, y + offsetY + 18, 26, 12);
    g.fillRect(x + offsetX + 8, y + offsetY + 16, 22, 4);
    g.fillRect(x + offsetX + 10, y + offsetY + 16, 6, 3);
    g.fillRect(x + offsetX + 22, y + offsetY + 16, 6, 3);
    
    // Arms/sleeves
    g.fillStyle(colors.sleeves || colors.jacket);
    g.fillRect(x + offsetX + 2, y + offsetY + 20, 6, 8);
    g.fillRect(x + offsetX + 30, y + offsetY + 20, 6, 8);
    
    // Gloves
    g.fillStyle(colors.gloves);
    g.fillRect(x + offsetX + 4, y + offsetY + 26, 4, 3);
    g.fillRect(x + offsetX + 30, y + offsetY + 26, 4, 3);
    
    // Exposed fingers
    g.fillStyle(colors.skin);
    g.fillRect(x + offsetX + 4, y + offsetY + 28, 4, 2);
    g.fillRect(x + offsetX + 30, y + offsetY + 28, 4, 2);
    
    // Jeans/bottoms
    g.fillStyle(colors.jeans);
    g.fillRect(x + offsetX + 12, y + offsetY + 30, 14, 6);
    
    // Rips in jeans
    g.fillStyle(colors.skin);
    g.fillRect(x + offsetX + 15, y + offsetY + 32, 2, 1);
    g.fillRect(x + offsetX + 21, y + offsetY + 33, 2, 1);
    
    // Boots
    g.fillStyle(colors.boots);
    g.fillRect(x + offsetX + 10, y + offsetY + 35, 7, 3);
    g.fillRect(x + offsetX + 21, y + offsetY + 35, 7, 3);
    
    // Studs
    g.fillStyle(colors.studs);
    g.fillRect(x + offsetX + 10, y + offsetY + 20, 1, 1);
    g.fillRect(x + offsetX + 14, y + offsetY + 22, 1, 1);
    g.fillRect(x + offsetX + 18, y + offsetY + 20, 1, 1);
    g.fillRect(x + offsetX + 22, y + offsetY + 22, 1, 1);
    g.fillRect(x + offsetX + 26, y + offsetY + 20, 1, 1);
    g.fillRect(x + offsetX + 12, y + offsetY + 35, 1, 1);
    g.fillRect(x + offsetX + 23, y + offsetY + 35, 1, 1);
    
    // Pride badge (6px wide vertical stripes)
    if (colors.badge) {
      this.drawFlag(g, x + offsetX + 22, y + offsetY + 19, colors.badge);
    }
    
    // Earring (if present)
    if (colors.earring) {
      g.fillStyle(colors.earring);
      g.fillRect(x + offsetX + 27, y + offsetY + 14, 1, 2);
    }
  }
  
  // Draw pride flag as vertical stripes
  drawFlag(g, x, y, stripes) {
    for (let i = 0; i < stripes.length; i++) {
      g.fillStyle(stripes[i]);
      g.fillRect(x, y + i, 6, 1);
    }
  }

  // NEW PIXEL-PERFECT SPRITE SYSTEM
  drawBadge(g, x, y, stripes, isSash = true) {
    const SCALE = 2.4;
    if (isSash) {
      // 3-5 diagonal stripes across torso
      stripes.forEach((color, i) => {
        g.fillStyle(color);
        g.fillRect(x + i * SCALE, y + i * SCALE, 8 * SCALE, 1 * SCALE);
      });
    } else {
      // Armband - horizontal stripes
      stripes.forEach((color, i) => {
        g.fillStyle(color);
        g.fillRect(x, y + i * SCALE, 6 * SCALE, 1 * SCALE);
      });
    }
  }

  drawTinyCharacter(g, cfg, ox = 0, oy = 0) {
    g.clear();
    
    const { hair, mohawk, skin, eyes, liner, lips, jacket, sleeves, jeans, boots, studs, badge, earring } = cfg;
    
    // Scale factor to make 20x20 sprites fit in 48x48 tiles (2.4x scale)
    const SCALE = 2.4;
    const OFFSET_X = 4; // Center the scaled sprite
    const OFFSET_Y = 4;

    // Hair block(s)
    g.fillStyle(hair);
    g.fillRect(ox + OFFSET_X + 6 * SCALE, oy + OFFSET_Y + 4 * SCALE, 14 * SCALE, 3 * SCALE);
    g.fillRect(ox + OFFSET_X + 8 * SCALE, oy + OFFSET_Y + 7 * SCALE, 10 * SCALE, 3 * SCALE);
    if (mohawk) {
      g.fillStyle(mohawk);
      g.fillRect(ox + OFFSET_X + 10 * SCALE, oy + OFFSET_Y + 0 * SCALE, 6 * SCALE, 3 * SCALE);
      g.fillRect(ox + OFFSET_X + 11 * SCALE, oy + OFFSET_Y + 3 * SCALE, 4 * SCALE, 2 * SCALE);
    }

    // Face
    g.fillStyle(skin);
    g.fillRect(ox + OFFSET_X + 8 * SCALE, oy + OFFSET_Y + 8 * SCALE, 12 * SCALE, 6 * SCALE);

    // Eyes + liner
    g.fillStyle(eyes);
    g.fillRect(ox + OFFSET_X + 10 * SCALE, oy + OFFSET_Y + 9 * SCALE, 2 * SCALE, 1 * SCALE);
    g.fillRect(ox + OFFSET_X + 16 * SCALE, oy + OFFSET_Y + 9 * SCALE, 2 * SCALE, 1 * SCALE);
    g.fillStyle(liner);
    g.fillRect(ox + OFFSET_X + 9 * SCALE, oy + OFFSET_Y + 8 * SCALE, 4 * SCALE, 1 * SCALE);
    g.fillRect(ox + OFFSET_X + 15 * SCALE, oy + OFFSET_Y + 8 * SCALE, 4 * SCALE, 1 * SCALE);

    // Mouth
    g.fillStyle(lips);
    g.fillRect(ox + OFFSET_X + 12 * SCALE, oy + OFFSET_Y + 12 * SCALE, 3 * SCALE, 1 * SCALE);

    // Torso
    g.fillStyle(jacket);
    g.fillRect(ox + OFFSET_X + 5 * SCALE, oy + OFFSET_Y + 14 * SCALE, 16 * SCALE, 8 * SCALE);
    g.fillRect(ox + OFFSET_X + 7 * SCALE, oy + OFFSET_Y + 13 * SCALE, 12 * SCALE, 2 * SCALE);
    if (studs) {
      g.fillStyle(studs);
      g.fillRect(ox + OFFSET_X + 9 * SCALE, oy + OFFSET_Y + 16 * SCALE, 1 * SCALE, 1 * SCALE);
      g.fillRect(ox + OFFSET_X + 13 * SCALE, oy + OFFSET_Y + 17 * SCALE, 1 * SCALE, 1 * SCALE);
    }

    // Arms
    g.fillStyle(sleeves || jacket);
    g.fillRect(ox + OFFSET_X + 2 * SCALE, oy + OFFSET_Y + 15 * SCALE, 4 * SCALE, 6 * SCALE);
    g.fillRect(ox + OFFSET_X + 20 * SCALE, oy + OFFSET_Y + 15 * SCALE, 4 * SCALE, 6 * SCALE);

    // Bottoms
    g.fillStyle(jeans);
    g.fillRect(ox + OFFSET_X + 9 * SCALE, oy + OFFSET_Y + 22 * SCALE, 10 * SCALE, 4 * SCALE);
    g.fillStyle(skin);
    g.fillRect(ox + OFFSET_X + 10 * SCALE, oy + OFFSET_Y + 23 * SCALE, 1 * SCALE, 1 * SCALE);
    g.fillRect(ox + OFFSET_X + 16 * SCALE, oy + OFFSET_Y + 23 * SCALE, 1 * SCALE, 1 * SCALE);

    // Boots
    g.fillStyle(boots);
    g.fillRect(ox + OFFSET_X + 8 * SCALE, oy + OFFSET_Y + 26 * SCALE, 5 * SCALE, 2 * SCALE);
    g.fillRect(ox + OFFSET_X + 15 * SCALE, oy + OFFSET_Y + 26 * SCALE, 5 * SCALE, 2 * SCALE);

    // Sash/armband badge
    if (badge) this.drawBadge(g, ox + OFFSET_X + 7 * SCALE, oy + OFFSET_Y + 15 * SCALE, badge, true);

    // Earring
    if (earring) {
      g.fillStyle(earring);
      g.fillRect(ox + OFFSET_X + 18 * SCALE, oy + OFFSET_Y + 10 * SCALE, 1 * SCALE, 1 * SCALE);
    }
  }

  // Get color scheme for all 14 character variations (4 punk + 10 queer-positive)
  getCharacterColors(variation) {
    // Pride flag definitions
    const FLAGS = {
      rainbow:  ['#E40303','#FF8C00','#FFED00','#008026','#004DFF','#750787'],
      trans:    ['#5BCEFA','#F5A9B8','#FFFFFF','#F5A9B8','#5BCEFA'],
      bi:       ['#D60270','#D60270','#9B4F96','#0038A8','#0038A8'],
      pan:      ['#FF218C','#FFD800','#21B1FF'],
      nonbin:   ['#FCF434','#FFFFFF','#9C59D1','#2C2C2C'],
      lesbian:  ['#D52D00','#FF9A56','#FFFFFF','#D362A4','#A30262'],
      ace:      ['#000000','#A3A3A3','#FFFFFF','#800080'],
      intersex: ['#FFD800','#FFD800','#FFD800','#FFD800','#7A00AC'],
      gq:       ['#B77FDD','#FFFFFF','#4A8123'],
      progress: ['#000000','#784F17','#E40303','#FF8C00','#FFED00','#008026','#004DFF','#750787']
    };
    
    const colorSchemes = {
      // Original 4 punk variations
      1: {
        mohawk: 0xFF1493,     // Neon pink
        hairBase: 0x000000,   // Black
        skin: 0xFFE4C4,       // Pale skin
        eyes: 0x000000,       // Black
        eyeliner: 0x000000,   // Black
        lips: 0x8B0000,       // Dark red
        jacket: 0x000000,     // Black leather
        studs: 0xC0C0C0,      // Silver
        gloves: 0x000000,     // Black
        jeans: 0x2a2a2a,      // Dark gray
        boots: 0x000000       // Black
      },
      2: {
        mohawk: 0x00BFFF,     // Electric blue
        hairBase: 0x000000,   // Black
        skin: 0xFFE4C4,       // Pale skin
        eyes: 0x000000,       // Black
        eyeliner: 0x000000,   // Black
        lips: 0x8B0000,       // Dark red
        jacket: 0x4B0082,     // Purple leather
        studs: 0xC0C0C0,      // Silver
        gloves: 0x000000,     // Black
        jeans: 0x1a1a1a,      // Darker gray
        boots: 0x2F4F4F       // Dark slate gray
      },
      3: {
        mohawk: 0x00FF7F,     // Toxic green
        hairBase: 0x000000,   // Black
        skin: 0xFFE4C4,       // Pale skin
        eyes: 0x000000,       // Black
        eyeliner: 0x000000,   // Black
        lips: 0x8B0000,       // Dark red
        jacket: 0x8B0000,     // Dark red leather
        studs: 0xDAA520,      // Brass/gold
        gloves: 0x000000,     // Black
        jeans: 0x000000,      // Pure black
        boots: 0x8B4513       // Brown (Doc Martens)
      },
      4: {
        mohawk: 0x9932CC,     // Royal purple
        hairBase: 0x000000,   // Black
        skin: 0xFFE4C4,       // Pale skin
        eyes: 0x000000,       // Black
        eyeliner: 0x000000,   // Black
        lips: 0x8B0000,       // Dark red
        jacket: 0x2F4F4F,     // Dark teal
        studs: 0xE6E6FA,      // Chrome/lavender
        gloves: 0x000000,     // Black
        jeans: 0x000000,      // Pure black
        boots: 0x000000       // Platform boots
      },
      // 10 new queer-positive variations (5-14)
      5: {
        mohawk: 0xFF1493,     // Rainbow Punk
        hairBase: 0x000000,
        skin: 0xF2D0B6,
        eyes: 0x000000,
        eyeliner: 0x000000,
        lips: 0x8B0000,
        jacket: 0x000000,
        studs: 0xC0C0C0,
        gloves: 0x000000,
        jeans: 0x2a2a2a,
        boots: 0x000000,
        badge: FLAGS.rainbow,
        earring: 0xFFD700
      },
      6: {
        mohawk: 0x5BCEFA,     // Trans Femme
        hairBase: 0x000000,
        skin: 0xF2D0B6,
        eyes: 0x000000,
        eyeliner: 0x000000,
        lips: 0x8B0000,
        jacket: 0x4B0082,
        studs: 0xC0C0C0,
        gloves: 0x000000,
        jeans: 0x1a1a1a,
        boots: 0x2F4F4F,
        badge: FLAGS.trans,
        earring: 0x5BCEFA
      },
      7: {
        mohawk: 0x9B4F96,     // Bi Masc
        hairBase: 0x000000,
        skin: 0xF2D0B6,
        eyes: 0x000000,
        eyeliner: 0x000000,
        lips: 0x8B0000,
        jacket: 0x111111,
        studs: 0xDAA520,
        gloves: 0x000000,
        jeans: 0x000000,
        boots: 0x8B4513,
        badge: FLAGS.bi
      },
      8: {
        mohawk: 0xFF218C,     // Pan Cutie
        hairBase: 0x000000,
        skin: 0xF2D0B6,
        eyes: 0x000000,
        eyeliner: 0x000000,
        lips: 0x8B0000,
        jacket: 0x222233,
        studs: 0xC0C0C0,
        gloves: 0x000000,
        jeans: 0x111111,
        boots: 0x000000,
        badge: FLAGS.pan
      },
      9: {
        mohawk: 0xFCF434,     // Non-Binary Bold
        hairBase: 0x000000,
        skin: 0xF2D0B6,
        eyes: 0x000000,
        eyeliner: 0x000000,
        lips: 0x8B0000,
        jacket: 0x000000,
        studs: 0xE6E6FA,
        gloves: 0x000000,
        jeans: 0x2a2a2a,
        boots: 0x000000,
        badge: FLAGS.nonbin
      },
      10: {
        mohawk: 0xD52D00,     // Lesbian Riot
        hairBase: 0x000000,
        skin: 0xF2D0B6,
        eyes: 0x000000,
        eyeliner: 0x000000,
        lips: 0x8B0000,
        jacket: 0x2F4F4F,
        studs: 0xDAA520,
        gloves: 0x000000,
        jeans: 0x000000,
        boots: 0x000000,
        badge: FLAGS.lesbian
      },
      11: {
        mohawk: 0x800080,     // Ace Sleek
        hairBase: 0x000000,
        skin: 0xF2D0B6,
        eyes: 0x000000,
        eyeliner: 0x000000,
        lips: 0x8B0000,
        jacket: 0x000000,
        studs: 0xC0C0C0,
        gloves: 0x000000,
        jeans: 0x1a1a1a,
        boots: 0x2F2F2F,
        badge: FLAGS.ace
      },
      12: {
        mohawk: 0x7A00AC,     // Intersex Glow
        hairBase: 0x000000,
        skin: 0xF2D0B6,
        eyes: 0x000000,
        eyeliner: 0x000000,
        lips: 0x8B0000,
        jacket: 0x000000,
        studs: 0xFFD800,
        gloves: 0x000000,
        jeans: 0x000000,
        boots: 0x000000,
        badge: FLAGS.intersex,
        earring: 0xFFD800
      },
      13: {
        mohawk: 0xB77FDD,     // Genderqueer Cool
        hairBase: 0x000000,
        skin: 0xF2D0B6,
        eyes: 0x000000,
        eyeliner: 0x000000,
        lips: 0x8B0000,
        jacket: 0x111111,
        studs: 0xC0C0C0,
        gloves: 0x000000,
        jeans: 0x222222,
        boots: 0x000000,
        badge: FLAGS.gq
      },
      14: {
        mohawk: 0xFF1493,     // Progress Pride
        hairBase: 0x000000,
        skin: 0xF2D0B6,
        eyes: 0x000000,
        eyeliner: 0x000000,
        lips: 0x8B0000,
        jacket: 0x000000,
        studs: 0xFFFFFF,
        gloves: 0x000000,
        jeans: 0x111111,
        boots: 0x000000,
        badge: FLAGS.progress
      }
    };
    
    return colorSchemes[variation] || colorSchemes[1];
  }

  // NEW: Get tiny character configurations for 10 queer-positive variants
  getTinyCharacterConfig(variant) {
    const configs = {
      1: { // Rainbow Punk
        hair: '#000000',
        mohawk: '#FF1493',
        skin: '#F2D0B6',
        eyes: '#000000',
        liner: '#000000',
        lips: '#8B0000',
        jacket: '#000000',
        jeans: '#2a2a2a',
        boots: '#000000',
        studs: '#C0C0C0',
        badge: this.FLAGS.rainbow,
        earring: '#FFD700'
      },
      2: { // Trans Femme
        hair: '#000000',
        mohawk: '#5BCEFA',
        skin: '#F2D0B6',
        eyes: '#000000',
        liner: '#000000',
        lips: '#8B0000',
        jacket: '#4B0082',
        jeans: '#1a1a1a',
        boots: '#2F4F4F',
        studs: '#C0C0C0',
        badge: this.FLAGS.trans
      },
      3: { // Bi Masc
        hair: '#000000',
        mohawk: '#9B4F96',
        skin: '#F2D0B6',
        eyes: '#000000',
        liner: '#000000',
        lips: '#8B0000',
        jacket: '#111111',
        jeans: '#000000',
        boots: '#8B4513',
        studs: '#DAA520',
        badge: this.FLAGS.bi
      },
      4: { // Pan Cutie
        hair: '#000000',
        mohawk: '#FF218C',
        skin: '#F2D0B6',
        eyes: '#000000',
        liner: '#000000',
        lips: '#8B0000',
        jacket: '#222233',
        jeans: '#111111',
        boots: '#000000',
        studs: '#C0C0C0',
        badge: this.FLAGS.pan
      },
      5: { // Non-Binary Bold
        hair: '#000000',
        mohawk: '#FCF434',
        skin: '#F2D0B6',
        eyes: '#000000',
        liner: '#000000',
        lips: '#8B0000',
        jacket: '#000000',
        jeans: '#2a2a2a',
        boots: '#000000',
        studs: '#E6E6FA',
        badge: this.FLAGS.nonbin
      },
      6: { // Lesbian Riot
        hair: '#000000',
        mohawk: '#D52D00',
        skin: '#F2D0B6',
        eyes: '#000000',
        liner: '#000000',
        lips: '#8B0000',
        jacket: '#2F4F4F',
        jeans: '#000000',
        boots: '#000000',
        studs: '#DAA520',
        badge: this.FLAGS.lesbian
      },
      7: { // Ace Sleek
        hair: '#000000',
        mohawk: '#800080',
        skin: '#F2D0B6',
        eyes: '#000000',
        liner: '#000000',
        lips: '#8B0000',
        jacket: '#000000',
        jeans: '#1a1a1a',
        boots: '#2F2F2F',
        studs: '#C0C0C0',
        badge: this.FLAGS.ace
      },
      8: { // Intersex Glow
        hair: '#000000',
        mohawk: '#7A00AC',
        skin: '#F2D0B6',
        eyes: '#000000',
        liner: '#000000',
        lips: '#8B0000',
        jacket: '#000000',
        jeans: '#000000',
        boots: '#000000',
        studs: '#FFD800',
        badge: this.FLAGS.intersex,
        earring: '#FFD800'
      },
      9: { // Genderqueer Cool
        hair: '#000000',
        mohawk: '#B77FDD',
        skin: '#F2D0B6',
        eyes: '#000000',
        liner: '#000000',
        lips: '#8B0000',
        jacket: '#111111',
        jeans: '#222222',
        boots: '#000000',
        studs: '#C0C0C0',
        badge: this.FLAGS.gq
      },
      10: { // Progress Pride
        hair: '#000000',
        mohawk: '#FF1493',
        skin: '#F2D0B6',
        eyes: '#000000',
        liner: '#000000',
        lips: '#8B0000',
        jacket: '#000000',
        jeans: '#111111',
        boots: '#000000',
        studs: '#FFFFFF',
        badge: this.FLAGS.progress
      }
    };
    
    return configs[variant] || configs[1];
  }

  // Spritesheet export functionality - exports original 20x20 sprites
  exportSpritesheet() {
    // Create hidden 2x5 canvas (each cell 48x48)
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = 5 * 48;  // 5 columns
    exportCanvas.height = 2 * 48; // 2 rows
    const exportCtx = exportCanvas.getContext('2d');
    
    // Ensure pixel-perfect rendering
    exportCtx.imageSmoothingEnabled = false;
    
    // Create temporary graphics for drawing ORIGINAL 20x20 sprites
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 20;  // Original sprite size
    tempCanvas.height = 20;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.imageSmoothingEnabled = false;
    
    // Draw each variant
    for (let variant = 1; variant <= 10; variant++) {
      const col = (variant - 1) % 5;
      const row = Math.floor((variant - 1) / 5);
      
      // Get configuration and create graphics wrapper for ORIGINAL SIZE
      const config = this.getTinyCharacterConfig(variant);
      const mockGraphics = {
        fillStyle: null,
        fillRect: (x, y, w, h) => {
          tempCtx.fillStyle = mockGraphics.fillStyle;
          tempCtx.fillRect(x, y, w, h);
        },
        clear: () => tempCtx.clearRect(0, 0, 20, 20)
      };
      
      // Clear temp canvas
      tempCtx.clearRect(0, 0, 20, 20);
      
      // Draw character using ORIGINAL drawTinyCharacterOriginal function
      this.drawTinyCharacterOriginal(mockGraphics, config, 0, 0);
      
      // Center in 48x48 cell and draw to export canvas
      const cellX = col * 48;
      const cellY = row * 48;
      const centerX = cellX + (48 - 20) / 2;
      const centerY = cellY + (48 - 20) / 2;
      
      exportCtx.drawImage(tempCanvas, centerX, centerY);
    }
    
    // Export as PNG
    exportCanvas.toBlob(blob => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'queer-sprites-2x5.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 'image/png');
    
    console.log('🎨 Exported spritesheet: queer-sprites-2x5.png');
  }

  // Original 20x20 sprite drawing for export
  drawTinyCharacterOriginal(g, cfg, ox = 0, oy = 0) {
    g.clear();
    
    const { hair, mohawk, skin, eyes, liner, lips, jacket, sleeves, jeans, boots, studs, badge, earring } = cfg;

    // Hair block(s) - original 20x20 coordinates
    g.fillStyle(hair);
    g.fillRect(ox + 6, oy + 4, 14, 3);
    g.fillRect(ox + 8, oy + 7, 10, 3);
    if (mohawk) {
      g.fillStyle(mohawk);
      g.fillRect(ox + 10, oy + 0, 6, 3);
      g.fillRect(ox + 11, oy + 3, 4, 2);
    }

    // Face
    g.fillStyle(skin);
    g.fillRect(ox + 8, oy + 8, 12, 6);

    // Eyes + liner
    g.fillStyle(eyes);
    g.fillRect(ox + 10, oy + 9, 2, 1);
    g.fillRect(ox + 16, oy + 9, 2, 1);
    g.fillStyle(liner);
    g.fillRect(ox + 9, oy + 8, 4, 1);
    g.fillRect(ox + 15, oy + 8, 4, 1);

    // Mouth
    g.fillStyle(lips);
    g.fillRect(ox + 12, oy + 12, 3, 1);

    // Torso
    g.fillStyle(jacket);
    g.fillRect(ox + 5, oy + 14, 16, 8);
    g.fillRect(ox + 7, oy + 13, 12, 2);
    if (studs) {
      g.fillStyle(studs);
      g.fillRect(ox + 9, oy + 16, 1, 1);
      g.fillRect(ox + 13, oy + 17, 1, 1);
    }

    // Arms
    g.fillStyle(sleeves || jacket);
    g.fillRect(ox + 2, oy + 15, 4, 6);
    g.fillRect(ox + 20, oy + 15, 4, 6);

    // Bottoms
    g.fillStyle(jeans);
    g.fillRect(ox + 9, oy + 22, 10, 4);
    g.fillStyle(skin);
    g.fillRect(ox + 10, oy + 23, 1, 1);
    g.fillRect(ox + 16, oy + 23, 1, 1);

    // Boots
    g.fillStyle(boots);
    g.fillRect(ox + 8, oy + 26, 5, 2);
    g.fillRect(ox + 15, oy + 26, 5, 2);

    // Sash/armband badge (original size)
    if (badge) this.drawBadgeOriginal(g, ox + 7, oy + 15, badge, true);

    // Earring
    if (earring) {
      g.fillStyle(earring);
      g.fillRect(ox + 18, oy + 10, 1, 1);
    }
  }

  drawBadgeOriginal(g, x, y, stripes, isSash = true) {
    if (isSash) {
      // 3-5 diagonal stripes across torso (original size)
      stripes.forEach((color, i) => {
        g.fillStyle(color);
        g.fillRect(x + i, y + i, 8, 1);
      });
    } else {
      // Armband - horizontal stripes (original size)
      stripes.forEach((color, i) => {
        g.fillStyle(color);
        g.fillRect(x, y + i, 6, 1);
      });
    }
  }

  setupEventHandlers() {
    this.events.on('player-move', (intensity) => {
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

  checkBlockingCollision() {
    // Player position
    const playerCol = this.player.currentCol;
    const playerY = this.player.y;
    
    // Check if there's a bench directly in front of the player (blocking forward movement)
    for (const row of this.rows) {
      // Check if this row is directly above the player (player moving up into it)
      const rowYDiff = row.y - playerY;
      if (rowYDiff < 0 && rowYDiff > -this.TILE * 1.5) { // Row is above player within 1.5 tiles
        // Check if there's a bench in the player's column
        if (row.rowData && row.rowData[playerCol] === this.TILE_BENCH) {
          // Player is about to hit a bench from below - ALWAYS block
          if (!this.isBlocked) {
            this.setBlocked(true);
          }
          return; // Found blocking collision
        }
      }
    }
    
    // No blocking collision found
    if (this.isBlocked) {
      this.setBlocked(false);
    }
  }
  
  canMoveToColumn(targetCol, fromCol) {
    // Block movement to border columns (hedges)
    if (targetCol === 0 || targetCol === 10) {
      console.log('🚫 Cannot enter border hedge columns');
      return false;
    }
    
    // Check if movement to target column is allowed based on bench orientation
    const playerY = this.player.y;
    
    // Check all nearby rows for benches in the target column
    for (const row of this.rows) {
      const rowYDiff = Math.abs(row.y - playerY);
      if (rowYDiff < this.TILE * 0.5) {
        if (row.rowData && row.rowData[targetCol] === this.TILE_BENCH) {
          // Found a bench in the target column
          if (targetCol === 4) {
            // Column 4 bench faces LEFT (←) towards path - can't enter from the left
            if (fromCol < targetCol) {
              console.log('🚫 Cannot enter left-facing bench from behind (left side)');
              return false;
            }
          } else if (targetCol === 6) {
            // Column 6 bench faces RIGHT (→) towards path - can't enter from the right
            if (fromCol > targetCol) {
              console.log('🚫 Cannot enter right-facing bench from behind (right side)');
              return false;
            }
          }
        }
      }
    }
    
    return true; // Movement allowed
  }
  
  setBlocked(blocked) {
    if (blocked === this.isBlocked) return; // No change
    
    this.isBlocked = blocked;
    
    if (blocked) {
      console.log('🚫 BLOCKED by bench - pausing game and music');
      
      // Pause music if it's playing
      if (window.spotifyPlayer && !window.userPausedManually) {
        // Check if music is currently playing
        window.spotifyPlayer.getCurrentState().then(state => {
          if (state && !state.paused) {
            this.wasPlayingBeforeBlock = true;
            window.pauseTrack();
          }
        });
      }
    } else {
      console.log('✅ UNBLOCKED - resuming game and music');
      
      // Resume music if we paused it
      if (this.wasPlayingBeforeBlock && window.spotifyPlayer) {
        window.resumeTrack();
        this.wasPlayingBeforeBlock = false;
      }
    }
  }

  update(_time, delta) {
    // Handle spacebar pause/resume
    if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      this.togglePause();
    }
    
    // Handle C key to cycle player variations
    if (Phaser.Input.Keyboard.JustDown(this.cKey)) {
      this.cyclePlayerVariation();
    }
    
    // Handle X key to export spritesheet
    if (Phaser.Input.Keyboard.JustDown(this.xKey)) {
      this.exportSpritesheet();
    }
    
    // Handle T key to toggle sprite systems
    if (Phaser.Input.Keyboard.JustDown(this.tKey)) {
      this.toggleSpriteSystem();
    }
    
    // If paused, don't update game logic
    if (this.isPaused) {
      return;
    }
    
    // Check for blocking collision
    this.checkBlockingCollision();
    
    // Only scroll if not blocked
    if (!this.isBlocked) {
      // Pixel-perfect scrolling to eliminate dithering
      const dy = this.SCROLL_SPEED * (delta / 1000);
      for (const r of this.rows) {
        r.y += dy;
        // Round to nearest pixel to prevent sub-pixel dithering
        r.y = Math.round(r.y);
      }
      this.recycleRowsIfNeeded();
    }
    
    this.handlePlayerMovement();
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
    const r = { g, rowData, _y: 0 };
    Object.defineProperty(r, 'y', {
      get(){ return this._y; },
      set(v){
        this._y = Math.round(v); // Round to prevent subpixel accumulation
        g.setY(this._y); // Set exact pixel position
      }
    });
    r.y = y;
    this.drawRowGraphics(g, rowData, r); // Pass the row object for position reference
    return r;
  }

  generateRow() {
    const row = new Array(this.COLS);

    // Handle lights on hedge columns (0 and 10)
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

    // Handle benches on median (only on columns 4 or 6, not both in same row)
    let leftBenchThisRow = false;   // Column 4 (median left)
    let rightBenchThisRow = false;  // Column 6 (median right)

    // Left bench logic (column 4 - median left)
    if (this.leftBenchRowsRemaining > 0) {
      // Continue existing bench
      leftBenchThisRow = true;
      this.leftBenchRowsRemaining--;
    } else {
      // Check if we should start a new bench
      this.leftBenchCounter++;
      if (this.leftBenchCounter >= this.leftBenchSpacing) {
        leftBenchThisRow = true;
        this.leftBenchCounter = 0;
        this.leftBenchSpacing = Math.floor(Math.random() * 12) + 8; // 8-19 rows spacing
        this.leftBenchRowsRemaining = this.benchHeight - 1; // Will draw 1 more row after this one
      }
    }

    // Right bench logic (column 6 - median right)
    if (this.rightBenchRowsRemaining > 0) {
      // Continue existing bench
      rightBenchThisRow = true;
      this.rightBenchRowsRemaining--;
    } else {
      // Check if we should start a new bench
      this.rightBenchCounter++;
      if (this.rightBenchCounter >= this.rightBenchSpacing) {
        rightBenchThisRow = true;
        this.rightBenchCounter = 0;
        this.rightBenchSpacing = Math.floor(Math.random() * 12) + 8; // 8-19 rows spacing
        this.rightBenchRowsRemaining = this.benchHeight - 1; // Will draw 1 more row after this one
      }
    }

    // Fill the row based on column positions
    for (let c = 1; c < this.COLS - 1; c++) {
      if (c === 1 || c === 2 || c === 3) {
        // Left path (3 columns wide)
        row[c] = this.TILE_PATH;
      } else if (c === 4) {
        // Median left - potential bench location
        row[c] = leftBenchThisRow ? this.TILE_BENCH : this.TILE_GRASS;
      } else if (c === 5) {
        // Median center - always grass
        row[c] = this.TILE_GRASS;
      } else if (c === 6) {
        // Median right - potential bench location  
        row[c] = rightBenchThisRow ? this.TILE_BENCH : this.TILE_GRASS;
      } else if (c === 7 || c === 8 || c === 9) {
        // Right path (3 columns wide)
        row[c] = this.TILE_PATH;
      }
    }

    return row;
  }

  drawRowGraphics(g, rowData, currentRow) {
    g.clear();
    
    // First, check if we need to draw connecting planks for multi-row benches
    this.drawBenchConnections(g, rowData, currentRow);
    
    for (let c = 0; c < this.COLS; c++) {
      const x = c * this.TILE;
      const tileType = rowData[c];

      // Get base color with bench orientation support
      let baseColor;
      switch (tileType) {
        case this.TILE_HEDGE:
          baseColor = this.COLOR_HEDGE;
          break;
        case this.TILE_LIGHT:
          baseColor = this.COLOR_LIGHT;
          break;
        case this.TILE_GRASS:
          baseColor = this.COLOR_GRASS;
          break;
        case this.TILE_BENCH:
          // Apply orientation-based coloring for benches
          if (c === 4) {
            // Left median bench faces right (→)
            baseColor = this.COLOR_BENCH;
          } else if (c === 6) {
            // Right median bench faces left (←)  
            baseColor = this.COLOR_BENCH;
          } else {
            baseColor = this.COLOR_BENCH;
          }
          break;
        case this.TILE_PATH:
        default:
          baseColor = this.COLOR_PATH;
          break;
      }
      
      // Calculate lighting effect from all nearby rows
      let lightingMultiplier = 0.3; // Dark night by default
      
      // Check lights in all rows (not just nearby) and calculate proper 2D distance
      for (const lightRow of this.rows) {
        if (!lightRow || !lightRow.rowData) continue;
        
        // Calculate vertical distance in tile units
        const verticalDistance = Math.abs((lightRow.y - currentRow.y) / this.TILE);
        if (verticalDistance > 8.5) continue; // Massive range: check within 8 rows
        
        // Check all columns in this row for lights
        for (let lightCol = 0; lightCol < this.COLS; lightCol++) {
          if (lightRow.rowData[lightCol] === this.TILE_LIGHT) {
            const horizontalDistance = Math.abs(c - lightCol);
            const totalDistance = Math.sqrt(horizontalDistance * horizontalDistance + verticalDistance * verticalDistance);
            
            // Ultra-smooth lighting gradient with 8-row range and micro-steps
            if (totalDistance === 0) {
              lightingMultiplier = 1.0; // Full brightness at light source
            } else if (totalDistance <= 0.25) {
              lightingMultiplier = Math.max(lightingMultiplier, 0.99); // Micro step
            } else if (totalDistance <= 0.5) {
              lightingMultiplier = Math.max(lightingMultiplier, 0.96); // Almost full
            } else if (totalDistance <= 0.75) {
              lightingMultiplier = Math.max(lightingMultiplier, 0.93); // Micro step
            } else if (totalDistance <= 1) {
              lightingMultiplier = Math.max(lightingMultiplier, 0.89); // Very bright
            } else if (totalDistance <= 1.25) {
              lightingMultiplier = Math.max(lightingMultiplier, 0.85); // Micro step
            } else if (totalDistance <= 1.5) {
              lightingMultiplier = Math.max(lightingMultiplier, 0.80); // Bright
            } else if (totalDistance <= 1.75) {
              lightingMultiplier = Math.max(lightingMultiplier, 0.76); // Micro step
            } else if (totalDistance <= 2) {
              lightingMultiplier = Math.max(lightingMultiplier, 0.72); // Medium-bright
            } else if (totalDistance <= 2.25) {
              lightingMultiplier = Math.max(lightingMultiplier, 0.68); // Micro step
            } else if (totalDistance <= 2.5) {
              lightingMultiplier = Math.max(lightingMultiplier, 0.64); // Medium
            } else if (totalDistance <= 2.75) {
              lightingMultiplier = Math.max(lightingMultiplier, 0.61); // Micro step
            } else if (totalDistance <= 3) {
              lightingMultiplier = Math.max(lightingMultiplier, 0.58); // Medium-dim
            } else if (totalDistance <= 3.25) {
              lightingMultiplier = Math.max(lightingMultiplier, 0.55); // Micro step
            } else if (totalDistance <= 3.5) {
              lightingMultiplier = Math.max(lightingMultiplier, 0.52); // Dim
            } else if (totalDistance <= 3.75) {
              lightingMultiplier = Math.max(lightingMultiplier, 0.49); // Micro step
            } else if (totalDistance <= 4) {
              lightingMultiplier = Math.max(lightingMultiplier, 0.46); // Dimmer
            } else if (totalDistance <= 4.25) {
              lightingMultiplier = Math.max(lightingMultiplier, 0.44); // Micro step
            } else if (totalDistance <= 4.5) {
              lightingMultiplier = Math.max(lightingMultiplier, 0.42); // More dim
            } else if (totalDistance <= 4.75) {
              lightingMultiplier = Math.max(lightingMultiplier, 0.40); // Micro step
            } else if (totalDistance <= 5) {
              lightingMultiplier = Math.max(lightingMultiplier, 0.38); // Faint
            } else if (totalDistance <= 5.25) {
              lightingMultiplier = Math.max(lightingMultiplier, 0.36); // Micro step
            } else if (totalDistance <= 5.5) {
              lightingMultiplier = Math.max(lightingMultiplier, 0.35); // Very faint
            } else if (totalDistance <= 5.75) {
              lightingMultiplier = Math.max(lightingMultiplier, 0.34); // Micro step
            } else if (totalDistance <= 6) {
              lightingMultiplier = Math.max(lightingMultiplier, 0.33); // Barely lit
            } else if (totalDistance <= 6.25) {
              lightingMultiplier = Math.max(lightingMultiplier, 0.32); // Micro step
            } else if (totalDistance <= 6.5) {
              lightingMultiplier = Math.max(lightingMultiplier, 0.315); // Edge of light
            } else if (totalDistance <= 6.75) {
              lightingMultiplier = Math.max(lightingMultiplier, 0.31); // Micro step
            } else if (totalDistance <= 7) {
              lightingMultiplier = Math.max(lightingMultiplier, 0.308); // Almost night
            } else if (totalDistance <= 7.25) {
              lightingMultiplier = Math.max(lightingMultiplier, 0.306); // Micro step
            } else if (totalDistance <= 7.5) {
              lightingMultiplier = Math.max(lightingMultiplier, 0.304); // Deep twilight
            } else if (totalDistance <= 7.75) {
              lightingMultiplier = Math.max(lightingMultiplier, 0.302); // Micro step
            } else if (totalDistance <= 8) {
              lightingMultiplier = Math.max(lightingMultiplier, 0.301); // Edge of darkness
            }
          }
        }
      }
      
      // Apply lighting to color
      const finalColor = this.applyLighting(baseColor, lightingMultiplier);
      
      // Draw bench with orientation details or regular tile
      if (tileType === this.TILE_BENCH) {
        this.drawBenchTile(g, x, 0, finalColor, c);
      } else {
        // Fill regular tile - no grid lines to prevent flickering
        g.fillStyle(finalColor).fillRect(x, 0, this.TILE, this.TILE + 1);
      }
    }
  }
  
  drawBenchConnections(g, rowData, currentRow) {
    // Check if we need to draw planks connecting to the previous row's bench
    for (let c = 0; c < this.COLS; c++) {
      if (rowData[c] === this.TILE_BENCH) {
        // Look for a bench in the row above this one
        for (const row of this.rows) {
          const verticalDiff = currentRow.y - row.y;
          // Check if this is the row directly above (within one tile)
          if (verticalDiff > 0 && verticalDiff <= this.TILE + 2) {
            if (row.rowData && row.rowData[c] === this.TILE_BENCH) {
              // Found a bench above - draw connecting planks
              const x = c * this.TILE;
              const connectY = row.y - currentRow.y + this.TILE;
              
              // Apply lighting for green metal
              const baseColor = this.COLOR_BENCH;
              const lightingRatio = baseColor / this.COLOR_BENCH;
              const metalGreen = this.applyLighting(this.COLOR_BENCH, lightingRatio);
              const metalDark = this.applyLighting(this.COLOR_BENCH_DARK, lightingRatio);
              
              // Draw metal connecting bars between the two bench rows
              g.fillStyle(metalGreen);
              // Left bar
              g.fillRect(x + 6, connectY - 3, 4, 6);
              // Right bar
              g.fillRect(x + this.TILE - 10, connectY - 3, 4, 6);
              
              // Add edge definition
              g.fillStyle(metalDark);
              g.fillRect(x + 6, connectY - 3, 1, 6);
              g.fillRect(x + this.TILE - 10, connectY - 3, 1, 6);
              
              break; // Found the bench above, stop looking
            }
          }
        }
      }
    }
  }

  // SIMPLE: Weathered park bench (adapted from rotated_bench_sprite.html)
  drawBenchTile(g, x, y, baseColor, column) {
    const tileSize = this.TILE;
    
    // Weathered bench colors from the HTML file
    const weatheredWood = 0x8B7355;
    const woodMid = 0xA0522D;
    const woodLight = 0xDEB887;
    const deepShadow = 0x1a1a1a;
    const metalGreen = 0x556B2F;
    
    // Apply lighting to all colors
    const lightingRatio = baseColor / this.COLOR_BENCH;
    const benchWood = this.applyLighting(weatheredWood, lightingRatio);
    const benchMid = this.applyLighting(woodMid, lightingRatio);
    const benchLight = this.applyLighting(woodLight, lightingRatio);
    const benchMetal = this.applyLighting(metalGreen, lightingRatio);
    const benchShadow = this.applyLighting(deepShadow, lightingRatio);
    
    // Shadow at bottom
    g.fillStyle(benchShadow);
    g.fillRect(x + 6, y + tileSize - 4, 36, 3);
    
    // Metal frame (green painted metal legs)
    g.fillStyle(benchMetal);
    g.fillRect(x + 10, y + 28, 3, 12);
    g.fillRect(x + 35, y + 28, 3, 12);
    g.fillRect(x + 16, y + 37, 16, 2);
    
    // Decorative metal curves/supports
    g.fillStyle(benchMetal);
    if (column === 4) {
      // Left-facing bench - decorative elements on right
      g.fillRect(x + 32, y + 12, 2, 18);
      g.fillRect(x + 30, y + 10, 2, 2);
    } else if (column === 6) {
      // Right-facing bench - decorative elements on left
      g.fillRect(x + 14, y + 12, 2, 18);
      g.fillRect(x + 16, y + 10, 2, 2);
    }
    
    // Weathered wood seat
    g.fillStyle(benchWood);
    g.fillRect(x + 10, y + 25, 28, 5);
    g.fillStyle(benchLight);
    g.fillRect(x + 10, y + 25, 28, 1);
    
    // Wood backrest slats with weathering (4 slats)
    for (let i = 0; i < 4; i++) {
      let slat_x, slat_y, slat_w, slat_h;
      
      if (column === 4) {
        // Left-facing bench - vertical slats on right side
        slat_x = x + 20 + i * 3;
        slat_y = y + 12;
        slat_w = 2;
        slat_h = 16;
      } else if (column === 6) {
        // Right-facing bench - vertical slats on left side  
        slat_x = x + 18 + i * 3;
        slat_y = y + 12;
        slat_w = 2;
        slat_h = 16;
      } else {
        // Default horizontal
        slat_x = x + 15 + i * 6;
        slat_y = y + 12;
        slat_w = 4;
        slat_h = 16;
      }
      
      g.fillStyle(benchWood);
      g.fillRect(slat_x, slat_y, slat_w, slat_h);
      g.fillStyle(benchLight);
      g.fillRect(slat_x, slat_y, slat_w, 1);
      
      // Weathering spots
      g.fillStyle(benchMid);
      g.fillRect(slat_x + 1, slat_y + 6, 1, 1);
      g.fillRect(slat_x + (slat_w > 2 ? 2 : 0), slat_y + 10, 1, 1);
    }
    
    // Armrests with wear
    g.fillStyle(benchWood);
    if (column === 4) {
      g.fillRect(x + 8, y + 22, 7, 3);
      g.fillStyle(benchLight);
      g.fillRect(x + 8, y + 22, 7, 1);
    } else if (column === 6) {
      g.fillRect(x + 33, y + 22, 7, 3);
      g.fillStyle(benchLight);
      g.fillRect(x + 33, y + 22, 7, 1);
    } else {
      g.fillRect(x + 8, y + 22, 7, 3);
      g.fillRect(x + 33, y + 22, 7, 3);
      g.fillStyle(benchLight);
      g.fillRect(x + 8, y + 22, 7, 1);
      g.fillRect(x + 33, y + 22, 7, 1);
    }
  }

  applyLighting(color, multiplier) {
    // Extract RGB from hex color
    const r = (color >> 16) & 0xFF;
    const g = (color >> 8) & 0xFF;
    const b = color & 0xFF;
    
    // Apply lighting multiplier
    const newR = Math.floor(r * multiplier);
    const newG = Math.floor(g * multiplier);
    const newB = Math.floor(b * multiplier);
    
    // Convert back to hex
    return (newR << 16) | (newG << 8) | newB;
  }

  recycleRowsIfNeeded() {
    const bottomLimit = this.VIEW_H + this.TILE * 2;
    let topY = this.rows[0].y;
    for (let i = 1; i < this.rows.length; i++) if (this.rows[i].y < topY) topY = this.rows[i].y;

    for (const r of this.rows) {
      if (r.y >= bottomLimit) {
        r.y = topY - this.TILE;
        r.rowData = this.generateRow();
        this.drawRowGraphics(r.g, r.rowData, r); // Pass the row object for position reference
        topY = r.y;
        
        // Update lighting for nearby rows when a new row is created
        this.updateNearbyRowLighting(r);
      }
    }
  }
  
  updateNearbyRowLighting(changedRow) {
    // Redraw rows within 8 tiles of the changed row to update lighting
    for (const row of this.rows) {
      if (row === changedRow) continue;
      const verticalDistance = Math.abs(row.y - changedRow.y) / this.TILE;
      if (verticalDistance <= 8.5) {
        this.drawRowGraphics(row.g, row.rowData, row);
      }
    }
  }

  handlePlayerMovement() {
    const leftPressed = this.cursors.left.isDown || this.aKey.isDown || this.mobileControls.leftPressed;
    const rightPressed = this.cursors.right.isDown || this.dKey.isDown || this.mobileControls.rightPressed;

    const leftJustPressed = leftPressed && !this.player.lastKeys.left;
    const rightJustPressed = rightPressed && !this.player.lastKeys.right;

    this.player.lastKeys.left = leftPressed;
    this.player.lastKeys.right = rightPressed;

    let hasMoved = false;

    // Only allow horizontal movement, and only on discrete key presses
    if (leftJustPressed && this.player.currentCol > 0) {
      const targetCol = this.player.currentCol - 1;
      if (this.canMoveToColumn(targetCol, this.player.currentCol)) {
        this.player.currentCol = targetCol;
        this.player.x = Math.round((this.player.currentCol + 0.5) * this.TILE);
        hasMoved = true;
      }
    } else if (rightJustPressed && this.player.currentCol < this.COLS - 1) {
      const targetCol = this.player.currentCol + 1;
      if (this.canMoveToColumn(targetCol, this.player.currentCol)) {
        this.player.currentCol = targetCol;
        this.player.x = Math.round((this.player.currentCol + 0.5) * this.TILE);
        hasMoved = true;
      }
    }

    // If player moved left or right while blocked, check if they can unblock
    if (hasMoved && this.isBlocked) {
      console.log('🔄 Player moved while blocked, checking for unblock...');
      // The collision check in the next update cycle will handle unblocking
    }

    // Light tiles no longer collected - they act as light sources
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    
    if (this.isPaused) {
      console.log('🎮 GAME PAUSED - Spacebar pressed');
      
      // Pause Spotify if playing
      if (window.spotifyPlayer && !window.userPausedManually) {
        console.log('🎵 Pausing Spotify due to game pause');
        window.pauseTrack();
      }
    } else {
      console.log('🎮 GAME RESUMED - Spacebar pressed');
      
      // Resume Spotify if we paused it
      if (window.spotifyPlayer && window.userPausedManually) {
        console.log('🎵 Resuming Spotify due to game resume');
        window.resumeTrack();
      }
    }
  }

  cyclePlayerVariation() {
    if (this.useTinySprites) {
      // Cycle through tiny sprite variations 1-10
      this.playerVariation = (this.playerVariation % 10) + 1;
      const config = this.getTinyCharacterConfig(this.playerVariation);
      this.drawTinyCharacter(this.player, config, 0, 0);
      
      const tinyVariationNames = {
        1: '🌈 Rainbow Punk',
        2: '🏳️‍⚧️ Trans Femme',
        3: '💗 Bi Masc',
        4: '💖 Pan Cutie',
        5: '💛 Non-Binary Bold',
        6: '🧡 Lesbian Riot',
        7: '🖤 Ace Sleek',
        8: '💛 Intersex Glow',
        9: '💜 Genderqueer Cool',
        10: '🏳️‍🌈 Progress Pride'
      };
      
      console.log(`🎨 [TINY] Switched to variation ${this.playerVariation}: ${tinyVariationNames[this.playerVariation]}`);
    } else {
      // Cycle through original variations 1-14
      this.playerVariation = (this.playerVariation % 14) + 1;
      this.drawCharacter(this.player, 0, 0, this.playerVariation);
      
      const variationNames = {
        1: '🎸 Pink Mohawk Punk',
        2: '💙 Electric Blue Punk', 
        3: '☢️ Toxic Green Punk',
        4: '👑 Royal Purple Punk',
        5: '🌈 Rainbow Punk',
        6: '🏳️‍⚧️ Trans Femme',
        7: '💗 Bi Masc',
        8: '💖 Pan Cutie',
        9: '💛 Non-Binary Bold',
        10: '🧡 Lesbian Riot',
        11: '🖤 Ace Sleek',
        12: '💛 Intersex Glow',
        13: '💜 Genderqueer Cool',
        14: '🏳️‍🌈 Progress Pride'
      };
      
      console.log(`🎨 [LARGE] Switched to variation ${this.playerVariation}: ${variationNames[this.playerVariation]}`);
    }
  }

  toggleSpriteSystem() {
    this.useTinySprites = !this.useTinySprites;
    
    if (this.useTinySprites) {
      // Switch to tiny sprites - cap variation at 10
      if (this.playerVariation > 10) this.playerVariation = 1;
      const config = this.getTinyCharacterConfig(this.playerVariation);
      this.drawTinyCharacter(this.player, config, 0, 0);
      console.log('🔄 Switched to TINY (20x20) sprite system');
    } else {
      // Switch to large sprites
      this.drawCharacter(this.player, 0, 0, this.playerVariation);
      console.log('🔄 Switched to LARGE (38x38) sprite system');
    }
  }

}

const GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  width: 528,   // Base width: 11 * 48px
  height: 500,  // Base height
  backgroundColor: 0x363e48,
  physics: { default: 'arcade' },
  scale: { 
    mode: Phaser.Scale.FIT,  // Scale to fit container while maintaining aspect ratio
    autoCenter: Phaser.Scale.CENTER_BOTH,  // Center in container
    width: 528,
    height: 500
  },
  render: { 
    pixelArt: true, 
    antialias: false, 
    roundPixels: true,
    preserveDrawingBuffer: true 
  },
  scene: GameScene
};