/**
 * @fileoverview Individual chat message component with plain text rendering.
 */

import { useMemo } from 'react';
import { User, AlertCircle } from 'lucide-react';
import TypingIndicator from './TypingIndicator';

/**
 * Simple text formatter that preserves line breaks and escapes HTML.
 * @param {string} text - The text to format
 * @returns {string} HTML string with line breaks
 */
const formatPlainText = (text) => {
    if (!text) return '';

    return text
        // Escape HTML entities
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        // Preserve line breaks
        .replace(/\n/g, '<br />');
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

    // Format plain text content
    const htmlContent = useMemo(() => {
        if (message.isStreaming && !message.content) {
            return null; // Will show typing indicator
        }
        return formatPlainText(message.content);
    }, [message.content, message.isStreaming]);

    // Format timestamp
    const formattedTime = useMemo(() => {
        const date = new Date(message.timestamp);
        return date.toLocaleTimeString('en-IN', { 
            timeZone: 'Asia/Kolkata',
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }, [message.timestamp]);

    return (
        <div
            className={`flex gap-2.5 max-w-[85%] animate-[fadeIn_0.3s_ease] ${
                isUser ? 'flex-row-reverse self-end' : 'self-start'
            }`}
            role="article"
            aria-label={`${isUser ? 'Your' : 'Assistant'} message at ${formattedTime}`}
        >
            {/* Avatar */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                isUser ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-900'
            }`}>
                {isUser ? (
                    <User className="w-4 h-4" />
                ) : isError ? (
                    <AlertCircle className="w-4 h-4" />
                ) : (
                    <img src="/logo.png" alt="MindTrace" className="w-4 h-4 object-contain" />
                )}
            </div>

            {/* Content */}
            <div className="flex flex-col gap-1">
                <div className={`px-4 py-3 rounded-[18px] text-sm leading-relaxed ${
                    isUser 
                        ? 'bg-gray-900 text-white rounded-br-md shadow-[0_2px_4px_rgba(0,0,0,0.1)]' 
                        : isError
                        ? 'bg-red-50 text-red-500 border border-red-500 rounded-bl-md'
                        : 'bg-gray-200 text-gray-900 rounded-bl-md border border-gray-200'
                }`}>
                    {message.isStreaming && !message.content ? (
                        <TypingIndicator />
                    ) : (
                        <div
                            className="whitespace-pre-wrap wrap-break-word"
                            dangerouslySetInnerHTML={{ __html: htmlContent }}
                        />
                    )}
                </div>

                {/* Timestamp */}
                <span className={`text-[11px] text-gray-500 px-1 ${isUser ? 'text-right' : ''}`}>
                    {formattedTime}
                </span>

                {/* Attachments */}
                {message.attachments && message.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {message.attachments.map((att) => (
                            <div key={att.id} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs text-gray-900">
                                <span className="max-w-[120px] overflow-hidden text-ellipsis whitespace-nowrap">{att.name}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatMessage;
