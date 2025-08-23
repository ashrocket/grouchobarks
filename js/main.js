// Main Spotify integration and game initialization
// Version and browser info
const MUSIC_VERSION = '2.1.4';
const GAME_VERSION = '1.2.6';
const BROWSER_INFO = {
  userAgent: navigator.userAgent,
  isMobile: false, // Temporarily disabled: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent),
  isIOS: /iPhone|iPad|iPod/i.test(navigator.userAgent),
  isAndroid: /Android/i.test(navigator.userAgent),
  browser: (() => {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('chrome') && !ua.includes('edg')) return 'chrome';
    if (ua.includes('safari') && !ua.includes('chrome')) return 'safari';
    if (ua.includes('firefox')) return 'firefox';
    return 'other';
  })()
};

// External logging setup
const LOG_ENDPOINT = `${window.location.origin}/log`; // Cloudflare Pages Function
let logBuffer = [];

async function sendToCloudflare(level, message, data = {}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    musicVersion: MUSIC_VERSION,
    gameVersion: GAME_VERSION,
    level,
    message,
    browser: BROWSER_INFO,
    url: window.location.href,
    data
  };
  
  logBuffer.push(logEntry);
  
  // Send to external service (enable when ready)
  try {
    await fetch(LOG_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logEntry)
    });
  } catch (error) {
    // Silent fail - store locally instead
    localStorage.setItem('debug_logs', JSON.stringify(logBuffer.slice(-50))); // Keep last 50 entries
  }
}

// Define updateStatus early with logging (console only, no UI)
function updateStatus(message, isError = false) {
  console.log(isError ? `❌ ${message}` : `✅ ${message}`);
  
  // Send to external logging
  sendToCloudflare(isError ? 'error' : 'info', message);
}

// Spotify credentials
const CLIENT_ID = 'aa16f7f72c04485fb93d86d2f7ee33d1';
const REDIRECT_URI = 'https://frattypipeline.grouchobarks.bandmusicgames.party';
const SCOPES = 'user-read-private user-read-email user-modify-playback-state user-read-playback-state streaming';
const TEST_TRACK_URI = 'spotify:track:33lVSu93J91BDmhfRT7iTA';

let accessToken = null;
let spotifyPlayer = null;
let deviceId = null;

// Enhanced state tracking - GLOBAL scope so all functions can access
let userPausedManually = false;
let lastKnownPosition = 0;
let pauseRequestTime = 0;
let manualPauseProtectionTime = 0;

// UI Elements - with null checks
const spotifyLoginSection = document.getElementById('spotify-login-section');
const musicBar = document.getElementById('music-bar');
const spotifyLoginBtn = document.getElementById('spotify-login');
const skipSpotifyBtn = document.getElementById('skip-spotify');
const playBtn = document.getElementById('play-btn');
const pauseBtn = document.getElementById('pause-btn');
const resumeBtn = document.getElementById('resume-btn');

// Debug: Log which elements were found
console.log('UI Elements found:', {
  spotifyLoginSection: !!spotifyLoginSection,
  musicBar: !!musicBar,
  spotifyLoginBtn: !!spotifyLoginBtn,
  skipSpotifyBtn: !!skipSpotifyBtn,
  playBtn: !!playBtn,
  pauseBtn: !!pauseBtn,
  resumeBtn: !!resumeBtn
});

function generateRandomString(length) {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return values.reduce((acc, x) => acc + possible[x % possible.length], "");
}

async function sha256(plain) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return window.crypto.subtle.digest('SHA-256', data);
}

