"use client";

import { useRef, useState } from "react";

interface Message {
    id: string;
    text: string;
    sender: "user" | "ai";
    timestamp: Date;
}

const ChatAI = () => {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: "1",
            text: "¡Hola! Soy tu asistente inteligente de ERP. ¿En qué puedo ayudarte hoy?",
            sender: "ai",
            timestamp: new Date(),
        },
    ]);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);


    const handleSend = () => {
        if (!input.trim()) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            text: input,
            sender: "user",
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setIsTyping(true);

        setTimeout(() => {
            const aiResponse: Message = {
                id: (Date.now() + 1).toString(),
                text: "Entiendo. Estoy procesando tu solicitud sobre '" + input + "'. Como soy un prototipo, por ahora solo puedo mostrarte este diseño increíble.",
                sender: "ai",
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, aiResponse]);
            setIsTyping(false);
        }, 1500);
    };

    return (
        <div className="flex flex-col h-full w-full bg-primary-500/40 backdrop-blur-xl border border-main/10 rounded-dx overflow-hidden shadow-2xl">

            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-focus-500/20 blur-[100px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-focus-500/10 blur-[100px] rounded-full pointer-events-none" />

            <div className="px-6 py-4 border-b border-main/10 flex items-center justify-between bg-main/5 relative z-10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-focus-500 to-focus-100 flex items-center justify-center shadow-lg shadow-focus-500/20">
                        <i className="dx-icon dx-icon-sparkle text-variant" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-main tracking-tight">Keukemini</h3>
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-sm text-emerald-500 font-medium uppercase tracking-wider">En línea</span>
                        </div>
                    </div>
                </div>
                <button className="text-main/40 hover:text-main transition-colors">
                    <i className="dx-icon dx-icon-more" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 scrollbar-hide relative z-10">
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                    >
                        <div
                            className={`max-w-[80%] flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"
                                }`}
                        >
                            <div
                                className={`px-5 py-3 rounded-dx text-sm  leading-relaxed ${msg.sender === "user"
                                    ? "bg-gradient-to-br from-focus-500 to-focus-300 text-main shadow-xl shadow-focus-500/10 rounded-tr-none"
                                    : "bg-main/10 backdrop-blur-md text-main border border-main/10 rounded-tl-none"
                                    }`}
                            >
                                {msg.text}
                            </div>
                            <span className="text-sm text-main/30 mt-2 px-1">
                                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    </div>
                ))}
                {isTyping && (
                    <div className="flex justify-start">
                        <div className="bg-main/5 backdrop-blur-md px-5 py-3 rounded-dx rounded-tl-none border border-main/5">
                            <div className="flex gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-main/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                                <span className="w-1.5 h-1.5 rounded-full bg-main/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                                <span className="w-1.5 h-1.5 rounded-full bg-main/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="px-6 py-2 overflow-x-auto flex gap-2 no-scrollbar relative z-10">
                {["Ver stock hoy", "Alertas stock", "Resumen ventas"].map((q) => (
                    <button
                        key={q}
                        onClick={() => setInput(q)}
                        className="whitespace-nowrap px-3 py-1.5 rounded-full bg-main/5 border border-main/10 text-[11px] text-main/60 hover:bg-main/10 hover:text-main transition-all cursor-pointer"
                    >
                        {q}
                    </button>
                ))}
            </div>

            <div className="p-6 relative z-10">
                <div className="relative flex items-center bg-main/5 rounded-dx border border-main/10 focus-within:border-focus-500/50 focus-within:ring-1 focus-within:ring-focus-500/20 transition-all shadow-inner overflow-hidden">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSend()}
                        placeholder="Pregunta algo al asistente..."
                        className="w-full bg-transparent px-5 py-4 text-sm  text-main placeholder:text-main/20 outline-none"
                    />
                    <div className="pr-3 flex items-center gap-2">
                        <button className="p-2 text-main/30 hover:text-main/60 transition-colors">
                            <i className="dx-icon dx-icon-attach" />
                        </button>
                        <button
                            onClick={handleSend}
                            disabled={!input.trim()}
                            className={`p-2.5 rounded-dx transition-all ${input.trim()
                                ? "bg-focus-500 text-main shadow-lg shadow-focus-500/30 active:scale-95"
                                : "bg-main/10 text-main/20 cursor-not-allowed"
                                }`}
                        >
                            <i className="dx-icon dx-icon-edit" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChatAI;
