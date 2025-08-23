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
    this.COLOR_BENCH = 0x8B4513; // Brown color for benches

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
    this.spaceKey = this.input.keyboard.addKey('SPACE');
    
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

  checkBlockingCollision() {
    // Player position
    const playerCol = this.player.currentCol;
    const playerY = this.player.y;
    
    // Check if there's a bench directly in front of the player
    for (const row of this.rows) {
      // Check if this row is close to the player vertically (within one tile)
      const rowYDiff = Math.abs(row.y - playerY);
      if (rowYDiff < this.TILE * 2) { // Check rows near player
        // Check if there's a bench in the player's column
        if (row.rowData && row.rowData[playerCol] === this.TILE_BENCH) {
          // Player is about to hit a bench
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
    
    for (let c = 0; c < this.COLS; c++) {
      const x = c * this.TILE;
      const tileType = rowData[c];

      // Get base color
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
          baseColor = this.COLOR_BENCH;
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
      
      // Fill the tile - no grid lines to prevent flickering
      g.fillStyle(finalColor).fillRect(x, 0, this.TILE, this.TILE + 1);
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
      this.player.currentCol--;
      this.player.x = Math.round((this.player.currentCol + 0.5) * this.TILE);
      hasMoved = true;
    } else if (rightJustPressed && this.player.currentCol < this.COLS - 1) {
      this.player.currentCol++;
      this.player.x = Math.round((this.player.currentCol + 0.5) * this.TILE);
      hasMoved = true;
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
  render: { pixelArt: true, antialias: false, roundPixels: true },
  scene: GameScene
};