function base64encode(input) {
  return btoa(String.fromCharCode(...new Uint8Array(input)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

async function loginWithSpotify() {
  updateStatus('🎵 Starting login...');
  
  const codeVerifier = generateRandomString(64);
  const hashed = await sha256(codeVerifier);
  const codeChallenge = base64encode(hashed);
  
  localStorage.setItem('code_verifier', codeVerifier);
  
  const authUrl = new URL('https://accounts.spotify.com/authorize');
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('client_id', CLIENT_ID);
  authUrl.searchParams.append('scope', SCOPES);
  authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.append('code_challenge_method', 'S256');
  authUrl.searchParams.append('code_challenge', codeChallenge);
  
  window.location.href = authUrl.toString();
}

async function handleCallback() {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  const error = urlParams.get('error');
  
  // Clear the URL immediately to prevent loops
  window.history.replaceState({}, document.title, window.location.pathname);
  
  if (error) {
    updateStatus(`❌ ${error}`, true);
    showPlayerOnly();
    return;
  }
  
  if (code) {
    updateStatus('🔑 Getting token...');
    const success = await exchangeCodeForToken(code);
    if (success) {
      updateStatus('✅ Connected! Initializing player...');
      getUserInfo();
    } else {
      updateStatus('❌ Login failed');
      showSpotifyLoginOption();
    }
  }
}

async function exchangeCodeForToken(code) {
  const codeVerifier = localStorage.getItem('code_verifier');
  
  if (!codeVerifier) {
    updateStatus('❌ No code verifier found', true);
    return false;
  }
  
  try {
    updateStatus('🔄 Exchanging code for token...');
    
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: REDIRECT_URI,
        client_id: CLIENT_ID,
        code_verifier: codeVerifier
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Token failed: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    accessToken = data.access_token;
    
    sessionStorage.setItem('spotify_access_token', accessToken);
    localStorage.removeItem('code_verifier');
    
    updateStatus('✅ Token OK');
    return true;
    
  } catch (error) {
    updateStatus(`❌ ${error.message}`, true);
    return false;
  }
}

async function getUserInfo() {
  try {
    const response = await fetch('https://api.spotify.com/v1/me', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    
    if (!response.ok) throw new Error(`User info failed: ${response.status}`);
    
    const user = await response.json();
    const userNameEl = document.getElementById('user-name');
    if (userNameEl) {
      userNameEl.textContent = user.display_name || 'User';
    }
    
    if (user.product === 'premium') {
      updateStatus('🎵 Initializing...');
      if (spotifyLoginSection) spotifyLoginSection.classList.add('hidden');
      if (musicBar) musicBar.classList.remove('hidden');
      if (window.initializeSpotifyPlayer) {
        window.initializeSpotifyPlayer();
      } else {
        console.warn('initializeSpotifyPlayer not available yet');
      }
    } else {
      updateStatus('⚠️ Premium required', true);
      showPlayerOnly();
    }
    
  } catch (error) {
    updateStatus(`❌ ${error.message}`, true);
    showPlayerOnly();
  }
}

// Make initializeSpotifyPlayer globally accessible
window.initializeSpotifyPlayer = function() {
  console.log('initializeSpotifyPlayer() called!');
  if (!window.Spotify?.Player) {
    updateStatus('⏳ SDK loading...', true);
    return;
  }
  
  spotifyPlayer = new Spotify.Player({
    name: 'GrouchoBarks Player',
    getOAuthToken: cb => cb(accessToken),
    volume: 0.8
  });
  
  // Make spotifyPlayer globally accessible for game blocking system
  window.spotifyPlayer = spotifyPlayer;
  
  spotifyPlayer.addListener('initialization_error', ({ message }) => {
    updateStatus(`❌ Init: ${message}`, true);
    console.error('Spotify Init Error:', message);
  });
  spotifyPlayer.addListener('authentication_error', ({ message }) => {
    updateStatus(`❌ Auth: ${message}`, true);
    console.error('Spotify Auth Error:', message);
  });
  spotifyPlayer.addListener('account_error', ({ message }) => {
    updateStatus(`❌ Account: ${message}`, true);
    console.error('Spotify Account Error:', message);
  });
  spotifyPlayer.addListener('playback_error', ({ message }) => {
    updateStatus(`❌ Playback: ${message}`, true);
    console.error('Spotify Playback Error:', message);
  });
  
  spotifyPlayer.addListener('ready', ({ device_id }) => {
    updateStatus('🎵 Ready! Activating device...');
    deviceId = device_id;
    
    sendToCloudflare('info', 'Spotify device ready', {
      deviceId,
      browser: BROWSER_INFO.browser,
      isMobile: BROWSER_INFO.isMobile
    });
    
    // Enhanced device activation with cross-browser conflict handling
    activateDevice(device_id);
  });
  
  async function activateDevice(device_id, stopOthers = true) {
    try {
      // First, get current active devices to log conflicts
      const devicesResponse = await fetch('https://api.spotify.com/v1/me/player/devices', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      
      if (devicesResponse.ok) {
        const devicesData = await devicesResponse.json();
        const activeDevices = devicesData.devices.filter(d => d.is_active);
        
        sendToCloudflare('debug', 'Active devices before activation', {
          activeDevices: activeDevices.map(d => ({
            name: d.name,
            type: d.type,
            id: d.id,
            is_active: d.is_active
          })),
          newDeviceId: device_id
        });
        
        if (activeDevices.length > 0) {
          updateStatus(`🔄 Found ${activeDevices.length} active device(s), taking control...`);
        }
      }
      
      // Activate this device and optionally stop others
      const activationResponse = await fetch('https://api.spotify.com/v1/me/player', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          device_ids: [device_id],
          play: false
        })
      });
      
      if (activationResponse.ok) {
        updateStatus('✅ Device activated!');
        playBtn.disabled = false;
        
        sendToCloudflare('info', 'Device activation successful', {
          deviceId: device_id,
          stopOthers
        });
        
        // Set initial volume after activation
        try {
          await spotifyPlayer.setVolume(0.8);
          updateStatus('🔊 Ready to play!');
        } catch (volumeError) {
          updateStatus('🔊 Ready to play (volume set failed)');
          sendToCloudflare('warn', 'Volume set failed after activation', {
            error: volumeError.message
          });
        }
        
      } else {
        const errorText = await activationResponse.text();
        updateStatus('⚠️ Device activation failed', true);
        playBtn.disabled = false; // Still allow trying to play
        
        sendToCloudflare('error', 'Device activation failed', {
          status: activationResponse.status,
          error: errorText
        });
      }
      
    } catch (err) {
      updateStatus('⚠️ Device activation error', true);
      console.error('Device activation error:', err);
      playBtn.disabled = false;
      
      sendToCloudflare('error', 'Device activation exception', {
        error: err.message
      });
    }
  }
  
  spotifyPlayer.addListener('player_state_changed', state => {
    console.log('=== STATE CHANGE START ===');
    console.log('userPausedManually at start:', userPausedManually);
    console.log('manualPauseProtectionTime:', manualPauseProtectionTime);
    console.log('Date.now():', Date.now());
    console.log('Protection active?', Date.now() < manualPauseProtectionTime);
    
    if (!state) {
      updateStatus('⚠️ No player state');
      return;
    }
    
    const isPlaying = !state.paused;
    const position = Math.round(state.position / 1000);
    const duration = Math.round(state.duration / 1000);
    
    // Detect if this is a manual pause or auto-pause
    const timeSinceLastPause = Date.now() - pauseRequestTime;
    const positionChanged = Math.abs(position - lastKnownPosition) > 2;
    
    console.log('STATE CHANGE EVENT:', {
      isPlaying,
      position,
      userPausedManually,
      protectionActive: Date.now() < manualPauseProtectionTime,
      protectionTimeLeft: Math.max(0, Math.round((manualPauseProtectionTime - Date.now()) / 1000))
    });
    
    // Only update buttons if not manually paused
    if (!userPausedManually || isPlaying) {
      playBtn.classList.toggle('hidden', isPlaying);
      pauseBtn.classList.toggle('hidden', !isPlaying);
      resumeBtn.classList.add('hidden');
      console.log('Button visibility updated:', {
        userPausedManually,
        isPlaying,
        playBtnHidden: playBtn.classList.contains('hidden'),
        pauseBtnHidden: pauseBtn.classList.contains('hidden'),
        resumeBtnHidden: resumeBtn.classList.contains('hidden')
      });
    } else {
      console.log('Button visibility NOT updated (manual pause preserved):', {
        userPausedManually,
        isPlaying,
        playBtnHidden: playBtn.classList.contains('hidden'),
        pauseBtnHidden: pauseBtn.classList.contains('hidden'),
        resumeBtnHidden: resumeBtn.classList.contains('hidden')
      });
    }
    
    // Detailed debug info
    if (state.track_window.current_track) {
      const track = state.track_window.current_track;
      const restrictions = state.restrictions || {};
      const disallows = state.disallows || {};
      
      let debugInfo = `🎵 ${isPlaying ? 'Playing' : 'Paused'}: ${track.name} (${position}/${duration}s)`;
      
      // Log state change details
      sendToCloudflare('debug', 'Player state changed', {
        isPlaying,
        position,
        duration,
        userPausedManually,
        timeSinceLastPause,
        positionChanged,
        restrictions,
        disallows,
        trackName: track.name
      });
      
      // Check for restrictions that might cause auto-pause
      if (restrictions.disallow_resuming_reasons) {
        debugInfo += ` | Resume blocked: ${restrictions.disallow_resuming_reasons.join(', ')}`;
      }
      if (restrictions.disallow_pausing_reasons) {
        debugInfo += ` | Pause blocked: ${restrictions.disallow_pausing_reasons.join(', ')}`;
      }
      if (disallows.pausing) {
        debugInfo += ` | Pausing disallowed`;
      }
      if (disallows.resuming) {
        debugInfo += ` | Resuming disallowed`;
      }
      
      // Enhanced pause/resume logic
      if (!isPlaying && !userPausedManually && !disallows.resuming && position < duration - 5) {
        // This seems like an auto-pause due to browser policy, not user action
        if (BROWSER_INFO.isMobile && timeSinceLastPause > 3000) {
          debugInfo += ` | 📱 Auto-pause detected, preventing auto-resume`;
          sendToCloudflare('warn', 'Auto-pause detected on mobile', {
            position,
            duration,
            timeSinceLastPause
          });
          
          // Don't auto-resume - let user manually resume
          updateStatus('📱 Playback paused - tap ▶️ to continue', true);
        } else if (BROWSER_INFO.browser === 'firefox' && timeSinceLastPause > 1000) {
          debugInfo += ` | 🦊 Firefox auto-pause detected`;
          sendToCloudflare('warn', 'Firefox auto-pause detected', {
            position,
            duration,
            timeSinceLastPause
          });
        }
      }
      
      // Only reset manual pause flag if we're actually playing and position is advancing
      // AND the protection period has expired
      if (isPlaying && position > lastKnownPosition + 1 && Date.now() > manualPauseProtectionTime) {
        userPausedManually = false;
        console.log('Manual pause flag reset - track playing and progressing');
      } else if (userPausedManually && Date.now() < manualPauseProtectionTime) {
        console.log('Manual pause flag PROTECTED for', Math.round((manualPauseProtectionTime - Date.now()) / 1000), 'more seconds');
      }
      
      lastKnownPosition = position;
      updateStatus(debugInfo);
      
      console.log('Spotify State:', {
        playing: isPlaying,
        position,
        duration,
        restrictions,
        disallows,
        track: track.name,
        userPausedManually,
        timeSinceLastPause
      });
    }
  });
  
  spotifyPlayer.connect();
};

async function playTestTrack() {
  if (!deviceId) {
    updateStatus('❌ Player not ready', true);
    return;
  }
  
  try {
    // Mobile audio context fix - must be triggered by user interaction
    const isMobile = false; // Temporarily disabled: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      updateStatus('📱 Unlocking mobile audio...');
      
      try {
        // Create and unlock audio context
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        if (audioContext.state === 'suspended') {
          await audioContext.resume();
          updateStatus('📱 Audio context resumed');
        }
        
        // Create audible beep to fully unlock audio
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Brief audible tone to ensure audio is truly unlocked
        oscillator.frequency.value = 440;
        gainNode.gain.value = 0.1;
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.1);
        
        // Wait for the beep to complete
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Now try to resume any suspended Spotify playback
        if (spotifyPlayer) {
          const currentState = await spotifyPlayer.getCurrentState();
          if (currentState && currentState.paused) {
            await spotifyPlayer.resume();
            updateStatus('📱 Spotify resumed after audio unlock');
          }
        }
        
        updateStatus('📱 Mobile audio fully unlocked');
        
      } catch (error) {
        updateStatus(`📱 Audio unlock failed: ${error.message}`, true);
      }
    }
    
    updateStatus('🎵 Activating player element...');
    
    // CRITICAL: Call activateElement() before any playback operations
    if (spotifyPlayer && spotifyPlayer.activateElement) {
      await spotifyPlayer.activateElement();
      updateStatus('✅ Player element activated');
    }
    
    updateStatus('🎵 Starting playback...');
    
    // Device should already be activated, so directly start playing
    const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ uris: [TEST_TRACK_URI] })
    });
    
    if (response.ok) {
      updateStatus('🎵 Playing!');
      
      // Double-click workaround for Safari/mobile - try resume again after a moment
      if (false) { // Disabled mobile check: isMobile
        setTimeout(async () => {
          try {
            if (spotifyPlayer.activateElement) {
              await spotifyPlayer.activateElement();
            }
            await spotifyPlayer.resume();
            updateStatus('📱 Double-resume applied for mobile');
          } catch (err) {
            console.log('Double-resume failed:', err);
          }
        }, 1000);
      }
      
    } else if (response.status === 404) {
      // Device not active, try to reactivate
      updateStatus('🔄 Reactivating device...');
      await fetch('https://api.spotify.com/v1/me/player', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          device_ids: [deviceId],
          play: true,
          uris: [TEST_TRACK_URI]
        })
      });
      updateStatus('🎵 Playing via reactivation!');
    } else {
      const errorText = await response.text();
      updateStatus(`❌ Play failed: ${response.status} - ${errorText}`, true);
    }
    
  } catch (error) {
    updateStatus(`❌ ${error.message}`, true);
  }
}

