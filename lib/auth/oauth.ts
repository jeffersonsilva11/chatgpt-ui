// OAuth helper functions for Google and Microsoft authentication

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  id_token?: string;
}

export interface GoogleUserInfo {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  locale: string;
}

export interface MicrosoftUserInfo {
  id: string;
  userPrincipalName: string;
  displayName: string;
  givenName: string;
  surname: string;
  mail: string;
  jobTitle?: string;
}

// Google OAuth URLs
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USER_INFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

// Microsoft OAuth URLs
const MICROSOFT_AUTH_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
const MICROSOFT_TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
const MICROSOFT_USER_INFO_URL = 'https://graph.microsoft.com/v1.0/me';

/**
 * Generate Google OAuth authorization URL
 */
export function getGoogleAuthUrl(config: OAuthConfig, state?: string): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
    ...(state && { state }),
  });

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange Google authorization code for access token
 */
export async function getGoogleAccessToken(
  code: string,
  config: OAuthConfig
): Promise<OAuthTokenResponse> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get Google access token: ${error}`);
  }

  return response.json();
}

/**
 * Get Google user information
 */
export async function getGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const response = await fetch(GOOGLE_USER_INFO_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get Google user info: ${error}`);
  }

  return response.json();
}

/**
 * Generate Microsoft OAuth authorization URL
 */
export function getMicrosoftAuthUrl(config: OAuthConfig, state?: string): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: 'openid email profile User.Read',
    response_mode: 'query',
    ...(state && { state }),
  });

  return `${MICROSOFT_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange Microsoft authorization code for access token
 */
export async function getMicrosoftAccessToken(
  code: string,
  config: OAuthConfig
): Promise<OAuthTokenResponse> {
  const response = await fetch(MICROSOFT_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get Microsoft access token: ${error}`);
  }

  return response.json();
}

/**
 * Get Microsoft user information
 */
export async function getMicrosoftUserInfo(accessToken: string): Promise<MicrosoftUserInfo> {
  const response = await fetch(MICROSOFT_USER_INFO_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get Microsoft user info: ${error}`);
  }

  return response.json();
}

/**
 * Generate a random state for OAuth CSRF protection
 */
export function generateOAuthState(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/**
 * Store OAuth state in session storage (client-side only)
 */
export function storeOAuthState(state: string): void {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('oauth_state', state);
  }
}

/**
 * Verify and retrieve OAuth state from session storage
 */
export function verifyOAuthState(state: string): boolean {
  if (typeof window !== 'undefined') {
    const storedState = sessionStorage.getItem('oauth_state');
    sessionStorage.removeItem('oauth_state');
    return storedState === state;
  }
  return false;
}
