/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { immutable, assets, prerendered } from '$app/manifest';
import { version } from '$app/env';

const sw = self as unknown as ServiceWorkerGlobalScope;

// Cache names
const CACHE_NAME = `homeledger-cache-${version}`;
// API responses are private and must never be persisted in Cache Storage.

// Dedicated offline fallback page (prerendered → a static HTML file). Served for
// navigation requests when both the network and the cached landing page miss.
const OFFLINE_URL = '/offline';

// Assets to cache (app shell)
const APP_SHELL = [
	...[...immutable, ...assets, ...prerendered].map(({ path }) => '/' + path.replace(/^\//, ''))
];

// Install: cache app shell
sw.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(CACHE_NAME)
			.then((cache) => cache.addAll(APP_SHELL))
			.then(() => sw.skipWaiting())
	);
});

// Activate: clean up old caches
sw.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(
					keys
						.filter((key) => key.startsWith('homeledger-') && key !== CACHE_NAME)
						.map((key) => caches.delete(key))
				)
			)
			.then(() => sw.clients.claim())
	);
});

// Fetch: network-only for API, cache-first for public assets
sw.addEventListener('fetch', (event) => {
	const { request } = event;
	const url = new URL(request.url);

	// Skip non-GET requests
	if (request.method !== 'GET') return;

	// Skip chrome-extension and other non-http requests
	if (!url.protocol.startsWith('http')) return;

	// Never read or write cached API data, including caches from older sessions.
	if (url.origin !== sw.location.origin) return;
	if (url.pathname.startsWith('/api/')) {
		event.respondWith(fetch(request, { cache: 'no-store' }));
		return;
	}

	// HTML must check the network even when a prerendered route belongs to the
	// shell. Otherwise /offline can retain references to bundles from an old build.
	if (request.mode === 'navigate') {
		event.respondWith(networkFirst(request, CACHE_NAME));
		return;
	}

	// App shell and static assets: cache-first strategy
	if (APP_SHELL.includes(url.pathname)) {
		event.respondWith(cacheFirst(request));
		return;
	}

	// Other requests: try network, fall back to cache
	event.respondWith(networkFirst(request, CACHE_NAME));
});

/**
 * Cache-first strategy: serve from cache, fall back to network
 */
async function cacheFirst(request: Request): Promise<Response> {
	const cached = await caches.match(request);
	if (cached) return cached;

	try {
		const response = await fetch(request);
		if (response.ok) {
			const cache = await caches.open(CACHE_NAME);
			cache.put(request, response.clone());
		}
		return response;
	} catch {
		return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
	}
}

/**
 * Network-first strategy: try network, fall back to cache
 */
async function networkFirst(request: Request, cacheName: string): Promise<Response> {
	try {
		const response = await fetch(request);
		if (response.ok) {
			const cache = await caches.open(cacheName);
			cache.put(request, response.clone());
		}
		return response;
	} catch {
		const cached = await caches.match(request);
		if (cached) return cached;

		// For navigation requests, fall back to the cached landing page, then to
		// the dedicated offline page, so the user always sees a styled screen.
		if (request.mode === 'navigate') {
			const fallback = await caches.match('/');
			if (fallback) return fallback;
			const offline = await caches.match(OFFLINE_URL);
			if (offline) return offline;
		}

		return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
	}
}
