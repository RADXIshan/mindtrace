/**
 * @fileoverview Chat API service for communicating with the backend.
 * Handles message sending, streaming responses, and rate limiting.
 */

import api from './api';

/** @type {number} */
let lastMessageTime = 0;

/** @type {number} */
const RATE_LIMIT_MS = 1000;

/**
 * Generates a unique ID for messages
 * @returns {string} Unique identifier
 */
export const generateId = () => {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * Generates a unique conversation ID
 * @returns {string} Unique conversation identifier
 */
export const generateConversationId = () => {
    return `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * Checks if sending a message is allowed based on rate limiting
 * @returns {boolean} Whether sending is allowed
 */
export const canSendMessage = () => {
    const now = Date.now();
    return now - lastMessageTime >= RATE_LIMIT_MS;
};

/**
 * Gets the remaining wait time for rate limiting
 * @returns {number} Milliseconds until next message can be sent
 */
export const getRateLimitRemaining = () => {
    const now = Date.now();
    const elapsed = now - lastMessageTime;
    return Math.max(0, RATE_LIMIT_MS - elapsed);
};

/**
 * Sends a chat message to the backend API
 * @param {Object} params - Message parameters
 * @param {string} params.message - The message content
 * @param {string} params.conversationId - The conversation ID
 * @param {Object} [params.context] - Optional context object
 * @returns {Promise<Object>} The API response
 */
export const sendMessage = async ({ message, conversationId, context = {} }) => {
    // Update rate limit tracking
    lastMessageTime = Date.now();

    try {
        const response = await api.post('/chat/message', {
            message,
            conversation_id: conversationId,
            context,
        });
        return response.data;
    } catch (error) {
        // Transform error for user-friendly display
        if (error.response) {
            const status = error.response.status;
            if (status === 429) {
                throw new Error('Too many messages. Please wait a moment and try again.');
            } else if (status === 503) {
                throw new Error('AI service is temporarily unavailable. Please try again later.');
            } else if (status >= 500) {
                throw new Error('Server error. Our team has been notified.');
            }
            throw new Error(error.response.data?.detail || 'Failed to send message.');
        }
        throw new Error('Network error. Please check your connection.');
    }
};

/**
 * Sends a chat message with streaming response support
 * @param {Object} params - Message parameters
 * @param {string} params.message - The message content
 * @param {string} params.conversationId - The conversation ID
 * @param {Object} [params.context] - Optional context object
 * @param {function(string): void} params.onChunk - Callback for each streamed chunk
 * @param {function(): void} params.onComplete - Callback when streaming completes
 * @param {function(Error): void} params.onError - Callback for errors
 * @returns {Promise<void>}
 */
export const sendMessageStreaming = async ({
    message,
    conversationId,
    context = {},
    onChunk,
    onComplete,
    onError,
}) => {
    // Update rate limit tracking
    lastMessageTime = Date.now();

    try {
        const baseUrl = import.meta.env.VITE_API_URL ||
            import.meta.env.VITE_BASE_URL ||
            'http://localhost:8000';
        const token = localStorage.getItem('token');

        const response = await fetch(`${baseUrl}/chat/stream`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token && { Authorization: `Bearer ${token}` }),
            },
            credentials: 'include',
            body: JSON.stringify({
                message,
                conversation_id: conversationId,
                context,
            }),
        });

        if (!response.ok) {
            const status = response.status;
            if (status === 429) {
                throw new Error('Too many messages. Please wait a moment and try again.');
            } else if (status === 503) {
                throw new Error('AI service is temporarily unavailable. Please try again later.');
            }
            throw new Error('Failed to send message.');
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
            throw new Error('Streaming not supported by the browser.');
        }

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            // Parse SSE format
            const lines = chunk.split('\n');
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]') {
                        onComplete();
                        return;
                    }
                    try {
                        const parsed = JSON.parse(data);
                        if (parsed.content) {
                            onChunk(parsed.content);
                        }
                    } catch {
                        // If not JSON, treat as plain text chunk
                        onChunk(data);
                    }
                }
            }
        }

        onComplete();
    } catch (error) {
        onError(error instanceof Error ? error : new Error('Unknown error occurred'));
    }
};

/**
 * Exports conversation to a downloadable format
 * @param {import('../types/chat.types').Message[]} messages - Messages to export
 * @param {string} format - Export format ('json' | 'text')
 * @returns {void}
 */
export const exportConversation = (messages, format = 'text') => {
    let content;
    let filename;
    let mimeType;

    if (format === 'json') {
        content = JSON.stringify(messages, null, 2);
        filename = `chat-export-${Date.now()}.json`;
        mimeType = 'application/json';
    } else {
        content = messages
            .map((msg) => {
                const role = msg.role === 'user' ? 'You' : 'Assistant';
                const time = new Date(msg.timestamp).toLocaleString('en-IN', {
                    timeZone: 'Asia/Kolkata',
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                });
                return `[${time} IST] ${role}:\n${msg.content}\n`;
            })
            .join('\n---\n\n');
        filename = `chat-export-${Date.now()}.txt`;
        mimeType = 'text/plain';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

export const chatApi = {
    sendMessage,
    sendMessageStreaming,
    exportConversation,
    canSendMessage,
    getRateLimitRemaining,
    generateId,
    generateConversationId,
};

export default chatApi;
