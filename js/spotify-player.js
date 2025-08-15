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

```
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
```

}

// Create and configure the Spotify player
createPlayer() {
this.player = new Spotify.Player({
name: ‘GrouchoBarks Game Player’,
getOAuthToken: (cb) => {
cb(this.accessToken);
},
volume: this.volume
});

```
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

// Player state changes
this.player.addListener('player_state_changed', (state) => {
  if (!state) return;

  this.currentTrack = state.track_window.current_track;
  this.isPlaying = !state.paused;
  
  // Update UI
  this.updateNowPlayingUI();
});

// Connect the player
this.player.connect();
```

}

// Transfer playback to this device
async transferPlaybackToDevice() {
if (!this.deviceId) return;

```
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
```

}

// Play a specific track
async playTrack(trackUri) {
if (!this.isReady || !this.deviceId) {
console.error(‘Player not ready’);
return false;
}

```
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
    return true;
  } else {
    console.error('Failed to play track:', response.status);
    return false;
  }
} catch (error) {
  console.error('Error playing track:', error);
  return false;
}
```

}

// Toggle play/pause
async togglePlayback() {
if (!this.player) return;

```
try {
  await this.player.togglePlay();
} catch (error) {
  console.error('Error toggling playback:', error);
}
```

}

// Set volume (0.0 to 1.0)
async setVolume(volume) {
if (!this.player) return;

```
this.volume = Math.max(0, Math.min(1, volume));

try {
  await this.player.setVolume(this.volume);
} catch (error) {
  console.error('Error setting volume:', error);
}
```

}

// Adjust volume based on game events
adjustVolumeForGameEvent(eventType, intensity = 1.0) {
if (!this.player) return;

```
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
```

}

// Update the now playing UI
updateNowPlayingUI() {
const musicControls = document.getElementById(‘music-controls’);
const trackImage = document.getElementById(‘track-image’);
const trackName = document.getElementById(‘track-name’);
const trackArtist = document.getElementById(‘track-artist’);
const playPauseBtn = document.getElementById(‘play-pause’);

```
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
```

}

// Disconnect the player
disconnect() {
if (this.player) {
this.player.disconnect();
}
}
}
