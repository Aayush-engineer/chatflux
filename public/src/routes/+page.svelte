<script>
  import { onMount, onDestroy, afterUpdate } from 'svelte';
  import { sortedMessages, connectionStatus, currentUser, typingUsers, isConnected } from '$lib/stores/chat';
  import { initSocket, disconnectSocket, sendMessage, sendTypingIndicator } from '$lib/utils/socket';
  import { formatTimestamp, getInitials, getAvatarColor, isOwnMessage, linkifyUrls, sanitizeHtml, debounce } from '$lib/utils/formatters';

  let messageInput = '';
  let messagesContainer;
  let autoScroll = true;
  let textareaElement;

  onMount(() => {
    initSocket();
    
    const handleScroll = () => {
      if (!messagesContainer) return;
      const { scrollTop, scrollHeight, clientHeight } = messagesContainer;
      autoScroll = scrollHeight - scrollTop - clientHeight < 100;
    };

    messagesContainer?.addEventListener('scroll', handleScroll);
    return () => messagesContainer?.removeEventListener('scroll', handleScroll);
  });

  afterUpdate(() => {
    if (autoScroll && messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  });

  onDestroy(() => {
    disconnectSocket();
  });

  const debouncedStopTyping = debounce(() => {
    sendTypingIndicator(false);
  }, 1000);

  function handleInput() {
    if (!$isConnected || messageInput.length === 0) return;
    sendTypingIndicator(true);
    debouncedStopTyping();
    
    if (textareaElement) {
      textareaElement.style.height = 'auto';
      textareaElement.style.height = Math.min(textareaElement.scrollHeight, 150) + 'px';
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!messageInput.trim() || !$isConnected) return;

    const success = sendMessage(messageInput);
    if (success) {
      messageInput = '';
      sendTypingIndicator(false);
      if (textareaElement) textareaElement.style.height = 'auto';
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  function scrollToBottom() {
    if (messagesContainer) {
      messagesContainer.scrollTo({ top: messagesContainer.scrollHeight, behavior: 'smooth' });
      autoScroll = true;
    }
  }

  function formatMessage(text) {
    if (!text) return '';
    const linked = linkifyUrls(String(text));
    return sanitizeHtml(linked);
  }

  $: statusConfig = {
    connected: { color: 'bg-green-500', text: 'Connected', pulse: false },
    connecting: { color: 'bg-yellow-500', text: 'Connecting...', pulse: true },
    disconnected: { color: 'bg-gray-500', text: 'Disconnected', pulse: false },
    error: { color: 'bg-red-500', text: 'Connection Error', pulse: false }
  }[$connectionStatus];

  $: typingCount = $typingUsers.size;
</script>

<div class="flex flex-col h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
  <!-- Header -->
  <header class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
    <div class="container mx-auto px-4 py-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <div>
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">ChatFlux</h1>
            <p class="text-sm text-gray-500 dark:text-gray-400">Real-time distributed chat</p>
          </div>
        </div>

        <div class="text-right">
          <div class="text-sm font-medium text-gray-700 dark:text-gray-300">
            {$sortedMessages.length} messages
          </div>
          {#if $currentUser.socketId}
            <div class="text-xs text-gray-500 dark:text-gray-400">
              ID: {$currentUser.socketId.slice(0, 8)}
            </div>
          {/if}
        </div>
      </div>
    </div>
  </header>

  <!-- Connection Status -->
  <div class="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-2">
    <div class="container mx-auto flex items-center justify-between text-sm">
      <div class="flex items-center gap-2">
        <span class="w-2 h-2 rounded-full {statusConfig.color} {statusConfig.pulse ? 'animate-pulse' : ''}" />
        <span class="text-gray-600 dark:text-gray-400">{statusConfig.text}</span>
      </div>

      {#if typingCount > 0}
        <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
          <div class="flex gap-1">
            <span class="w-1.5 h-1.5 bg-gray-400 rounded-full typing-dot" />
            <span class="w-1.5 h-1.5 bg-gray-400 rounded-full typing-dot" />
            <span class="w-1.5 h-1.5 bg-gray-400 rounded-full typing-dot" />
          </div>
          <span class="text-xs">{typingCount} typing</span>
        </div>
      {/if}
    </div>
  </div>

  <!-- Messages Container -->
  <div bind:this={messagesContainer} class="flex-1 overflow-y-auto scrollbar-thin px-4 py-6">
    <div class="container mx-auto max-w-4xl space-y-4">
      {#if $sortedMessages.length === 0}
        <div class="flex items-center justify-center h-full">
          <div class="text-center animate-fade-in">
            <div class="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900 dark:to-primary-800 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-primary-600 dark:text-primary-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p class="text-gray-600 dark:text-gray-300 text-lg font-semibold mb-2">No messages yet</p>
            <p class="text-gray-400 dark:text-gray-500 text-sm">Be the first to start the conversation!</p>
          </div>
        </div>
      {:else}
        {#each $sortedMessages as message (message.id)}
          {@const isOwn = isOwnMessage(message.socket_id, $currentUser.socketId)}
          {@const isSystem = ['join', 'leave', 'system'].includes(message.messageType)}
          {@const avatarColor = getAvatarColor(message.socket_id)}
          {@const initials = getInitials(message.socket_id)}

          {#if isSystem}
            <!-- System Message -->
            <div class="flex justify-center my-2 message-enter">
              <div class="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs px-4 py-2 rounded-full shadow-sm">
                {@html formatMessage(message.message)}
                <span class="ml-2 opacity-60">{formatTimestamp(message.createdAt)}</span>
              </div>
            </div>
          {:else}
            <!-- User Message -->
            <div class="flex gap-3 message-enter {isOwn ? 'flex-row-reverse' : ''}">
              <!-- Avatar -->
              <div class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md" style="background-color: {avatarColor}">
                {initials}
              </div>

              <!-- Message Content -->
              <div class="flex flex-col max-w-[70%] {isOwn ? 'items-end' : 'items-start'}">
                <div class="flex items-center gap-2 mb-1 px-1">
                  <span class="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    {message.socket_id.slice(0, 8)}...
                  </span>
                  <span class="text-xs text-gray-500 dark:text-gray-400">
                    {formatTimestamp(message.createdAt)}
                  </span>
                </div>

                <div class="px-4 py-3 rounded-2xl shadow-md {isOwn 
                  ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white rounded-tr-sm' 
                  : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-tl-sm border border-gray-200 dark:border-gray-700'
                }">
                  <div class="text-sm whitespace-pre-wrap break-words">
                    {@html formatMessage(message.message)}
                  </div>
                </div>
              </div>
            </div>
          {/if}
        {/each}
      {/if}
    </div>
  </div>

  <!-- Scroll to Bottom Button -->
  {#if !autoScroll && $sortedMessages.length > 0}
    <div class="absolute bottom-24 right-6 animate-fade-in">
      <button on:click={scrollToBottom} class="bg-white dark:bg-gray-800 border-2 border-primary-500 rounded-full p-3 shadow-xl hover:shadow-2xl transition-all hover:scale-110" aria-label="Scroll to bottom">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </button>
    </div>
  {/if}

  <!-- Input Area -->
  <form on:submit={handleSubmit} class="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg">
    <div class="container mx-auto px-4 py-4">
      <div class="flex gap-3 items-end">
        <div class="flex-1 relative">
          <textarea
            bind:this={textareaElement}
            bind:value={messageInput}
            on:input={handleInput}
            on:keydown={handleKeyDown}
            placeholder={$isConnected ? "Type a message..." : "Connecting..."}
            disabled={!$isConnected}
            class="w-full resize-none rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            rows="1"
            maxlength="5000"
          />
        </div>

        <button
          type="submit"
          disabled={!$isConnected || !messageInput.trim()}
          class="flex-shrink-0 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 disabled:from-gray-300 disabled:to-gray-400 dark:disabled:from-gray-700 dark:disabled:to-gray-800 text-white rounded-xl px-6 py-3 font-semibold transition-all disabled:cursor-not-allowed shadow-md hover:shadow-lg disabled:shadow-none flex items-center gap-2 hover:scale-105 active:scale-95"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
          </svg>
          <span class="hidden sm:inline">Send</span>
        </button>
      </div>

      <div class="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 mt-2 px-1">
        <span>Press Enter to send, Shift+Enter for new line</span>
        <span>{messageInput.length}/5000</span>
      </div>
    </div>
  </form>
</div>

<style>
  :global(a) {
    text-decoration: underline;
    word-break: break-all;
  }

  textarea {
    max-height: 150px;
  }
</style>