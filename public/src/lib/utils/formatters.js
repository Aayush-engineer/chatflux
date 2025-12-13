import { format, formatDistanceToNow } from 'date-fns';
import DOMPurify from 'dompurify';
import { browser } from '$app/environment';

export function formatTimestamp(timestamp) {
  if (!timestamp) return '';
  
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  
  if (diff < 60000) return 'Just now';
  if (diff < 86400000) return formatDistanceToNow(date, { addSuffix: true });
  if (diff < 604800000) return format(date, 'EEE h:mm a');
  return format(date, 'MMM d, h:mm a');
}

export function sanitizeHtml(html) {
  if (!browser) return html;
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'br'],
    ALLOWED_ATTR: ['href', 'target', 'rel']
  });
}

export function linkifyUrls(text) {
  if (!text) return '';
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-primary-500 hover:underline break-all">$1</a>');
}

export function getInitials(socketId) {
  if (!socketId) return '?';
  return socketId.slice(0, 2).toUpperCase();
}

export function getAvatarColor(socketId) {
  if (!socketId) return '#gray';
  
  const colors = [
    '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e',
    '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6',
    '#6366f1', '#8b5cf6', '#a855f7', '#ec4899', '#f43f5e'
  ];
  
  const hash = socketId.split('').reduce((acc, char) => 
    char.charCodeAt(0) + ((acc << 5) - acc), 0
  );
  
  return colors[Math.abs(hash) % colors.length];
}

export function isOwnMessage(messageSocketId, currentSocketId) {
  return messageSocketId === currentSocketId;
}

export function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}