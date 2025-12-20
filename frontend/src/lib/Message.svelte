<!--
  Message Component
  
  Individual message display with sender styling.
  Shows either user or assistant messages with appropriate styling.
-->

<script lang="ts">
	interface Message {
		id: string;
		sender: 'user' | 'assistant';
		text: string;
		timestamp: string;
	}

	export let message: Message;

	// Format timestamp
	function formatTime(isoString: string): string {
		const date = new Date(isoString);
		return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	}
</script>

<div class={`message message-${message.sender}`}>
	<div class="avatar" aria-hidden="true">
		{message.sender === 'user' ? '🧑' : '🤖'}
	</div>
	<div class="bubble">
		<p class="message-text">{message.text}</p>
		<span class="message-time">{formatTime(message.timestamp)}</span>
	</div>
</div>

<style>
	.message {
		display: flex;
		gap: 0.55rem;
		align-items: flex-end;
		animation: slideIn 180ms cubic-bezier(0.16, 1, 0.3, 1);
	}

	@keyframes slideIn {
		from {
			opacity: 0;
			transform: translateY(6px) scale(0.99);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}

	.message-user {
		flex-direction: row-reverse;
		text-align: right;
	}

	.avatar {
		width: 34px;
		height: 34px;
		border-radius: 50%;
		background: #f1f5f9;
		display: grid;
		place-items: center;
		font-size: 1rem;
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8);
	}

	.message-user .avatar {
		background: #dbeafe;
	}

	.bubble {
		max-width: min(78%, 760px);
		padding: 0.9rem 1rem;
		border-radius: 14px;
		box-shadow: 0 4px 14px rgba(15, 23, 42, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.65);
		border: 1px solid rgba(15, 23, 42, 0.04);
	}

	.message-user .bubble {
		background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
		color: #eaf2ff;
		border: none;
		box-shadow: 0 8px 18px rgba(37, 99, 235, 0.22);
	}

	.message-assistant .bubble {
		background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
		color: #0f172a;
	}

	.message-text {
		margin: 0;
		line-height: 1.5;
		word-wrap: break-word;
		white-space: pre-wrap;
		font-size: 0.98rem;
	}

	.message-time {
		display: block;
		font-size: 0.78rem;
		margin-top: 0.35rem;
		opacity: 0.75;
	}

	.message-user .message-time {
		text-align: right;
	}

	@media (max-width: 640px) {
		.bubble {
			max-width: 88%;
			padding: 0.8rem 0.9rem;
		}

		.avatar {
			width: 30px;
			height: 30px;
		}
	}
</style>
