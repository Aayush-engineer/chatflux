import { io } from 'socket.io-client';
import { messages, connectionStatus, typingUsers, currentUser } from '$lib/stores/chat';
import { browser } from '$app/environment';

let socket = null;

// Get API URL from environment or use default
const API_URL = browser ? (window.location.hostname === 'localhost' 
  ? 'http://localhost:3000' 
  : window.location.origin) : 'http://localhost:3000';

export function initSocket() {
  if (!browser || socket?.connected) return socket;

  console.log('Connecting to:', API_URL);
  connectionStatus.set('connecting');

  socket = io(API_URL, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5
  });

  // Connection events
  socket.on('connect', () => {
    console.log('✅ Connected:', socket.id);
    connectionStatus.set('connected');
    currentUser.update(u => ({ ...u, socketId: socket.id, joinedAt: Date.now() }));
    loadMessages();
  });

  socket.on('disconnect', (reason) => {
    console.log('❌ Disconnected:', reason);
    connectionStatus.set('disconnected');
  });

  socket.on('connect_error', (error) => {
    console.error('Connection error:', error);
    connectionStatus.set('error');
  });

  // Message events
  socket.on('chat message', (msg) => {
    console.log('📩 Message received:', msg);
    const message = typeof msg === 'string' ? JSON.parse(msg) : msg;
    messages.addMessage({
      ...message,
      id: `${message.socket_id}-${message.createdAt}`,
      createdAt: message.createdAt || Date.now()
    });
  });

  // Typing events
  socket.on('user typing', ({ socketId, isTyping }) => {
    typingUsers.update(users => {
      const newUsers = new Set(users);
      isTyping ? newUsers.add(socketId) : newUsers.delete(socketId);
      return newUsers;
    });
  });

  return socket;
}

export function sendMessage(text) {
  if (!socket?.connected || !text.trim()) return false;
  socket.emit('chat message', text.trim());
  return true;
}

export function sendTypingIndicator(isTyping) {
  if (!socket?.connected) return;
  socket.emit('typing', isTyping);
}

async function loadMessages() {
  try {
    const response = await fetch(`${API_URL}/get_messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ limit: 50, roomId: 'global' })
    });

    if (!response.ok) throw new Error('Failed to load messages');

    const data = await response.json();
    if (data.success && data.messages) {
      const parsedMessages = data.messages.map(msg => {
        const parsed = typeof msg === 'string' ? JSON.parse(msg) : msg;
        return {
          ...parsed,
          id: `${parsed.socket_id}-${parsed.createdAt}`,
          createdAt: parsed.createdAt || Date.now()
        };
      });
      messages.setMessages(parsedMessages);
    }
  } catch (error) {
    console.error('Error loading messages:', error);
  }
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
    connectionStatus.set('disconnected');
  }
}