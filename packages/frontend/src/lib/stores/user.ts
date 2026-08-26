import { writable } from 'svelte/store';

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  role: string;
}

export const userProfile = writable<UserProfile | null>(null);

export async function loadUserProfile() {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('sf_access_token') : null;
    if (!token) return;

    const res = await fetch('/api/v1/auth/me', {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) return;
    const body = await res.json();
    const data = body.data ?? body;
    userProfile.set({ id: data.id, name: data.name, email: data.email, role: data.role });
  } catch {}
}
