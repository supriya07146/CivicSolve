import React, {
    useEffect,
    useRef,
    useState,
} from "react";

import {
    askCivicSolveAssistant,
} from "../services/api";

import "../styles/user/CivicSolveAssistant.css";

const SUGGESTED_QUESTIONS = [
    "How do I report a pothole?",
    "What does In Progress mean?",
    "How can I check my complaint status?",
    "Which organization handles waste collection?",
];

function getAnswer(response) {
    return (
        response?.answer ||
        response?.data?.answer ||
        response?.message ||
        response?.data?.message ||
        "I couldn't find an answer. Please try asking another question."
    );
}

function AssistantIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            width="25"
            height="25"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H7l-4 2v-5.5A7.5 7.5 0 1 1 20 11.5Z" />
            <path d="M8 11h.01M12 11h.01M16 11h.01" />
        </svg>
    );
}

function CloseIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            width="21"
            height="21"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
        >
            <path d="m18 6-12 12M6 6l12 12" />
        </svg>
    );
}

function SendIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            width="19"
            height="19"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="m22 2-7 20-4-9-9-4Z" />
            <path d="M22 2 11 13" />
        </svg>
    );
}

export default function CivicSolveAssistant() {
    const [isOpen, setIsOpen] = useState(false);
    const [message, setMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [messages, setMessages] = useState([
        {
            id: "welcome",
            role: "assistant",
            text:
                "Hello! I'm the CivicSolve AI Assistant. Ask me about reporting community problems, understanding statuses, checking your reports, or finding responsible organizations.",
        },
    ]);

    const inputRef = useRef(null);
    const messagesEndRef = useRef(null);
    const requestInProgressRef = useRef(false);

    useEffect(() => {
        if (isOpen) {
            messagesEndRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "end",
            });

            inputRef.current?.focus();
        }
    }, [isOpen, messages, isLoading]);

    const sendMessage = async (question = message) => {
        const text = String(question).trim();

        if (!text || requestInProgressRef.current) {
            return;
        }

        requestInProgressRef.current = true;
        setIsLoading(true);
        setMessage("");

        const userMessage = {
            id: `user-${Date.now()}`,
            role: "user",
            text,
        };

        setMessages((previous) => [
            ...previous,
            userMessage,
        ]);

        try {
            const response =
                await askCivicSolveAssistant(text);

            const answer = getAnswer(response);

            setMessages((previous) => [
                ...previous,
                {
                    id: `assistant-${Date.now()}`,
                    role: "assistant",
                    text: String(answer),
                },
            ]);
        } catch (error) {
            setMessages((previous) => [
                ...previous,
                {
                    id: `error-${Date.now()}`,
                    role: "error",
                    text:
                        error?.message ||
                        "I couldn't connect right now. Please try again.",
                },
            ]);
        } finally {
            requestInProgressRef.current = false;
            setIsLoading(false);

            requestAnimationFrame(() => {
                inputRef.current?.focus();
            });
        }
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        sendMessage();
    };

    const handleInputKeyDown = (event) => {
        if (
            event.key === "Enter" &&
            !event.shiftKey
        ) {
            event.preventDefault();

            if (!isLoading) {
                sendMessage();
            }
        }
    };

    const clearConversation = () => {
        if (isLoading) return;

        setMessages([
            {
                id: `welcome-${Date.now()}`,
                role: "assistant",
                text:
                    "Hello again! What would you like to know about CivicSolve?",
            },
        ]);
    };

    return (
        <div className="csa-widget">
            {isOpen && (
                <section
                    className="csa-panel"
                    role="dialog"
                    aria-modal="false"
                    aria-labelledby="csa-title"
                >
                    <header className="csa-header">
                        <div className="csa-header-info">
                            <div className="csa-avatar">
                                <AssistantIcon />
                                <span className="csa-online-dot" />
                            </div>

                            <div className="csa-heading">
                                <h2 id="csa-title">
                                    CivicSolve Assistant
                                </h2>
                                <p>
                                    Your community help desk
                                </p>
                            </div>
                        </div>

                        <div className="csa-header-actions">
                            <button
                                type="button"
                                className="csa-reset-button"
                                onClick={clearConversation}
                                disabled={isLoading}
                                title="Start a new conversation"
                                aria-label="Start a new conversation"
                            >
                                New chat
                            </button>

                            <button
                                type="button"
                                className="csa-close-button"
                                onClick={() => setIsOpen(false)}
                                aria-label="Close assistant"
                            >
                                <CloseIcon />
                            </button>
                        </div>
                    </header>

                    <div className="csa-messages">
                        <div className="csa-date-label">
                            CIVICSOLVE SUPPORT
                        </div>

                        {messages.map((item) => (
                            <div
                                key={item.id}
                                className={`csa-message-row ${
                                    item.role === "user"
                                        ? "csa-user-row"
                                        : "csa-assistant-row"
                                }`}
                            >
                                {item.role !== "user" && (
                                    <span
                                        className="csa-message-avatar"
                                        aria-hidden="true"
                                    >
                                        <AssistantIcon />
                                    </span>
                                )}

                                <div
                                    className={`csa-message ${
                                        item.role === "user"
                                            ? "csa-user-message"
                                            : item.role === "error"
                                                ? "csa-error-message"
                                                : "csa-assistant-message"
                                    }`}
                                >
                                    {item.text}
                                </div>
                            </div>
                        ))}

                        {isLoading && (
                            <div
                                className="csa-message-row csa-assistant-row"
                                role="status"
                                aria-label="Assistant is thinking"
                            >
                                <span
                                    className="csa-message-avatar"
                                    aria-hidden="true"
                                >
                                    <AssistantIcon />
                                </span>

                                <div className="csa-typing">
                                    <span />
                                    <span />
                                    <span />
                                </div>
                            </div>
                        )}

                        {messages.length === 1 && !isLoading && (
                            <div className="csa-suggestions">
                                <p>Try asking</p>

                                {SUGGESTED_QUESTIONS.map(
                                    (question) => (
                                        <button
                                            type="button"
                                            key={question}
                                            onClick={() =>
                                                sendMessage(question)
                                            }
                                        >
                                            {question}
                                            <span aria-hidden="true">
                                                ↗
                                            </span>
                                        </button>
                                    )
                                )}
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    <form
                        className="csa-composer"
                        onSubmit={handleSubmit}
                    >
                        <label
                            className="csa-input-label"
                            htmlFor="csa-message-input"
                        >
                            Ask a question
                        </label>

                        <div className="csa-input-wrap">
                            <textarea
                                id="csa-message-input"
                                ref={inputRef}
                                value={message}
                                onChange={(event) =>
                                    setMessage(event.target.value)
                                }
                                onKeyDown={handleInputKeyDown}
                                placeholder="Ask about your community..."
                                rows={1}
                                maxLength={1000}
                                disabled={isLoading}
                            />

                            <button
                                type="submit"
                                className="csa-send-button"
                                disabled={
                                    isLoading ||
                                    !message.trim()
                                }
                                aria-label="Send message"
                                title="Send message"
                            >
                                <SendIcon />
                            </button>
                        </div>

                        <p className="csa-disclaimer">
                            AI-generated answers may be imperfect.
                            Check your report for the latest status.
                        </p>
                    </form>
                </section>
            )}

            <button
                type="button"
                className={`csa-launcher ${
                    isOpen ? "csa-launcher-open" : ""
                }`}
                onClick={() => setIsOpen((previous) => !previous)}
                aria-label={
                    isOpen
                        ? "Close CivicSolve Assistant"
                        : "Open CivicSolve Assistant"
                }
                aria-expanded={isOpen}
                title="Chat with CivicSolve"
            >
                {isOpen ? (
                    <CloseIcon />
                ) : (
                    <AssistantIcon />
                )}

                {!isOpen && (
                    <span className="csa-launcher-label">
                        Ask CivicSolve
                    </span>
                )}
            </button>
        </div>
    );
}