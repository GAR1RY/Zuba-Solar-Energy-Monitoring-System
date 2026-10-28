import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Send, Bot } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { askZubaSolarAI } from '../../services/zubaSolarAI';

export const ZubaFloatingAI: React.FC = () => {
  const { currentSystem, liveReading, weather, meterLogs, settings } = useApp();

  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<Array<{ id: string; role: 'user' | 'assistant'; text: string; time: string }>>([
    {
      id: 'msg_welcome',
      role: 'assistant',
      text: 'Hello! I am Zuba AI, your dedicated solar assistant. Ask me anything about your solar generation, battery charge time, or sunset daily meter log.',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = prompt.trim();
    if (!query) return;

    const userMsg = {
      id: `usr_${Date.now()}`,
      role: 'user' as const,
      text: query,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setPrompt('');

    // Generate immediate, system-grounded answer from dedicated Zuba Solar AI engine
    setTimeout(() => {
      const answer = askZubaSolarAI(query, {
        system: currentSystem,
        reading: liveReading,
        weather,
        meterLogs,
        tariffZmw: settings.tariffZmw,
      });

      const aiMsg = {
        id: `ai_${Date.now()}`,
        role: 'assistant' as const,
        text: answer,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    }, 200);
  };

  return (
    <>
      {/* Floating Pop-up Trigger at Bottom Right: Clean, consistent dark/amber button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-5 right-5 z-40 flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 shadow-xl shadow-black/15 hover:shadow-2xl hover:scale-[1.02] active:scale-95 transition-all cursor-pointer border border-neutral-800 dark:border-neutral-200"
          aria-label="Open Ask Zuba AI"
        >
          <div className="w-6 h-6 rounded-full bg-amber-500 text-neutral-950 flex items-center justify-center shrink-0">
            <Sparkles className="w-3.5 h-3.5 fill-neutral-950 stroke-[2.2]" />
          </div>
          <span className="text-xs sm:text-sm font-bold tracking-tight pr-1">
            Ask Zuba AI
          </span>
        </button>
      )}

      {/* Floating Pop-up Chat Window at Bottom Right */}
      {isOpen && (
        <div className="fixed bottom-5 right-5 z-50 w-[min(88vw,340px)] h-[520px] max-h-[85vh] bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 bg-neutral-50/90 dark:bg-neutral-800/60 border-b border-neutral-100 dark:border-neutral-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-neutral-950 flex items-center justify-center shadow-xs shrink-0">
                <Bot className="w-4 h-4 stroke-[2.4]" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-neutral-100 leading-tight">
                  Ask Zuba AI
                </h3>
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                  Zuba AI Intelligence
                </span>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              aria-label="Close Zuba AI"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Chat Messages Body */}
          <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-3 text-xs">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 leading-relaxed whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 font-medium'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-200/60 dark:border-neutral-700/60'
                  }`}
                >
                  {m.text}
                </div>
                <span className="text-[10px] text-neutral-400 mt-0.5 px-1">{m.time}</span>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Input Bar */}
          <form
            onSubmit={handleSend}
            className="p-3 bg-neutral-50/70 dark:bg-neutral-800/40 border-t border-neutral-100 dark:border-neutral-800 flex items-center gap-2"
          >
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ask anything about your solar or battery..."
              className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-amber-500 placeholder:text-neutral-400"
              autoFocus
            />
            <button
              type="submit"
              disabled={!prompt.trim()}
              className="p-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-neutral-950 font-bold transition-all cursor-pointer active:scale-95 shrink-0"
              aria-label="Send"
            >
              <Send className="w-3.5 h-3.5 stroke-[2.4]" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
