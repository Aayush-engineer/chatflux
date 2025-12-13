import { writable, derived } from 'svelte/store';

// Messages store with helper methods
function createMessagesStore() {
  const { subscribe, set, update } = writable([]);

  return {
    subscribe,
    addMessage: (message) => update(messages => [...messages, message]),
    setMessages: (messages) => set(messages),
    clear: () => set([])
  };
}

export const messages = createMessagesStore();

// Connection status: 'connected' | 'connecting' | 'disconnected' | 'error'
export const connectionStatus = writable('disconnected');

// Typing users (Set of socket IDs)
export const typingUsers = writable(new Set());

// Current user info
export const currentUser = writable({
  socketId: null,
  joinedAt: null
});

// UI state
export const uiState = writable({
  isTyping: false,
  unreadCount: 0
});

// Derived stores
export const sortedMessages = derived(messages, $messages => 
  [...$messages].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
);

export const isConnected = derived(connectionStatus, $status => 
  $status === 'connected'
);