<!--
  Chat Component
  
  Main chat interface with message display, input, and session management.
  
  Features:
  - Displays conversation history
  - Sends new messages via backend API
  - Persists session ID in localStorage
  - Shows loading and error states
  - Auto-scrolls to latest message
-->

<script lang="ts">
	import { onMount, tick } from 'svelte';
	import Message from './Message.svelte';
	import ChatInput from './ChatInput.svelte';
	import { ENDPOINTS } from './api';

	interface ChatMessage {
		id: string;
		sender: 'user' | 'assistant';
		text: string;
		timestamp: string;
	}

	interface ChatResponse {
		reply: string;
		sessionId: string;
		timestamp: string;
	}

	interface ErrorResponse {
		error: string;
		message: string;
		statusCode: number;
	}

	// State
	let messages: ChatMessage[] = [];
	let sessionId: string | null = null;
	let isLoading = false;
	let error: string | null = null;
	let messageContainer: HTMLElement;

	// Fetch conversation history from backend
	async function loadHistory() {
		if (!sessionId) return;

		try {
			const response = await fetch(ENDPOINTS.chatHistory(), {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ sessionId }),
			});

			if (!response.ok) {
				let serverMessage = `Server unavailable (status ${response.status}).`;
				try {
					const errorData: ErrorResponse = await response.json();
					if (errorData?.message) serverMessage = errorData.message;
				} catch (parseErr) {
					// Ignore parse errors; fall back to generic status message
				}
				throw new Error(serverMessage);
			}

			let data;
			try {
				data = await response.json();
			} catch (parseErr) {
				throw new Error('Server response was not valid JSON. Please restart the backend.');
			}
			messages = data.messages;
			await scrollToBottom();
		} catch (err) {
			const details = err instanceof Error ? err.message : String(err);
			const friendly = 'Unable to load your conversation. Please try again later.';
			error = `${friendly}`;
		}
	}

	// Send message to backend with optimistic user bubble
	async function sendMessage(text: string) {
		const trimmed = text.trim();
		if (!trimmed) return;

		isLoading = true;
		error = null;

		// Optimistic user message
		const tempId = `temp-${Date.now()}`;
		const optimisticMessage: ChatMessage = {
			id: tempId,
			sender: 'user',
			text: trimmed,
			timestamp: new Date().toISOString(),
		};
		messages = [...messages, optimisticMessage];
		await scrollToBottom();

		try {
			const response = await fetch(ENDPOINTS.chatMessage(), {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					message: trimmed,
					sessionId: sessionId || undefined,
				}),
			});

			if (!response.ok) {
				let serverMessage = `Server unavailable (status ${response.status}). Please ensure the backend is running.`;
				try {
					const errorData: ErrorResponse = await response.json();
					if (errorData?.message) serverMessage = errorData.message;
				} catch (parseErr) {
					// Ignore parse errors; fall back to generic message
				}
				throw new Error(serverMessage);
			}

			let data: ChatResponse;
			try {
				data = await response.json();
			} catch (parseErr) {
				throw new Error('Server response was not valid JSON. Please restart the backend.');
			}

			// Save session ID on first message
			if (!sessionId) {
				sessionId = data.sessionId;
				localStorage.setItem('chatSessionId', sessionId);
			}

			// Reload history to replace optimistic bubble with persisted messages
			await loadHistory();
		} catch (err) {
			const details = err instanceof Error ? err.message : String(err);
			const friendly = 'Could not reach the assistant. Please ensure the backend is running and try again.';
			error = `${friendly} Details: ${details}`;

			// Surface failure inline so the user knows the message was not delivered
			messages = [
				...messages,
				{
					id: `error-${Date.now()}`,
					sender: 'assistant',
					text: `⚠️ ${friendly}\nMessage was not delivered. Details: ${details}`,
					timestamp: new Date().toISOString(),
				},
			];
			await scrollToBottom();
		} finally {
			isLoading = false;
		}
	}

	// Auto-scroll to latest message
	async function scrollToBottom() {
		await tick();
		if (messageContainer) {
			messageContainer.scrollTo({ top: messageContainer.scrollHeight, behavior: 'smooth' });
		}
	}

	// Initialize: load session and history
	onMount(() => {
		// Restore session from localStorage
		const saved = localStorage.getItem('chatSessionId');
		if (saved) {
			sessionId = saved;
			loadHistory();
		}
	});

	// Watch for new messages and scroll smoothly
	$: if (messages.length > 0) {
		scrollToBottom();
	}