async function pauseTrack() {
  console.log('pauseTrack() function called!');
  if (spotifyPlayer) {
    console.log('spotifyPlayer exists, proceeding with pause');
    // Mark as manual pause and record time
    userPausedManually = true;
    pauseRequestTime = Date.now();
    manualPauseProtectionTime = Date.now() + 2000; // Protect for 2 seconds
    
    console.log('MANUAL PAUSE CLICKED: userPausedManually set to TRUE, protection until', new Date(manualPauseProtectionTime).toLocaleTimeString());
    
    // Set UI first, BEFORE calling spotifyPlayer.pause() which triggers state changes
    pauseBtn.classList.add('hidden');
    resumeBtn.classList.remove('hidden');
    updateStatus('⏸️ Manually paused');
    
    sendToCloudflare('info', 'User manually paused', {
      browser: BROWSER_INFO.browser,
      isMobile: BROWSER_INFO.isMobile,
      timestamp: pauseRequestTime
    });
    
    console.log('About to call spotifyPlayer.pause() - userPausedManually is:', userPausedManually);
    await spotifyPlayer.pause();
    console.log('After spotifyPlayer.pause() - userPausedManually is:', userPausedManually);
  }
}

// Make pauseTrack globally accessible
window.pauseTrack = pauseTrack;

