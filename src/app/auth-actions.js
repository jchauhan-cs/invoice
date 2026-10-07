'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createHash, timingSafeEqual } from 'node:crypto';
import { createSession, SESSION_COOKIE, SESSION_MAX_AGE } from '@/lib/auth';

const digest = (s) => createHash('sha256').update(s).digest();

export async function login(formData) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) throw new Error('ADMIN_PASSWORD is not set. See .env.example.');
  const given = String(formData.get('password') ?? '');
  if (!timingSafeEqual(digest(given), digest(expected))) redirect('/login?error=1');

  cookies().set(SESSION_COOKIE, await createSession(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
  redirect('/');
}

export async function logout() {
  cookies().delete(SESSION_COOKIE);
  redirect('/login');
}
