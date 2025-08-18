// Main Application Controller
class GameApp {
  constructor() {
    this.game = null;
    this.spotifyAuth = new SpotifyAuth();
    this.spotifyPlayer = null;
    this.selectedTrack = null;
    this.musicEnabled = false;
  }

  async init() {
    // Load Spotify configuration first
    const configLoaded = await this.spotifyAuth.loadConfig();
    if (!configLoaded) {
      console.warn('Spotify configuration not available, music features disabled');
      this.startGame();
      return;
    }
    // Check for callback from Spotify auth
    if (window.location.search.includes('code=')) {
      const success = await this.spotifyAuth.handleCallback();
      if (success) {
        await this.initializeSpotify();
        this.showTrackSelector();
        return;
      }
    }

    // Check for existing authentication
    if (this.spotifyAuth.getStoredToken()) {
      await this.initializeSpotify();
      this.showTrackSelector();
      return;
    }

    // Show login option
    this.showSpotifyLoginOption();
  }

  showSpotifyLoginOption() {
    const overlay = document.getElementById('spotify-overlay');
    overlay.classList.remove('hidden');

    // Setup event listeners
    document.getElementById('spotify-login').addEventListener('click', () => {
      this.spotifyAuth.login();
    });

    document.getElementById('skip-spotify').addEventListener('click', () => {
      overlay.classList.add('hidden');
      this.startGame();
    });
  }

  async initializeSpotify() {
    try {
      // Check user capabilities
      const userCaps = await this.spotifyAuth.checkUserCapabilities();

      if (!userCaps.isPremium) {
        this.showPremiumRequired();
        return;
      }

      // Initialize Spotify player
      this.spotifyPlayer = new SpotifyPlayer(this.spotifyAuth.accessToken);
      await this.spotifyPlayer.initialize();
      
      // Make player globally accessible for debugging
      window.spotifyPlayer = this.spotifyPlayer;
      
      // Add external logging for debugging
      this.addExternalLogging();
      
      this.musicEnabled = true;
      console.log('Spotify integration initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Spotify:', error);
      this.showSpotifyError();
    }
  }

  // Add external logging for debugging browser issues
  addExternalLogging() {
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    
    const logData = [];
    
    console.log = (...args) => {
      originalLog(...args);
      logData.push({type: 'log', timestamp: Date.now(), data: args});
      this.sendToExternalLogger('log', args);
    };
    
    console.error = (...args) => {
      originalError(...args);
      logData.push({type: 'error', timestamp: Date.now(), data: args});
      this.sendToExternalLogger('error', args);
    };
    
    console.warn = (...args) => {
      originalWarn(...args);
      logData.push({type: 'warn', timestamp: Date.now(), data: args});
      this.sendToExternalLogger('warn', args);
    };
    
    // Store logs locally as backup
    window.debugLogs = logData;
  }
  
  // Send logs to external service (replace with your Cloudflare endpoint)
  async sendToExternalLogger(level, data) {
    try {
      // Uncomment and configure for external logging
      /*
      await fetch('https://your-cloudflare-worker.workers.dev/log', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          level,
          data: JSON.stringify(data),
          browser: navigator.userAgent,
          timestamp: Date.now(),
          url: window.location.href
        })
      });
      */
    } catch (error) {
      // Silent fail to avoid recursion
    }
  }

  showPremiumRequired() {
    const overlay = document.getElementById('spotify-overlay');
    const modal = overlay.querySelector('.spotify-modal');

    modal.innerHTML = `
      <h3>🎵 Spotify Premium Required</h3>
      <p>Music playback requires a Spotify Premium subscription.</p>
      <p>You can still play the game without music!</p>
      <button id="continue-without-music" class="btn-skip">Continue Without Music</button>
      <a href="https://www.spotify.com/premium/" target="_blank" class="btn-spotify">Get Spotify Premium</a>
    `;

    document.getElementById('continue-without-music').addEventListener('click', () => {
      overlay.classList.add('hidden');
      this.startGame();
    });
  }

  showSpotifyError() {
    const overlay = document.getElementById('spotify-overlay');
    const modal = overlay.querySelector('.spotify-modal');

    modal.innerHTML = `
      <h3>❌ Connection Failed</h3>
      <p>Unable to connect to Spotify. You can still play the game!</p>
      <button id="retry-spotify" class="btn-spotify">Try Again</button>
      <button id="continue-without-music" class="btn-skip">Continue Without Music</button>
    `;

    document.getElementById('retry-spotify').addEventListener('click', () => {
      location.reload();
    });

    document.getElementById('continue-without-music').addEventListener('click', () => {
      overlay.classList.add('hidden');
      this.startGame();
    });
  }