async function resumeTrack() {
  if (spotifyPlayer) {
    // Get current state to check if we should resume or restart
    const currentState = await spotifyPlayer.getCurrentState();
    const currentPosition = currentState ? currentState.position : 0;
    const isCurrentlyPaused = currentState ? currentState.paused : true;
    
    console.log('Resume button clicked:', {
      isCurrentlyPaused,
      currentPosition,
      userPausedManually,
      timeSincePause: Date.now() - pauseRequestTime
    });
    
    sendToCloudflare('info', 'User manually resumed', {
      browser: BROWSER_INFO.browser,
      isMobile: BROWSER_INFO.isMobile,
      userPausedManually,
      isCurrentlyPaused,
      currentPosition,
      timeSincePause: Date.now() - pauseRequestTime
    });
    
    // Use normal Spotify SDK resume for all browsers
    try {
      await spotifyPlayer.resume();
      updateStatus('▶️ Resumed');
      
      sendToCloudflare('info', 'Resume successful', {
        browser: BROWSER_INFO.browser,
        method: 'spotifyPlayer.resume()'
      });
    } catch (error) {
      // Fallback: try API resume with explicit position to prevent restart
      try {
        const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            position_ms: currentPosition
          })
        });
        
        if (response.ok) {
          updateStatus('▶️ Resumed via API');
          sendToCloudflare('info', 'Resume fallback successful', {
            browser: BROWSER_INFO.browser,
            method: 'API resume'
          });
        } else {
          throw new Error(`API resume failed: ${response.status}`);
        }
      } catch (apiError) {
        updateStatus('❌ Resume failed', true);
        sendToCloudflare('error', 'Resume failed completely', {
          sdkError: error.message,
          apiError: apiError.message
        });
      }
    }
    
    // Reset manual pause tracking
    userPausedManually = false;
    resumeBtn.classList.add('hidden');
    pauseBtn.classList.remove('hidden');
  }
}

