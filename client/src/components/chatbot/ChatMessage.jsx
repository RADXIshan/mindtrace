/**
 * @fileoverview Individual chat message component with markdown rendering.
 */

import { useMemo } from 'react';
import { User, AlertCircle } from 'lucide-react';
import TypingIndicator from './TypingIndicator';

/**
 * Simple markdown parser for basic formatting.
 * Supports: **bold**, *italic*, `code`, ```code blocks```, links, and line breaks.
 * @param {string} text - The text to parse
 * @returns {string} HTML string
 */
const parseMarkdown = (text) => {
    if (!text) return '';

    let html = text
        // Escape HTML entities
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        // Code blocks (must be before inline code)
        .replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre class="chat-code-block"><code>$2</code></pre>')
        // Inline code
        .replace(/`([^`]+)`/g, '<code class="chat-inline-code">$1</code>')
        // Bold
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        // Italic
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        // Links
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
        // Line breaks
        .replace(/\n/g, '<br />');

    return html;
};

/**
 * Chat message component
 * @param {Object} props
 * @param {import('../../types/chat.types').Message} props.message - The message to display
 * @returns {JSX.Element}
 */
const ChatMessage = ({ message }) => {
    const isUser = message.role === 'user';
    const isError = message.isError;

    // Parse markdown content
    const htmlContent = useMemo(() => {
        if (message.isStreaming && !message.content) {
            return null; // Will show typing indicator
        }
        return parseMarkdown(message.content);
    }, [message.content, message.isStreaming]);

    // Format timestamp
    const formattedTime = useMemo(() => {
        const date = new Date(message.timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }, [message.timestamp]);

    return (
        <div
            className={`chat-message ${isUser ? 'chat-message-user' : 'chat-message-assistant'} ${isError ? 'chat-message-error' : ''
                }`}
            role="article"
            aria-label={`${isUser ? 'Your' : 'Assistant'} message at ${formattedTime}`}
        >
            {/* Avatar */}
            <div className={`chat-message-avatar ${isUser ? 'chat-avatar-user' : 'chat-avatar-assistant'}`}>
                {isUser ? (
                    <User className="w-4 h-4" />
                ) : isError ? (
                    <AlertCircle className="w-4 h-4" />
                ) : (
                    <img src="/logo.png" alt="MindTrace" className="w-4 h-4 object-contain" />
                )}
            </div>

            {/* Content */}
            <div className="chat-message-content">
                <div className="chat-message-bubble">
                    {message.isStreaming && !message.content ? (
                        <TypingIndicator />
                    ) : (
                        <div
                            className="chat-message-text"
                            dangerouslySetInnerHTML={{ __html: htmlContent }}
                        />
                    )}
                </div>

                {/* Timestamp */}
                <span className="chat-message-time">{formattedTime}</span>

                {/* Attachments */}
                {message.attachments && message.attachments.length > 0 && (
                    <div className="chat-message-attachments">
                        {message.attachments.map((att) => (
                            <div key={att.id} className="chat-attachment">
                                <span className="chat-attachment-name">{att.name}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatMessage;
