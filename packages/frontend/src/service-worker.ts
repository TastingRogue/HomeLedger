/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { build, files, version } from '$service-worker';

const sw = self as unknown as ServiceWorkerGlobalScope;

// Cache names
const CACHE_NAME = `smart-finance-cache-${version}`;
const API_CACHE_NAME = `smart-finance-api-${version}`;

// Assets to cache (app shell)
const APP_SHELL = [
	...build, // built JS/CSS bundles
	...files // static files
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
						.filter((key) => key !== CACHE_NAME && key !== API_CACHE_NAME)
						.map((key) => caches.delete(key))
				)
			)
			.then(() => sw.clients.claim())
	);
});

// Fetch: network-first for API, cache-first for assets
sw.addEventListener('fetch', (event) => {
	const { request } = event;
	const url = new URL(request.url);

	// Skip non-GET requests
	if (request.method !== 'GET') return;

	// Skip chrome-extension and other non-http requests
	if (!url.protocol.startsWith('http')) return;

	// API calls: network-first strategy
	if (url.pathname.startsWith('/api/')) {
		event.respondWith(networkFirst(request, API_CACHE_NAME));
		return;
	}

	// App shell and static assets: cache-first strategy
	if (APP_SHELL.includes(url.pathname)) {
		event.respondWith(cacheFirst(request));
		return;
	}

	// Navigation requests (HTML pages): network-first with offline fallback
	if (request.mode === 'navigate') {
		event.respondWith(networkFirst(request, CACHE_NAME));
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

		// For navigation requests, return the cached index page
		if (request.mode === 'navigate') {
			const fallback = await caches.match('/');
			if (fallback) return fallback;
		}

		return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
	}
}
