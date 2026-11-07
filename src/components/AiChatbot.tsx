import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  Search,
  Bot,
  User,
  RotateCcw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { ExperimentConfig, FinalPhysicalResult, RegressionResult } from '../types';
import { KaTeXView } from './KaTeXView';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  grounding?: {
    chunks?: { web?: { uri?: string; title?: string } }[];
    queries?: string[];
  };
  timestamp: string;
}

interface AiChatbotProps {
  experiment: ExperimentConfig;
  regression: RegressionResult;
  finalResult: FinalPhysicalResult;
}

export const AiChatbot: React.FC<AiChatbotProps> = ({
  experiment,
  regression,
  finalResult,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Hello! I'm your **Lab Assistant AI**. I'm actively analyzing your experiment **"${experiment.title}"**.\n\nYou can ask me to derive theoretical equations in KaTeX, explain unexpected errors or discrepancies, or look up verified literature constants.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [useSearchGrounding, setUseSearchGrounding] = useState(true);
  const [selectedModel, setSelectedModel] = useState<'gemini-3.8-flash' | 'gemini-3.1-flash-lite' | 'gemini-4-argon'>('gemini-3.8-flash');

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (customPrompt?: string) => {
    const textToSend = customPrompt || inputText;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newHistory.map((m) => ({ role: m.role, content: m.content })),
          experiment,
          regression,
          finalResult,
          useSearchGrounding,
          model: selectedModel,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to get answer from AI.');
      }

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: data.reply,
        grounding: data.grounding,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      console.error(err);
      const errorMsg: ChatMessage = {
        id: `bot-err-${Date.now()}`,
        role: 'assistant',
        content: `Error: ${err?.message || 'Could not connect to Gemini AI.'} Please check server connection.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content: `Chat history reset. How can I help you with **"${experiment.title}"**?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const suggestions = [
    `What are the major systematic errors in this experiment?`,
    `Verify accepted literature value for ${experiment.targetQuantityName}`,
    `Explain why the gradient m = ${regression.m.toFixed(4)} matches the theoretical law`,
    `How to minimize human reaction time errors in timing?`,
  ];

  return (
    <>
      {/* Floating trigger button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-cyan-600 via-indigo-600 to-cyan-500 text-white font-bold text-xs shadow-2xl hover:scale-105 active:scale-95 transition cursor-pointer border border-cyan-400/40"
          aria-label="Open Lab Assistant AI"
        >
          <Sparkles className="w-4 h-4 animate-pulse text-cyan-200" />
          <span>Ask Lab Assistant AI</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
        </button>
      )}

      {/* Floating Chat Drawer */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-full max-w-md h-[580px] bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-6">
          {/* Header */}
          <div className="p-4 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-md">
                <Bot className="w-4 h-4 text-cyan-100" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                  Lab Assistant AI
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                    Active
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400 truncate max-w-[200px]">
                  Context: {experiment.title}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleResetChat}
                title="Clear conversation"
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded-lg transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Close chat"
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Model & Search Grounding Bar */}
          <div className="px-3.5 py-2 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Model:</span>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value as any)}
                className="bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-[11px] font-mono text-cyan-300 focus:outline-none"
              >
                <option value="gemini-3.8-flash">gemini-3.8-flash (Recommended)</option>
                <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (Fast)</option>
                <option value="gemini-4-argon">gemini-4-argon (Complex STEM)</option>
              </select>
            </div>

            <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer select-none">
              <Search className={`w-3 h-3 ${useSearchGrounding ? 'text-cyan-400' : 'text-slate-500'}`} />
              <input
                type="checkbox"
                checked={useSearchGrounding}
                onChange={(e) => setUseSearchGrounding(e.target.checked)}
                className="rounded accent-cyan-500"
              />
              <span className={useSearchGrounding ? 'text-cyan-300 font-semibold' : 'text-slate-500'}>
                Search
              </span>
            </label>
          </div>

          {/* Scrollable messages thread */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-lg bg-cyan-950 border border-cyan-800 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed space-y-1.5 ${
                    m.role === 'user'
                      ? 'bg-cyan-600 text-white rounded-br-none shadow-md shadow-cyan-600/20'
                      : 'bg-slate-800/90 text-slate-200 border border-slate-700/80 rounded-bl-none'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{m.content}</div>

                  {/* Grounding sources citation if returned by Google Search */}
                  {m.grounding?.chunks && m.grounding.chunks.length > 0 && (
                    <div className="pt-2 border-t border-slate-700/60 mt-1 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-cyan-400 flex items-center gap-1">
                        <Search className="w-2.5 h-2.5" /> Verified Sources:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {m.grounding.chunks.slice(0, 3).map((chunk, cIdx) => (
                          <a
                            key={cIdx}
                            href={chunk.web?.uri || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-950 text-[10px] text-cyan-300 border border-slate-700 truncate max-w-[200px]"
                          >
                            <span className="truncate">{chunk.web?.title || 'Web Reference'}</span>
                            <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="text-[9px] text-slate-400 text-right opacity-70">
                    {m.timestamp}
                  </div>
                </div>

                {m.role === 'user' && (
                  <div className="w-6 h-6 rounded-lg bg-indigo-950 border border-indigo-800 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5 text-indigo-300" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-2.5 items-center text-xs text-slate-400 animate-pulse">
                <Bot className="w-4 h-4 text-cyan-400" />
                <span>Lab Assistant is calculating and searching verified literature...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions */}
          <div className="px-3 py-1.5 bg-slate-950/60 border-t border-slate-800 overflow-x-auto flex gap-1.5 scrollbar-none">
            {suggestions.map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSend(s)}
                className="px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] whitespace-nowrap transition cursor-pointer border border-slate-700/60"
              >
                {s}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 bg-slate-800/90 border-t border-slate-700 flex gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask about equations, error analysis, or literature..."
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
            />
            <button
              type="submit"
              disabled={isLoading || !inputText.trim()}
              className={`p-2.5 rounded-xl text-white transition cursor-pointer ${
                isLoading || !inputText.trim()
                  ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  : 'bg-cyan-600 hover:bg-cyan-500 shadow-md shadow-cyan-600/20'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
