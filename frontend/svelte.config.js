import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://kit.svelte.dev/docs/integrations#preprocessors
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		// adapter-static builds to static files that can be served by any web server
		// On Vercel, emit to the repo root `/build` so Vercel picks it up
		adapter: adapter({
			pages: process.env.VERCEL ? '../build' : 'build',
			assets: process.env.VERCEL ? '../build' : 'build',
			fallback: 'index.html',
			precompress: false,
			strict: false
		})
	}
};

export default config;
