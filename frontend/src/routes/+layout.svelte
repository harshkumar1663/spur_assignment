<!-- 
  Root Layout - Applied to all pages
  
  SvelteKit uses file-based routing with layouts:
  - src/routes/+layout.svelte wraps all pages
  - Provides consistent structure across the app
-->
<script lang="ts">
	// Import global styles
	import './app.css';
</script>

<div class="app">
	<slot />
</div>

<style>
	:global(html),
	:global(body) {
		width: 100%;
		height: 100%;
		overflow: hidden;
	}

	:global(#svelte) {
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
	}

	.app {
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
	}
</style>

