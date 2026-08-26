import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export type Theme = 'light' | 'dark' | 'system';

export interface UiState {
	sidebarOpen: boolean;
	theme: Theme;
}

function getInitialTheme(): Theme {
	if (!browser) return 'system';
	const stored = localStorage.getItem('sf_theme');
	if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
	return 'system';
}

function createUiStore() {
	const initialState: UiState = {
		sidebarOpen: false,
		theme: getInitialTheme()
	};

	const { subscribe, set, update } = writable<UiState>(initialState);

	return {
		subscribe,

		toggleSidebar() {
			update((state) => ({ ...state, sidebarOpen: !state.sidebarOpen }));
		},

		openSidebar() {
			update((state) => ({ ...state, sidebarOpen: true }));
		},

		closeSidebar() {
			update((state) => ({ ...state, sidebarOpen: false }));
		},

		setTheme(theme: Theme) {
			if (browser) {
				localStorage.setItem('sf_theme', theme);
			}
			update((state) => ({ ...state, theme }));
		}
	};
}

export const uiStore = createUiStore();
