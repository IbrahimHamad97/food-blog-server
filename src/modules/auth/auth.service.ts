/**
 * Auth business logic: Google token exchange and session user lookup.
 */
import type { Env } from '../../config/env.js';
import { verifyGoogleIdToken } from '../../lib/google.js';
import { signSessionToken } from '../../lib/jwt.js';
import { prisma } from '../../lib/prisma.js';

/** User DTO sent to the client. */
export interface AuthUserDto {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

export interface AuthResponse {
  token: string;
  user: AuthUserDto;
}

function toDto(user: {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}): AuthUserDto {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
  };
}

/** Exchange a Google ID token for an app session JWT. */
export async function loginWithGoogle(env: Env, idToken: string): Promise<AuthResponse> {
  const profile = await verifyGoogleIdToken(env, idToken);

  const user = await prisma.user.upsert({
    where: { googleId: profile.googleId },
    create: {
      googleId: profile.googleId,
      email: profile.email,
      name: profile.name,
      avatarUrl: profile.avatarUrl,
    },
    // Keep custom display name — only refresh email/avatar from Google.
    update: {
      email: profile.email,
      avatarUrl: profile.avatarUrl,
    },
  });

  const token = signSessionToken(env, { userId: user.id, email: user.email });

  return { token, user: toDto(user) };
}

/** Load user for a valid session (used by GET /auth/me). */
export async function getUserById(userId: string): Promise<AuthUserDto | null> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  return user ? toDto(user) : null;
}

/** Update the public display name shown on reviews and the profile. */
export async function updateDisplayName(
  userId: string,
  name: string,
): Promise<AuthUserDto | null> {
  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (!existing) {
    return null;
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { name },
  });
  return toDto(user);
}
