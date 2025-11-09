'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Minimize2, Maximize2 } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function Chatbot() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hi! I'm your Clariti assistant. Ask me anything about your tasks, upcoming events, or schedule. For example: 'What are my most urgent tasks?' or 'What's on my calendar this week?'",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isInitialMount = useRef(true);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    // Skip scroll on initial mount to prevent page jumping to chatbot
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input.trim() }),
      });

      if (!response.ok) throw new Error('Failed to get response');

      const data = await response.json();

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: "Sorry, I couldn't process your request. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-cream-white border-2 border-sage-gray/30 rounded-3xl shadow-lg shadow-earth-brown/20 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b-2 border-sage-gray/30 bg-gradient-to-r from-moss-green/20 to-ocean-teal/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-forest-green to-moss-green rounded-full flex items-center justify-center shadow-md">
            <Bot className="w-6 h-6 text-cream-white" />
          </div>
          <h3 className="text-xl font-bold font-serif text-forest-green">
            AI Assistant
          </h3>
        </div>
        <button
          onClick={() => setIsMinimized(!isMinimized)}
          className="p-2 hover:bg-sage-gray/20 rounded-full transition-all"
          aria-label={isMinimized ? 'Maximize' : 'Minimize'}
        >
          {isMinimized ? (
            <Maximize2 className="w-5 h-5 text-forest-green" />
          ) : (
            <Minimize2 className="w-5 h-5 text-forest-green" />
          )}
        </button>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <div className="h-96 overflow-y-auto p-6 space-y-4 bg-stone-beige/30">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex gap-3 ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-forest-green to-moss-green rounded-full flex items-center justify-center shadow-md">
                    <Bot className="w-6 h-6 text-cream-white" />
                  </div>
                )}
                <div
                  className={`max-w-[75%] px-4 py-3 rounded-2xl shadow-sm ${
                    message.role === 'user'
                      ? 'bg-gradient-to-br from-forest-green to-moss-green text-cream-white font-medium'
                      : 'bg-cream-white border-2 border-sage-gray/30 text-bark-brown'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                </div>
                {message.role === 'user' && (
                  <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-clay-orange to-sunflower-yellow rounded-full flex items-center justify-center shadow-md">
                    <User className="w-6 h-6 text-cream-white" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-forest-green to-moss-green rounded-full flex items-center justify-center shadow-md">
                  <Bot className="w-6 h-6 text-cream-white" />
                </div>
                <div className="bg-cream-white border-2 border-sage-gray/30 px-4 py-3 rounded-2xl">
                  <Loader2 className="w-5 h-5 text-forest-green animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            className="p-5 border-t-2 border-sage-gray/30 bg-cream-white"
          >
            <div className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your tasks, events, or schedule..."
                className="flex-1 px-4 py-3 border-2 border-sage-gray/30 rounded-full bg-stone-beige/50 text-bark-brown placeholder-sage-gray focus:outline-none focus:ring-2 focus:ring-forest-green focus:border-forest-green transition-all"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="px-6 py-3 bg-gradient-to-br from-forest-green to-moss-green text-cream-white rounded-full hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 font-medium"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
