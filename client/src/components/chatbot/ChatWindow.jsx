/**
 * @fileoverview Expandable chat window component with header, messages, and input.
 */

import { useEffect, useRef } from 'react';
import { X, Trash2, AlertCircle } from 'lucide-react';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import QuickActions from './QuickActions';
import TypingIndicator from './TypingIndicator';

/**
 * Chat window component
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the window is open
 * @param {function(): void} props.onClose - Callback to close the window
 * @param {function(): void} props.onMinimize - Callback to minimize the window
 * @param {import('../../types/chat.types').Message[]} props.messages - Chat messages
 * @param {boolean} props.isLoading - Whether a message is being processed
 * @param {boolean} props.isTyping - Whether the assistant is typing
 * @param {string | null} props.error - Current error message
 * @param {function(string): void} props.onSendMessage - Callback to send a message
 * @param {function(): void} props.onClearChat - Callback to clear chat
 * @param {function(string): void} props.onExport - Callback to export chat
 * @param {function(): void} props.onDismissError - Callback to dismiss error
 * @param {import('../../types/chat.types').QuickAction[]} props.quickActions - Quick actions
 * @param {number} props.maxMessageLength - Maximum message length
 * @returns {JSX.Element | null}
 */
const ChatWindow = ({
    isOpen,
    onClose,
    onMinimize,
    messages,
    isLoading,
    isTyping,
    error,
    onSendMessage,
    onClearChat,
    onExport,
    onDismissError,
    quickActions,
    maxMessageLength,
}) => {
    const messagesEndRef = useRef(null);
    const windowRef = useRef(null);

    // Scroll to bottom when messages change
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isTyping]);

    // Handle escape key to close
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    // Focus trap
    useEffect(() => {
        if (isOpen && windowRef.current) {
            const focusableElements = windowRef.current.querySelectorAll(
                'button, textarea, input, [tabindex]:not([tabindex="-1"])'
            );
            if (focusableElements.length > 0) {
                focusableElements[0].focus();
            }
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div
            ref={windowRef}
            className="chat-window"
            role="dialog"
            aria-modal="true"
            aria-label="Chat with AI Assistant"
        >
            {/* Header */}
            <div className="chat-window-header">
                <div className="chat-window-title">
                    <div className="chat-window-avatar">
                        <img src="/logo.png" alt="MindTrace" className="w-6 h-6 object-contain" />
                    </div>
                    <div>
                        <h2 className="chat-window-name">AI Assistant</h2>
                        <span className="chat-window-status">
                            {isTyping ? 'Typing...' : 'Online'}
                        </span>
                    </div>
                </div>

                <div className="chat-window-actions">
                    {messages.length > 0 && (
                        <button
                            type="button"
                            onClick={onClearChat}
                            className="chat-window-action-btn chat-window-action-danger"
                            aria-label="Clear chat"
                            title="Clear conversation"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onClose}
                        className="chat-window-action-btn"
                        aria-label="Close chat"
                        title="Close"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Error banner */}
            {error && (
                <div className="chat-window-error" role="alert">
                    <AlertCircle className="w-4 h-4" />
                    <span>{error}</span>
                    <button
                        type="button"
                        onClick={onDismissError}
                        className="chat-window-error-dismiss"
                        aria-label="Dismiss error"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Messages */}
            <div className="chat-window-messages">
                {messages.length === 0 ? (
                    <div className="chat-window-empty">
                        <div className="chat-window-empty-icon">💬</div>
                        <h3>Start a conversation</h3>
                        <p>Ask me anything about your contacts, reminders, or get help with the dashboard.</p>

                        {/* Quick actions for empty state */}
                        <QuickActions
                            actions={quickActions}
                            onAction={onSendMessage}
                            disabled={isLoading}
                        />
                    </div>
                ) : (
                    <>
                        {messages.map((message) => (
                            <ChatMessage key={message.id} message={message} />
                        ))}
                        {isTyping && !messages.some((m) => m.isStreaming) && (
                            <div className="chat-message chat-message-assistant">
                                <div className="chat-message-avatar chat-avatar-assistant">
                                    <img src="/logo.png" alt="MindTrace" className="w-6 h-6 object-contain" />
                                </div>
                                <div className="chat-message-content">
                                    <div className="chat-message-bubble">
                                        <TypingIndicator />
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </>
                )}
            </div>

            {/* Quick actions when there are messages */}
            {messages.length > 0 && !isLoading && (
                <div className="chat-window-quick-actions-bar">
                    <QuickActions
                        actions={quickActions.slice(0, 3)}
                        onAction={onSendMessage}
                        disabled={isLoading}
                    />
                </div>
            )}

            {/* Input */}
            <div className="chat-window-input">
                <ChatInput
                    onSend={onSendMessage}
                    disabled={isLoading}
                    maxLength={maxMessageLength}
                />
            </div>
        </div>
    );
};

export default ChatWindow;
