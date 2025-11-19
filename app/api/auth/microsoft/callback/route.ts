import { NextRequest, NextResponse } from 'next/server';
import { getMicrosoftAccessToken, getMicrosoftUserInfo } from '@/lib/auth/oauth';
import { createSession } from '@/lib/auth/session';
import { query } from '@/lib/db/postgres';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Check for OAuth errors
    if (error) {
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(error)}`, request.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/login?error=missing_code', request.url)
      );
    }

    // Get OAuth configuration from environment
    const clientId = process.env.MICROSOFT_CLIENT_ID;
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/microsoft/callback`;

    if (!clientId || !clientSecret) {
      console.error('Microsoft OAuth not configured');
      return NextResponse.redirect(
        new URL('/login?error=oauth_not_configured', request.url)
      );
    }

    // Exchange code for access token
    const tokenResponse = await getMicrosoftAccessToken(code, {
      clientId,
      clientSecret,
      redirectUri,
    });

    // Get user info from Microsoft Graph
    const userInfo = await getMicrosoftUserInfo(tokenResponse.access_token);

    const email = userInfo.mail || userInfo.userPrincipalName;

    if (!email) {
      return NextResponse.redirect(
        new URL('/login?error=no_email', request.url)
      );
    }

    // Check if user exists
    const existingUser = await query(
      `SELECT id, email, name, role, status FROM users WHERE email = $1 AND auth_provider = 'microsoft'`,
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      const user = existingUser.rows[0];

      // Check user status
      if (user.status === 'inactive') {
        return NextResponse.redirect(
          new URL('/login?error=account_inactive', request.url)
        );
      }

      if (user.status === 'pending') {
        // User is still pending approval
        return NextResponse.redirect(new URL('/pending', request.url));
      }

      // Update last login
      await query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

      // Create session
      const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip');
      const userAgent = request.headers.get('user-agent');

      const { token } = await createSession(user.id, user.email, user.role, ipAddress || undefined, userAgent || undefined);

      // Log audit
      await query(
        `INSERT INTO audit_logs (user_id, action, ip_address, user_agent)
         VALUES ($1, 'login', $2, $3)`,
        [user.id, ipAddress, userAgent]
      );

      // Redirect to main app with token
      const redirectUrl = new URL('/', request.url);
      redirectUrl.searchParams.set('token', token);
      return NextResponse.redirect(redirectUrl);
    } else {
      // User doesn't exist - create pending user
      const pendingCheck = await query(
        'SELECT id FROM pending_users WHERE email = $1',
        [email.toLowerCase()]
      );

      if (pendingCheck.rows.length === 0) {
        // Create new pending user
        await query(
          `INSERT INTO pending_users (email, name, auth_provider, provider_user_id, status)
           VALUES ($1, $2, 'microsoft', $3, 'pending')`,
          [email.toLowerCase(), userInfo.displayName, userInfo.id]
        );

        // Log audit
        await query(
          `INSERT INTO audit_logs (action, resource_type, details)
           VALUES ('sso_signup_pending', 'pending_user', $1)`,
          [JSON.stringify({ email, provider: 'microsoft' })]
        );
      }

      // Redirect to pending page
      return NextResponse.redirect(new URL('/pending', request.url));
    }
  } catch (error) {
    console.error('Microsoft OAuth callback error:', error);
    return NextResponse.redirect(
      new URL('/login?error=oauth_failed', request.url)
    );
  }
}
