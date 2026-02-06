import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '@/lib/constants';
import type { JWTPayload } from './types';

export function signPayload(payload: Omit<JWTPayload, 'iat'>): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '365d' });
}

export function verifyPayload(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded as JWTPayload;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}
