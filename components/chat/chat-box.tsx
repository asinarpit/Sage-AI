"use client";

import { useState } from "react";

interface ChatBoxProps {
    documentId: string;
    chatId?: string;
}

export const ChatBox = ({
    documentId,
    chatId: initialChatId,
}: ChatBoxProps) => {
    const [message, setMessage] = useState("");
    const [messages, setMessages] = useState<any[]>([]);
    const [chatId, setChatId] = useState<string | null>(
        initialChatId || null
    );
    const [loading, setLoading] = useState(false);

    const sendMessage = async () => {
        if (!message || loading) return;

        try {
            setLoading(true);

            const res = await fetch("/api/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    message,
                    documentId,
                    chatId,
                }),
            });

            const data = await res.json();

            // append messages
            setMessages((prev) => [
                ...prev,
                { role: "user", content: message },
                { role: "assistant", content: data.response },
            ]);

            // update chatId if new chat was created
            if (!chatId) {
                setChatId(data.chatId);
            }

            setMessage("");
        } catch (error) {
            console.error("Chat error:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col gap-4 max-w-2xl">
            {/* Messages */}
            <div className="border p-4 h-80 overflow-y-auto rounded">
                {messages.length === 0 && (
                    <p className="text-gray-400">Start a conversation...</p>
                )}

                {messages.map((m, i) => (
                    <div key={i} className="mb-2">
                        <strong className="capitalize">{m.role}:</strong>{" "}
                        {m.content}
                    </div>
                ))}
            </div>

            {/* Input */}
            <div className="flex gap-2">
                <input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Ask something..."
                    className="border p-2 flex-1 rounded"
                />

                <button
                    onClick={sendMessage}
                    disabled={loading}
                    className="bg-black text-white px-4 rounded disabled:opacity-50"
                >
                    {loading ? "Thinking..." : "Send"}
                </button>
            </div>
        </div>
    );
};