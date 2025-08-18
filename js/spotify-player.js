// Spotify Web Playback SDK Controller
class SpotifyPlayer {
  constructor(accessToken) {
    this.accessToken = accessToken;
    this.player = null;
    this.deviceId = null;
    this.currentTrack = null;
    this.isReady = false;
    this.isPlaying = false;
    this.volume = 0.7;
    this.userHasInteracted = false;
    this.pauseRequested = false;
    this.browser = this.detectBrowser();
  }

  detectBrowser() {
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('chrome') && !userAgent.includes('edg')) return 'chrome';
    if (userAgent.includes('safari') && !userAgent.includes('chrome')) return 'safari';
    if (userAgent.includes('firefox')) return 'firefox';
    return 'other';
  }

  // Initialize the Spotify Web Playback SDK
  async initialize() {
    return new Promise((resolve, reject) => {
      // Check if SDK is already loaded
      if (window.Spotify && window.Spotify.Player) {
        this.createPlayer();
        resolve();
        return;
      }

      // Wait for SDK to load
      const checkSpotify = () => {
        if (window.Spotify && window.Spotify.Player) {
          this.createPlayer();
          resolve();
        } else {
          setTimeout(checkSpotify, 100);
        }
      };

      // Start checking
      checkSpotify();

      // Timeout after 10 seconds
      setTimeout(() => {
        if (!this.isReady) {
          reject(new Error('Spotify SDK failed to load'));
        }
      }, 10000);
    });
  }

  // Create and configure the Spotify player
  createPlayer() {
    this.player = new Spotify.Player({
      name: 'GrouchoBarks Game Player',
      getOAuthToken: (cb) => {
        cb(this.accessToken);
      },
      volume: this.volume
    });

    // Error handling
    this.player.addListener('initialization_error', ({ message }) => {
      console.error('Spotify initialization error:', message);
    });

    this.player.addListener('authentication_error', ({ message }) => {
      console.error('Spotify authentication error:', message);
    });

    this.player.addListener('account_error', ({ message }) => {
      console.error('Spotify account error:', message);
    });

    this.player.addListener('playback_error', ({ message }) => {
      console.error('Spotify playback error:', message);
    });

    // Ready event
    this.player.addListener('ready', ({ device_id }) => {
      console.log('Spotify player ready with Device ID:', device_id);
      this.deviceId = device_id;
      this.isReady = true;
      this.transferPlaybackToDevice();
    });

    // Player state changes - enhanced for browser compatibility
    this.player.addListener('player_state_changed', (state) => {
      if (!state) return;

      this.currentTrack = state.track_window.current_track;
      const previousPlaying = this.isPlaying;
      this.isPlaying = !state.paused;
      
      // Firefox-specific: prevent auto-resume after manual pause
      if (this.browser === 'firefox' && this.pauseRequested && this.isPlaying) {
        console.log('Firefox: Preventing auto-resume after manual pause');
        this.player.pause();
        return;
      }
      
      this.pauseRequested = false;
      
      // Update UI
      this.updateNowPlayingUI();
    });

    // Connect the player
    this.player.connect();
  }

  // Transfer playback to this device
  async transferPlaybackToDevice() {
    if (!this.deviceId) return;

    try {
      await fetch('https://api.spotify.com/v1/me/player', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          device_ids: [this.deviceId],
          play: false
        })
      });
    } catch (error) {
      console.error('Failed to transfer playback:', error);
    }
  }

  // Play a specific track with browser-specific handling
  async playTrack(trackUri) {
    if (!this.isReady || !this.deviceId) {
      console.error('Player not ready');
      return false;
    }

    // For Chrome/Safari, ensure user interaction before playing
    if ((this.browser === 'chrome' || this.browser === 'safari') && !this.userHasInteracted) {
      console.warn('User interaction required for audio playback');
      this.showUserInteractionPrompt();
      return false;
    }

    try {
      const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${this.deviceId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          uris: [trackUri]
        })
      });

      if (response.ok) {
        this.isPlaying = true;
        this.userHasInteracted = true;
        return true;
      } else {
        console.error('Failed to play track:', response.status);
        return false;
      }
    } catch (error) {
      console.error('Error playing track:', error);
      return false;
    }
  }

  // Enhanced toggle playback with browser-specific fixes
  async togglePlayback() {
    if (!this.player) return;

    try {
      if (this.isPlaying) {
        // Mark that pause was requested by user
        this.pauseRequested = true;
        console.log(`${this.browser}: Manual pause requested`);
      }
      
      this.userHasInteracted = true;
      await this.player.togglePlay();
    } catch (error) {
      console.error('Error toggling playback:', error);
    }
  }

  // Show prompt for user interaction (Chrome/Safari)
  showUserInteractionPrompt() {
    const prompt = document.createElement('div');
    prompt.id = 'interaction-prompt';
    prompt.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #1DB954;
      color: white;
      padding: 20px;
      border-radius: 8px;
      z-index: 1000;
      text-align: center;
    `;
    prompt.innerHTML = `
      <p>Click to enable audio playback</p>
      <button onclick="this.parentElement.remove(); window.spotifyPlayer.userHasInteracted = true;">Enable Audio</button>
    `;
    document.body.appendChild(prompt);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (prompt.parentElement) {
        prompt.remove();
      }
    }, 5000);
  }

  // Set volume (0.0 to 1.0)
  async setVolume(volume) {
    if (!this.player) return;

    this.volume = Math.max(0, Math.min(1, volume));

    try {
      await this.player.setVolume(this.volume);
    } catch (error) {
      console.error('Error setting volume:', error);
    }
  }

  // Adjust volume based on game events
  adjustVolumeForGameEvent(eventType, intensity = 1.0) {
    if (!this.player) return;

    let volumeMultiplier = 1.0;

    switch (eventType) {
      case 'player_move':
        // Slight volume boost when moving
        volumeMultiplier = 1.0 + (intensity * 0.1);
        break;
      case 'item_collect':
        // Brief volume boost for collecting items
        volumeMultiplier = 1.2;
        setTimeout(() => this.setVolume(this.volume), 200);
        break;
      case 'player_damage':
        // Brief volume dip for taking damage
        volumeMultiplier = 0.6;
        setTimeout(() => this.setVolume(this.volume), 300);
        break;
      case 'level_complete':
        // Volume boost for level completion
        volumeMultiplier = 1.3;
        setTimeout(() => this.setVolume(this.volume), 1000);
        break;
      default:
        return;
    }

    const targetVolume = this.volume * volumeMultiplier;
    this.setVolume(Math.max(0, Math.min(1, targetVolume)));
  }

  // Update the now playing UI
  updateNowPlayingUI() {
    const musicControls = document.getElementById('music-controls');
    const trackImage = document.getElementById('track-image');
    const trackName = document.getElementById('track-name');
    const trackArtist = document.getElementById('track-artist');
    const playPauseBtn = document.getElementById('play-pause');

    if (!this.currentTrack) {
      musicControls.classList.add('hidden');
      return;
    }

    // Show controls
    musicControls.classList.remove('hidden');

    // Update track info
    trackImage.src = this.currentTrack.album.images[0]?.url || '';
    trackName.textContent = this.currentTrack.name;
    trackArtist.textContent = this.currentTrack.artists.map(a => a.name).join(', ');

    // Update play/pause button
    playPauseBtn.textContent = this.isPlaying ? '⏸️' : '▶️';
  }

  // Disconnect the player
  disconnect() {
    if (this.player) {
      this.player.disconnect();
    }
  }
}