</script>

<div class="page-shell">
	<div class="chat-shell">
		<header class="chat-header">
			<div class="title-block">
				<div class="pill-live">Live</div>
				<h1>Spur Assistant</h1>
				<p class="subtitle">Fast, focused answers for your tasks.</p>
			</div>
			<div class="session-block">
				{#if sessionId}
					<span class="session-chip">Session • {sessionId.slice(0, 8)}...</span>
				{:else}
					<span class="session-chip muted">New session</span>
				{/if}
			</div>
		</header>

		<div class="chat-body">
			<div class="messages-surface">
				<div class="messages-container" bind:this={messageContainer}>
					{#if messages.length === 0 && !isLoading && !error}
						<div class="empty-state">
							<div class="empty-icon">💬</div>
							<div>
								<h3>Start the conversation</h3>
								<p>Ask a question or paste context. The assistant responds instantly.</p>
							</div>
						</div>
					{/if}

					{#if error}
						<div class="error-message">
							<div class="error-badge">!</div>
							<div>
								<strong>Something went wrong</strong>
								<div class="error-text">{error}</div>
							</div>
						</div>
					{/if}

					{#each messages as msg (msg.id)}
						<Message message={msg} />
					{/each}

					{#if isLoading}
						<div class="loading-message">
							<div class="spinner"></div>
							<div>
								<div class="loading-label">Assistant is thinking</div>
								<div class="loading-sub">Crafting a concise reply...</div>
							</div>
						</div>
					{/if}
				</div>
			</div>

			<ChatInput {isLoading} onSend={sendMessage} />
		</div>
	</div>
</div>

<style>
	.page-shell {
		min-height: 100vh;
		background: radial-gradient(circle at 10% 20%, #e0f2ff 0, transparent 25%),
			radial-gradient(circle at 90% 10%, #ffe8f0 0, transparent 22%),
			radial-gradient(circle at 30% 80%, #e8f7ee 0, transparent 28%),
			linear-gradient(135deg, #f8fbff 0%, #f2f5ff 40%, #fdf8ff 100%);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1.5rem;
	}

	.chat-shell {
		background: rgba(255, 255, 255, 0.9);
		backdrop-filter: blur(10px);
		border: 1px solid rgba(255, 255, 255, 0.65);
		box-shadow: 0 12px 32px rgba(15, 23, 42, 0.06);
		border-radius: 16px;
		max-width: 1100px;
		width: 100%;
		height: min(90vh, 900px);
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.chat-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.65rem 0.9rem;
		border-bottom: 1px solid rgba(0, 0, 0, 0.04);
		background: linear-gradient(180deg, rgba(255, 255, 255, 0.94) 0%, rgba(255, 255, 255, 0.8) 100%);
	}

	.title-block h1 {
		margin: 0;
		font-size: 1.15rem;
		font-weight: 700;
		color: #0f172a;
		letter-spacing: -0.01em;
	}

	.subtitle {
		display: none;
	}

	.pill-live {
		display: inline-flex;
		align-items: center;
		gap: 0.2rem;
		padding: 0.2rem 0.45rem;
		font-size: 0.68rem;
		font-weight: 600;
		color: #0f172a;
		background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
		border-radius: 999px;
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8);
	}

	.session-block {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.session-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.3rem 0.55rem;
		border-radius: 8px;
		border: 1px solid rgba(15, 23, 42, 0.07);
		background: rgba(255, 255, 255, 0.82);
		color: #0f172a;
		font-size: 0.74rem;
		font-weight: 600;
		font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', monospace;
	}

	.session-chip.muted {
		color: #94a3b8;
		border-color: rgba(148, 163, 184, 0.3);
	}

	.chat-body {
		flex: 1;
		display: grid;
		grid-template-rows: 1fr auto;
		background: linear-gradient(180deg, rgba(255, 255, 255, 0.8) 0%, rgba(248, 250, 252, 0.9) 100%);
		min-height: 0;
	}

	.messages-surface {
		min-height: 0;
		padding: 1.25rem 1.25rem 0.75rem;
		overflow: hidden;
	}

	.messages-container {
		min-height: 0;
		height: 100%;
		background: rgba(255, 255, 255, 0.72);
		border: 1px solid rgba(15, 23, 42, 0.05);
		border-radius: 16px;
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8), 0 10px 30px rgba(15, 23, 42, 0.04);
		padding: 1.25rem;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.empty-state {
		display: flex;
		gap: 0.9rem;
		align-items: center;
		justify-content: center;
		height: 100%;
		color: #475569;
		text-align: left;
	}

	.empty-state h3 {
		margin: 0 0 0.25rem;
		color: #0f172a;
		font-size: 1.1rem;
	}

	.empty-state p {
		margin: 0;
		color: #64748b;
		font-size: 0.95rem;
	}

	.empty-icon {
		font-size: 1.6rem;
	}

	.error-message {
		display: flex;
		gap: 0.75rem;
		align-items: center;
		padding: 0.9rem 1rem;
		border-radius: 12px;
		background: linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%);
		border: 1px solid #fecdd3;
		color: #9f1239;
		box-shadow: 0 6px 18px rgba(190, 24, 93, 0.08);
	}

	.error-badge {
		width: 26px;
		height: 26px;
		border-radius: 50%;
		background: #fda4af;
		color: #881337;
		display: grid;
		place-items: center;
		font-weight: 700;
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);
	}

	.error-text {
		color: #9f1239;
		margin-top: 0.15rem;
		font-size: 0.95rem;
	}

	.loading-message {
		display: flex;
		align-items: center;
		gap: 0.85rem;
		padding: 0.85rem 1rem;
		background: rgba(15, 23, 42, 0.03);
		border: 1px solid rgba(15, 23, 42, 0.05);
		border-radius: 12px;
	}

	.loading-label {
		color: #0f172a;
		font-weight: 600;
		font-size: 0.95rem;
	}

	.loading-sub {
		color: #475569;
		font-size: 0.85rem;
	}

	.spinner {
		width: 20px;
		height: 20px;
		border: 2px solid rgba(148, 163, 184, 0.45);
		border-top-color: #0ea5e9;
		border-radius: 50%;
		animation: spin 0.55s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.messages-container::-webkit-scrollbar {
		width: 8px;
	}

	.messages-container::-webkit-scrollbar-track {
		background: transparent;
	}

	.messages-container::-webkit-scrollbar-thumb {
		background: rgba(148, 163, 184, 0.5);
		border-radius: 6px;
	}

	.messages-container::-webkit-scrollbar-thumb:hover {
		background: rgba(100, 116, 139, 0.7);
	}

	@media (max-width: 900px) {
		.page-shell {
			padding: 0.75rem;
		}

		.chat-shell {
			height: 100vh;
			max-width: 100%;
			border-radius: 0;
		}
	}

	@media (max-width: 640px) {
		.chat-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.65rem;
		}

		.session-block {
			width: 100%;
			justify-content: flex-start;
		}

		.messages-surface {
			padding: 1rem 0.85rem 0.5rem;
		}

		.messages-container {
			padding: 1rem;
		}

		.subtitle {
			font-size: 0.9rem;
		}
	}
</style>
