// Spotify Authentication Handler
class SpotifyAuth {
constructor() {
this.clientId = ‘YOUR_SPOTIFY_CLIENT_ID’; // Replace with your client ID
this.redirectUri = window.location.origin + ‘/callback’; // Adjust for your domain
this.scopes = [
‘streaming’,
‘user-read-playback-state’,
‘user-modify-playback-state’,
‘user-read-private’
].join(’ ’);

```
this.accessToken = null;
this.isAuthenticated = false;
```

}

// Generate PKCE parameters for secure auth
generateCodeVerifier() {
const array = new Uint8Array(32);
crypto.getRandomValues(array);
return btoa(String.fromCharCode.apply(null, array))
.replace(/+/g, ‘-’)
.replace(///g, ‘_’)
.replace(/=/g, ‘’);
}

async generateCodeChallenge(verifier) {
const data = new TextEncoder().encode(verifier);
const digest = await window.crypto.subtle.digest(‘SHA-256’, data);
return btoa(String.fromCharCode.apply(null, new Uint8Array(digest)))
.replace(/+/g, ‘-’)
.replace(///g, ‘_’)
.replace(/=/g, ‘’);
}

// Start the authentication flow
async login() {
const codeVerifier = this.generateCodeVerifier();
const codeChallenge = await this.generateCodeChallenge(codeVerifier);

```
// Store verifier for later use
localStorage.setItem('spotify_code_verifier', codeVerifier);

const authUrl = new URL('https://accounts.spotify.com/authorize');
authUrl.searchParams.append('response_type', 'code');
authUrl.searchParams.append('client_id', this.clientId);
authUrl.searchParams.append('scope', this.scopes);
authUrl.searchParams.append('redirect_uri', this.redirectUri);
authUrl.searchParams.append('code_challenge_method', 'S256');
authUrl.searchParams.append('code_challenge', codeChallenge);

window.location.href = authUrl.toString();
```

}

// Handle the callback with authorization code
async handleCallback() {
const urlParams = new URLSearchParams(window.location.search);
const code = urlParams.get(‘code’);
const error = urlParams.get(‘error’);

```
if (error) {
  console.error('Spotify auth error:', error);
  return false;
}

if (code) {
  return await this.exchangeCodeForToken(code);
}

return false;
```

}

// Exchange authorization code for access token
async exchangeCodeForToken(code) {
const codeVerifier = localStorage.getItem(‘spotify_code_verifier’);

```
if (!codeVerifier) {
  console.error('Code verifier not found');
  return false;
}

try {
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: this.redirectUri,
      client_id: this.clientId,
      code_verifier: codeVerifier
    })
  });

  if (!response.ok) {
    throw new Error('Token exchange failed');
  }

  const data = await response.json();
  this.accessToken = data.access_token;
  this.isAuthenticated = true;
  
  // Store token for session
  sessionStorage.setItem('spotify_access_token', this.accessToken);
  
  // Clean up
  localStorage.removeItem('spotify_code_verifier');
  
  // Clean URL
  window.history.replaceState({}, document.title, window.location.pathname);
  
  return true;
} catch (error) {
  console.error('Error exchanging code for token:', error);
  return false;
}
```

}

// Check if user has Spotify Premium
async checkUserCapabilities() {
if (!this.accessToken) return { isPremium: false };

```
try {
  const response = await fetch('https://api.spotify.com/v1/me', {
    headers: {
      'Authorization': `Bearer ${this.accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to get user profile');
  }

  const profile = await response.json();
  return {
    isPremium: profile.product === 'premium',
    displayName: profile.display_name,
    country: profile.country
  };
} catch (error) {
  console.error('Error checking user capabilities:', error);
  return { isPremium: false };
}
```

}

// Search for tracks
async searchTracks(query, limit = 10) {
if (!this.accessToken) return { tracks: { items: [] } };

```
try {
  const url = new URL('https://api.spotify.com/v1/search');
  url.searchParams.append('q', query);
  url.searchParams.append('type', 'track');
  url.searchParams.append('limit', limit);

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${this.accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error('Search failed');
  }

  return await response.json();
} catch (error) {
  console.error('Error searching tracks:', error);
  return { tracks: { items: [] } };
}
```

}

// Get stored token if available
getStoredToken() {
const token = sessionStorage.getItem(‘spotify_access_token’);
if (token) {
this.accessToken = token;
this.isAuthenticated = true;
return true;
}
return false;
}

// Clear authentication
logout() {
this.accessToken = null;
this.isAuthenticated = false;
sessionStorage.removeItem(‘spotify_access_token’);
localStorage.removeItem(‘spotify_code_verifier’);
}
}