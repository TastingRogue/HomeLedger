import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
    csp: {
      mode: 'auto',
      directives: {
        'default-src': ['self'],
        'script-src': ['self'],
        'style-src': ['self', 'unsafe-inline'],
        'img-src': ['self', 'data:', 'blob:'],
        'font-src': ['self'],
        'connect-src': ['self'],
        'worker-src': ['self', 'blob:'],
        'frame-src': ['self', 'blob:'],
        'object-src': ['none'],
        'base-uri': ['self'],
        'frame-ancestors': ['self'],
        'form-action': ['self'],
      },
    },
		adapter: adapter({
			out: 'build',
			precompress: true
		}),
		alias: {
			$lib: 'src/lib',
			$components: 'src/lib/components',
			$stores: 'src/lib/stores',
			$api: 'src/lib/api',
			$utils: 'src/lib/utils',
			$i18n: 'src/lib/i18n'
		}
	}
};

export default config;
