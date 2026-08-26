import { d as derived, w as writable } from './index.js-Dj4Feo29.js';

function createAuthStore() {
  const initialState = {
    user: null,
    accessToken: null,
    refreshToken: null
  };
  const { subscribe, set, update } = writable(initialState);
  return {
    subscribe,
    login(user, accessToken, refreshToken) {
      set({ user, accessToken, refreshToken });
    },
    setUser(user) {
      update((state) => ({ ...state, user }));
    },
    logout() {
      set({ user: null, accessToken: null, refreshToken: null });
    }
  };
}
const authStore = createAuthStore();
derived(authStore, ($auth) => !!$auth.accessToken);
derived(authStore, ($auth) => $auth.user);
function getInitialTheme() {
  return "system";
}
function createUiStore() {
  const initialState = {
    sidebarOpen: false,
    theme: getInitialTheme()
  };
  const { subscribe, set, update } = writable(initialState);
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
    setTheme(theme) {
      update((state) => ({ ...state, theme }));
    }
  };
}
createUiStore();
//# sourceMappingURL=ui-DjqVbmKE.js.map
