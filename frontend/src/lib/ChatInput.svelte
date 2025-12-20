<!--
  Chat Input Component
  
  Message input field with send button.
  Features:
  - Enter key to send (Shift+Enter for newline)
  - Disabled during loading
  - Clear input after send
-->

<script lang="ts">
	import { onMount } from 'svelte';

	export let isLoading = false;
	export let onSend: (message: string) => Promise<void> = async () => {};

	let input = '';
	let inputElement: HTMLTextAreaElement;

	// Handle Enter key
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			handleSend();
		}
	}

	// Send message
	async function handleSend() {
		const message = input.trim();
		if (!message || isLoading) return;

		input = '';
		await onSend(message);

		// Restore focus
		inputElement?.focus();
	}

	// Auto-resize textarea
	function handleInput() {
		if (inputElement) {
			inputElement.style.height = 'auto';
			inputElement.style.height = Math.min(inputElement.scrollHeight, 120) + 'px';
		}
	}

	onMount(() => {
		inputElement?.focus();
	});
</script>

<div class="input-container">
	<div class="input-wrapper">
		<textarea
			bind:this={inputElement}
			bind:value={input}
			on:input={handleInput}
			on:keydown={handleKeydown}
			placeholder="Type a message... Press Enter to send"
			disabled={isLoading}
			rows="1"
		/>
		<button on:click={handleSend} disabled={isLoading || !input.trim()} aria-label="Send message">
			{#if isLoading}
				<span class="button-icon spinner"></span>
			{:else}
				<span class="button-icon">➤</span>
			{/if}
		</button>
	</div>
	<p class="hint">Shift+Enter for newline • Your session is saved locally</p>
</div>

<style>
	.input-container {
		background: linear-gradient(180deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.9) 100%);
		border-top: 1px solid rgba(15, 23, 42, 0.05);
		padding: 1rem 1.25rem;
		box-shadow: 0 -10px 30px rgba(15, 23, 42, 0.05);
	}

	.input-wrapper {
		display: flex;
		gap: 0.75rem;
		align-items: flex-end;
	}

	textarea {
		flex: 1;
		border: 1px solid rgba(15, 23, 42, 0.1);
		border-radius: 12px;
		padding: 0.9rem 1rem;
		font-family: inherit;
		font-size: 1rem;
		line-height: 1.45;
		resize: none;
		max-height: 140px;
		min-height: 48px;
		outline: none;
		background: rgba(255, 255, 255, 0.9);
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8);
		transition: border-color 0.2s, box-shadow 0.2s, transform 0.1s;
	}

	textarea:focus {
		border-color: #2563eb;
		box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
		transform: translateY(-1px);
	}

	textarea:disabled {
		background: rgba(248, 250, 252, 0.8);
		color: #94a3b8;
		cursor: not-allowed;
	}

	button {
		background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
		color: white;
		border: none;
		border-radius: 12px;
		width: 46px;
		height: 46px;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.1rem;
		font-weight: 700;
		transition: transform 0.12s ease, box-shadow 0.2s ease, filter 0.2s ease;
		box-shadow: 0 10px 22px rgba(37, 99, 235, 0.25);
	}

	button:hover:not(:disabled) {
		filter: brightness(1.05);
		transform: translateY(-1px);
	}

	button:active:not(:disabled) {
		transform: translateY(0);
	}

	button:disabled {
		background: #cbd5e1;
		box-shadow: none;
		cursor: not-allowed;
	}

	.button-icon {
		display: inline-block;
	}

	.spinner {
		width: 18px;
		height: 18px;
		border: 2px solid rgba(255, 255, 255, 0.4);
		border-top-color: white;
		border-radius: 50%;
		animation: rotate 0.7s linear infinite;
	}

	@keyframes rotate {
		to {
			transform: rotate(360deg);
		}
	}

	.hint {
		margin-top: 0.35rem;
		color: #94a3b8;
		font-size: 0.85rem;
		line-height: 1.3;
	}

	@media (max-width: 640px) {
		.input-container {
			padding: 0.85rem 0.9rem;
		}

		button {
			width: 42px;
			height: 42px;
		}
	}
</style>
