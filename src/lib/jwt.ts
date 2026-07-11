/**
 * JWT helpers for session tokens returned after Google sign-in.
 */
import jwt from "jsonwebtoken";
import type { Env } from "../config/env.js";

export interface JwtPayload {
  userId: string;
  email: string;
}

/** How long a session token stays valid after sign-in. */
const SESSION_TOKEN_TTL = "360d";

/** Signs a session JWT stored by the Angular client. */
export function signSessionToken(env: Env, payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: SESSION_TOKEN_TTL });
}

/** Returns payload or throws if token is invalid/expired. */
export function verifySessionToken(env: Env, token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}
