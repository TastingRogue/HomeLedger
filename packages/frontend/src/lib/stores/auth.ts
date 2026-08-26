import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';

export interface User {
	id: number;
	name: string;
	email: string;
	role: string;
}

export interface AuthState {
	user: User | null;
	accessToken: string | null;
	refreshToken: string | null;
}

function createAuthStore() {
	const initialState: AuthState = {
		user: null,
		accessToken: null,
		refreshToken: null
	};

	// Hydrate from localStorage on client
	if (browser) {
		const token = localStorage.getItem('sf_access_token');
		const refresh = localStorage.getItem('sf_refresh_token');
		const userJson = localStorage.getItem('sf_user');
		if (token) initialState.accessToken = token;
		if (refresh) initialState.refreshToken = refresh;
		if (userJson) {
			try {
				initialState.user = JSON.parse(userJson);
			} catch {
				// ignore invalid JSON
			}
		}
	}

	const { subscribe, set, update } = writable<AuthState>(initialState);

	return {
		subscribe,

		login(user: User, accessToken: string, refreshToken: string) {
			if (browser) {
				localStorage.setItem('sf_access_token', accessToken);
				localStorage.setItem('sf_refresh_token', refreshToken);
				localStorage.setItem('sf_user', JSON.stringify(user));
			}
			set({ user, accessToken, refreshToken });
		},

		setUser(user: User) {
			if (browser) {
				localStorage.setItem('sf_user', JSON.stringify(user));
			}
			update((state) => ({ ...state, user }));
		},

		logout() {
			if (browser) {
				localStorage.removeItem('sf_access_token');
				localStorage.removeItem('sf_refresh_token');
				localStorage.removeItem('sf_user');
			}
			set({ user: null, accessToken: null, refreshToken: null });
		}
	};
}

export const authStore = createAuthStore();

export const isAuthenticated = derived(authStore, ($auth) => !!$auth.accessToken);

export const currentUser = derived(authStore, ($auth) => $auth.user);