// Make resumeTrack globally accessible
window.resumeTrack = resumeTrack;

function showPlayerOnly() {
  console.log('showPlayerOnly() called');
  if (spotifyLoginSection) {
    spotifyLoginSection.classList.add('hidden');
    console.log('Spotify login section hidden');
  }
  if (musicBar) {
    musicBar.classList.remove('hidden');
    console.log('Music bar shown');
  }
  updateStatus('🎵 Game ready - music controls available');
}

function showSpotifyLoginOption() {
  if (spotifyLoginSection) {
    spotifyLoginSection.classList.remove('hidden');
    console.log('Spotify login section shown');
  }
  updateStatus('🎵 Connect Spotify for music playback');
}

// Event listeners - with null checks
function setupEventListeners() {
  if (spotifyLoginBtn) spotifyLoginBtn.addEventListener('click', loginWithSpotify);
  if (skipSpotifyBtn) skipSpotifyBtn.addEventListener('click', showPlayerOnly);
  if (playBtn) playBtn.addEventListener('click', playTestTrack);
  if (pauseBtn) {
    pauseBtn.addEventListener('click', function(e) {
      console.log('Pause button clicked! Event:', e);
      pauseTrack();
    });
  }
  if (resumeBtn) resumeBtn.addEventListener('click', resumeTrack);
  
  // Mobile control event listeners
  const mobileLeftBtn = document.getElementById('mobile-left');
  const mobileRightBtn = document.getElementById('mobile-right');
  const mobilePauseBtn = document.getElementById('mobile-pause');
  
  if (mobileLeftBtn) {
    mobileLeftBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (window.gameScene) window.gameScene.mobileControls.leftPressed = true;
    });
    mobileLeftBtn.addEventListener('touchend', (e) => {
      e.preventDefault();
      if (window.gameScene) window.gameScene.mobileControls.leftPressed = false;
    });
    // Mouse events for desktop testing
    mobileLeftBtn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      if (window.gameScene) window.gameScene.mobileControls.leftPressed = true;
    });
    mobileLeftBtn.addEventListener('mouseup', (e) => {
      e.preventDefault();
      if (window.gameScene) window.gameScene.mobileControls.leftPressed = false;
    });
  }
  
  if (mobileRightBtn) {
    mobileRightBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (window.gameScene) window.gameScene.mobileControls.rightPressed = true;
    });
    mobileRightBtn.addEventListener('touchend', (e) => {
      e.preventDefault();
      if (window.gameScene) window.gameScene.mobileControls.rightPressed = false;
    });
    // Mouse events for desktop testing
    mobileRightBtn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      if (window.gameScene) window.gameScene.mobileControls.rightPressed = true;
    });
    mobileRightBtn.addEventListener('mouseup', (e) => {
      e.preventDefault();
      if (window.gameScene) window.gameScene.mobileControls.rightPressed = false;
    });
  }
  
  if (mobilePauseBtn) {
    mobilePauseBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (window.gameScene) {
        window.gameScene.togglePause();
        mobilePauseBtn.textContent = window.gameScene.isPaused ? 'RESUME' : 'PAUSE';
      }
    });
  }
  
  console.log('Event listeners setup:', {
    spotifyLoginBtn: !!spotifyLoginBtn,
    skipSpotifyBtn: !!skipSpotifyBtn, 
    playBtn: !!playBtn,
    pauseBtn: !!pauseBtn,
    resumeBtn: !!resumeBtn,
    mobileLeftBtn: !!mobileLeftBtn,
    mobileRightBtn: !!mobileRightBtn,
    mobilePauseBtn: !!mobilePauseBtn
  });
}

