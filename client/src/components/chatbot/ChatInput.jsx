/**
 * @fileoverview Chat input component with send button and attachment support.
 */

import { useState, useRef, useEffect } from 'react';
import { Send, X } from 'lucide-react';

/**
 * Chat input component
 * @param {Object} props
 * @param {function(string): void} props.onSend - Callback when sending a message
 * @param {boolean} props.disabled - Whether input is disabled
 * @param {number} props.maxLength - Maximum message length
 * @param {string} [props.placeholder] - Input placeholder text
 * @returns {JSX.Element}
 */
const ChatInput = ({
    onSend,
    disabled = false,
    maxLength = 4000,
    placeholder = 'Type your message...',
}) => {
    const [message, setMessage] = useState('');
    const [attachments, setAttachments] = useState([]);
    const textareaRef = useRef(null);
    const fileInputRef = useRef(null);

    // Auto-resize textarea
    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
        }
    }, [message]);

    /**
     * Handles form submission
     * @param {React.FormEvent} e - Form event
     */
    const handleSubmit = (e) => {
        e.preventDefault();
        if (message.trim() && !disabled) {
            onSend(message.trim());
            setMessage('');
            setAttachments([]);
            // Reset textarea height
            if (textareaRef.current) {
                textareaRef.current.style.height = 'auto';
            }
        }
    };

    /**
     * Handles keyboard events
     * @param {React.KeyboardEvent} e - Keyboard event
     */
    const handleKeyDown = (e) => {
        // Send on Enter (without Shift)
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    /**
     * Handles file selection
     * @param {React.ChangeEvent<HTMLInputElement>} e - Change event
     */
    const handleFileChange = (e) => {
        const files = Array.from(e.target.files || []);
        const newAttachments = files.map((file) => ({
            id: `${Date.now()}_${file.name}`,
            name: file.name,
            type: file.type,
            size: file.size,
            file,
        }));
        setAttachments((prev) => [...prev, ...newAttachments].slice(0, 5)); // Max 5 attachments
    };

    /**
     * Removes an attachment
     * @param {string} id - Attachment ID
     */
    const removeAttachment = (id) => {
        setAttachments((prev) => prev.filter((att) => att.id !== id));
    };

    const isOverLimit = message.length > maxLength;
    const canSend = message.trim().length > 0 && !isOverLimit && !disabled;

    return (
        <form onSubmit={handleSubmit} className="chat-input-form">
            {/* Attachments preview */}
            {attachments.length > 0 && (
                <div className="chat-input-attachments">
                    {attachments.map((att) => (
                        <div key={att.id} className="chat-input-attachment">
                            <span className="chat-input-attachment-name">{att.name}</span>
                            <button
                                type="button"
                                onClick={() => removeAttachment(att.id)}
                                className="chat-input-attachment-remove"
                                aria-label={`Remove ${att.name}`}
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <div className="chat-input-container">
                {/* Message input */}
                <textarea
                    ref={textareaRef}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    disabled={disabled}
                    rows={1}
                    className={`chat-input-textarea ${isOverLimit ? 'chat-input-error' : ''}`}
                    aria-label="Message input"
                    aria-invalid={isOverLimit}
                />

                {/* Character count */}
                {message.length > maxLength * 0.8 && (
                    <span className={`chat-input-counter ${isOverLimit ? 'chat-input-counter-error' : ''}`}>
                        {message.length}/{maxLength}
                    </span>
                )}

                {/* Send button */}
                <button
                    type="submit"
                    disabled={!canSend}
                    className="chat-input-send-btn"
                    aria-label="Send message"
                >
                    <Send className="w-5 h-5" />
                </button>
            </div>
        </form>
    );
};

export default ChatInput;
