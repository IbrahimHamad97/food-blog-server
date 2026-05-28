/**
 * Verifies Google ID tokens from the Angular client (Google Identity Services).
 */
import { OAuth2Client } from 'google-auth-library';
import type { Env } from '../config/env.js';

export interface GoogleProfile {
  googleId: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

/**
 * @param env - Must include `GOOGLE_CLIENT_ID` matching the Angular web client
 * @param idToken - JWT from GIS `credential` callback
 */
export async function verifyGoogleIdToken(env: Env, idToken: string): Promise<GoogleProfile> {
  const client = new OAuth2Client(env.GOOGLE_CLIENT_ID);
  const ticket = await client.verifyIdToken({
    idToken,
    audience: env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email) {
    throw new Error('Google token missing required:sub');
  }

  return {
    googleId: payload.sub,
    email: payload.email,
    name: payload.name ?? payload.email.split('@')[0],
    avatarUrl: payload.picture ?? null,
  };
}