// Initialize
window.addEventListener('DOMContentLoaded', () => {
  // Setup event listeners first
  setupEventListeners();
  
  // Start the Phaser game
  const game = new Phaser.Game(GameConfig);
  
  // Make game scene globally accessible for mobile controls
  game.events.on('ready', () => {
    window.gameScene = game.scene.getScene('GameScene');
  });
  
  // Handle OAuth callback
  if (window.location.search.includes('code=')) {
    console.log('🔄 Processing OAuth callback...');
    handleCallback();
    return;
  }
  
  // Check for existing session or test token
  const savedToken = sessionStorage.getItem('spotify_access_token');
  if (savedToken) {
    accessToken = savedToken;
    updateStatus('🔑 Found saved session...');
    getUserInfo();
  } else {
    // No token found - show login option unless we're in test mode
    const hasTestToken = window.TEST_SPOTIFY_TOKEN && 
                       window.TEST_SPOTIFY_TOKEN !== 'PASTE_YOUR_TOKEN_HERE' &&
                       window.TEST_SPOTIFY_TOKEN.length > 100;
    
    if (!hasTestToken) {
      // Show Spotify login option inline
      showSpotifyLoginOption();
    } else {
      // Test token will be injected, just show player
      showPlayerOnly();
    }
  }
});

// Spotify SDK ready callback is now defined in the head section