  showTrackSelector() {
    // Hide login overlay
    document.getElementById('spotify-overlay').classList.add('hidden');

    // Show track selector
    const selector = document.getElementById('track-selector');
    selector.classList.remove('hidden');

    this.setupTrackSearch();
  }

  setupTrackSearch() {
    const searchInput = document.getElementById('track-search');
    const searchBtn = document.getElementById('search-btn');
    const resultsDiv = document.getElementById('search-results');
    const startBtn = document.getElementById('start-game');

    // Search functionality
    const performSearch = async () => {
      const query = searchInput.value.trim();
      if (!query) return;

      searchBtn.textContent = 'Searching...';
      searchBtn.disabled = true;

      try {
        const results = await this.spotifyAuth.searchTracks(query, 10);
        this.displaySearchResults(results.tracks.items, resultsDiv);
      } catch (error) {
        console.error('Search failed:', error);
        resultsDiv.innerHTML = '<p style="color: #ff6b6b;">Search failed. Please try again.</p>';
      } finally {
        searchBtn.textContent = 'Search';
        searchBtn.disabled = false;
      }
    };

    searchBtn.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        performSearch();
      }
    });

    // Start game button
    startBtn.addEventListener('click', () => {
      if (this.selectedTrack) {
        document.getElementById('track-selector').classList.add('hidden');
        this.startGameWithMusic();
      }
    });

    // Pre-populate with some popular gaming tracks
    setTimeout(() => {
      searchInput.value = 'electronic gaming music';
      performSearch();
    }, 500);
  }

  displaySearchResults(tracks, container) {
    if (!tracks || tracks.length === 0) {
      container.innerHTML = '<p style="color: #b3b3b3;">No tracks found. Try a different search term.</p>';
      return;
    }

    container.innerHTML = tracks.map(track => `
      <div class="track-item" data-track-uri="${track.uri}" data-track-id="${track.id}">
        <img src="${track.album.images[2]?.url || track.album.images[0]?.url || ''}" 
             alt="${track.name}" onerror="this.style.display='none'">
        <div class="track-details">
          <div class="track-name">${track.name}</div>
          <div class="track-artist">${track.artists.map(a => a.name).join(', ')}</div>
        </div>
      </div>
    `).join('');

    // Add click handlers to track items
    container.querySelectorAll('.track-item').forEach(item => {
      item.addEventListener('click', () => {
        // Remove previous selection
        container.querySelectorAll('.track-item').forEach(i => i.classList.remove('selected'));
        
        // Select this item
        item.classList.add('selected');
        
        // Store selected track
        this.selectedTrack = {
          uri: item.dataset.trackUri,
          id: item.dataset.trackId,
          name: item.querySelector('.track-name').textContent,
          artist: item.querySelector('.track-artist').textContent,
          image: item.querySelector('img').src
        };

        // Enable start button
        document.getElementById('start-game').disabled = false;
      });
    });
  }

  async startGameWithMusic() {
    if (!this.spotifyPlayer || !this.selectedTrack) {
      this.startGame();
      return;
    }

    try {
      // Start playing the selected track
      const success = await this.spotifyPlayer.playTrack(this.selectedTrack.uri);
      
      if (success) {
        console.log('Started playing:', this.selectedTrack.name);
      } else {
        console.warn('Failed to start playback, continuing without music');
      }
    } catch (error) {
      console.error('Playback failed:', error);
    }

    this.startGame();
  }

  startGame() {
    // Initialize the Phaser game
    this.game = new Phaser.Game(GameConfig);

    // Pass Spotify player to game scene if available
    this.game.events.once('ready', () => {
      const gameScene = this.game.scene.getScene('GameScene');
      if (gameScene && this.spotifyPlayer) {
        gameScene.setSpotifyPlayer(this.spotifyPlayer);
      }
    });

    // Setup music controls if music is enabled
    if (this.musicEnabled && this.spotifyPlayer) {
      this.setupMusicControls();
    }
  }

  setupMusicControls() {
    const playPauseBtn = document.getElementById('play-pause');
    const volumeToggleBtn = document.getElementById('volume-toggle');

    playPauseBtn.addEventListener('click', () => {
      this.spotifyPlayer.togglePlayback();
    });

    volumeToggleBtn.addEventListener('click', () => {
      if (this.spotifyPlayer.volume > 0) {
        this.spotifyPlayer.setVolume(0);
        volumeToggleBtn.textContent = '🔇';
      } else {
        this.spotifyPlayer.setVolume(0.7);
        volumeToggleBtn.textContent = '🔊';
      }
    });
  }
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new GameApp();
  app.init();
});

// Handle Spotify SDK ready callback
window.onSpotifyWebPlaybackSDKReady = () => {
  console.log('Spotify Web Playback SDK ready');
  // SDK is now available for use
};