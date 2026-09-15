// Prerender the offline fallback so it is emitted as a static HTML file that the
// service worker can precache (part of $service-worker `prerendered`). It must
// never depend on the network or on being authenticated.
export const prerender = true;
export const ssr = true;
