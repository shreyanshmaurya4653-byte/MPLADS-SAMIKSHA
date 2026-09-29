import React, { useState, useRef, useEffect } from 'react';
import { copilotApi } from '../../api/copilotApi';
import { useLanguage } from '../../hooks/useLanguage';
import {
  Bot,
  Sparkles,
  Send,
  X,
  Minimize2,
  Maximize2,
  RotateCcw,
  Lightbulb
} from 'lucide-react';

const INITIAL_SUGGESTED_QUERIES = [
  "Top 5 high-risk works right now",
  "Show works in Uttar Pradesh",
  "What is the mandatory 15% SC quota?",
  "What works are prohibited under the Negative List?",
  "What is the total expenditure and fund utilization?",
  "Who are the top contractors executing works?"
];

export function AiCopilotModal() {
  const { language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState(INITIAL_SUGGESTED_QUERIES);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: "👋 **Namaste! I am NitiMitra, your MPLADS-SAMIKSHA AI Decision Copilot.**\n\nI can analyze public works, investigate anomalies, trace fund pipelines, and explain MoSPI 2023 Statutory Guidelines directly from the database. Ask me any question or pick a suggested prompt below."
    }
  ]);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (queryText) => {
    const promptToSend = queryText || input;
    if (!promptToSend.trim() || loading) return;

    const userMessage = { role: 'user', text: promptToSend };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await copilotApi.askCopilot(promptToSend);
      const botMessage = {
        role: 'assistant',
        text: response.answer || "Query processed successfully."
      };
      setMessages((prev) => [...prev, botMessage]);

      if (response.suggested_questions && Array.isArray(response.suggested_questions) && response.suggested_questions.length > 0) {
        setSuggestions(response.suggested_questions);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: `⚠️ **Error communicating with Copilot:** ${err.message || 'Server timeout'}`
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setMessages([
      {
        role: 'assistant',
        text: "👋 **Namaste! I am NitiMitra, your MPLADS-SAMIKSHA AI Decision Copilot.**\n\nI can analyze public works, investigate anomalies, trace fund pipelines, and explain MoSPI 2023 Statutory Guidelines directly from the database. Ask me any question or pick a suggested prompt below."
      }
    ]);
    setSuggestions(INITIAL_SUGGESTED_QUERIES);
  };

  const renderFormattedText = (text) => {
    return text.split('\n').map((line, idx) => {
      // H3 Header
      if (line.startsWith('### ')) {
        return (
          <h4 key={idx} className="font-extrabold text-slate-900 text-xs sm:text-sm mt-2.5 mb-1 pb-1 border-b border-slate-200 flex items-center gap-1.5">
            {line.replace('### ', '')}
          </h4>
        );
      }
      // H4 Subheader
      if (line.startsWith('#### ')) {
        return (
          <h5 key={idx} className="font-bold text-slate-800 text-[11px] sm:text-xs mt-2 mb-0.5 text-blue-900">
            {line.replace('#### ', '')}
          </h5>
        );
      }
      // Blockquote
      if (line.startsWith('> ')) {
        return (
          <div key={idx} className="my-1.5 p-2 bg-amber-50/80 border-l-3 border-amber-500 rounded-r text-[11px] text-amber-900 italic">
            <span
              dangerouslySetInnerHTML={{
                __html: line.replace('> ', '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>')
              }}
            />
          </div>
        );
      }
      // Bullet points
      if (line.startsWith('- ') || line.startsWith('• ')) {
        const cleanLine = line.replace(/^[-•]\s*/, '');
        return (
          <div key={idx} className="flex items-start gap-1.5 my-0.5 pl-1">
            <span className="text-blue-600 font-bold shrink-0 mt-0.5">•</span>
            <span
              className="text-[11px] sm:text-xs text-slate-700 leading-relaxed"
              dangerouslySetInnerHTML={{
                __html: cleanLine
                  .replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 bg-slate-100 text-blue-900 font-mono text-[10px] rounded border border-slate-200">$1</code>')
                  .replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-900 font-semibold">$1</strong>')
                  .replace(/\*(.*?)\*/g, '<em>$1</em>')
              }}
            />
          </div>
        );
      }
      // Indented sub-bullets
      if (line.startsWith('  • ') || line.startsWith('  - ')) {
        const cleanLine = line.replace(/^\s+[-•]\s*/, '');
        return (
          <div key={idx} className="flex items-start gap-1.5 my-0.5 pl-4">
            <span className="text-slate-400 shrink-0 mt-0.5">◦</span>
            <span
              className="text-[10px] sm:text-[11px] text-slate-600 leading-relaxed"
              dangerouslySetInnerHTML={{
                __html: cleanLine
                  .replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 bg-slate-100 text-blue-900 font-mono text-[9px] rounded border border-slate-200">$1</code>')
                  .replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-800 font-medium">$1</strong>')
                  .replace(/\*(.*?)\*/g, '<em>$1</em>')
              }}
            />
          </div>
        );
      }
      // Empty lines
      if (!line.trim()) {
        return <div key={idx} className="h-1" />;
      }
      // Standard paragraphs
      return (
        <p
          key={idx}
          className="text-[11px] sm:text-xs text-slate-700 leading-relaxed my-0.5"
          dangerouslySetInnerHTML={{
            __html: line
              .replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 bg-slate-100 text-blue-900 font-mono text-[10px] rounded border border-slate-200">$1</code>')
              .replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-900 font-semibold">$1</strong>')
              .replace(/\*(.*?)\*/g, '<em>$1</em>')
          }}
        />
      );
    });
  };

  return (
    <>
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-5 right-5 z-40 bg-gradient-to-r from-[#0b3b60] to-indigo-800 text-white p-3 sm:px-4 sm:py-3 rounded-full shadow-2xl hover:scale-105 transition-all flex items-center gap-2 border-2 border-amber-400 group cursor-pointer"
          title="Open AI Decision Support Copilot"
        >
          <div className="relative">
            <Bot size={20} className="text-amber-300" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
          </div>
          <span className="text-xs font-bold tracking-wide hidden sm:inline">
            NitiMitra
          </span>
          <Sparkles size={14} className="text-amber-300 animate-spin" />
        </button>
      )}

      {/* Floating Chat Window Modal */}
      {isOpen && (
        <div 
          className={`fixed bottom-5 right-5 z-50 bg-white rounded-xl shadow-2xl border border-slate-300 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-200 transition-all ${
            isExpanded 
              ? 'w-[95vw] sm:w-[680px] h-[80vh] max-h-[720px]' 
              : 'w-[95vw] sm:w-[440px] h-[580px]'
          }`}
        >
          {/* Top Bar */}
          <div className="bg-[#0b3b60] text-white px-4 py-3 flex items-center justify-between border-b-2 border-amber-500">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-amber-400/20 rounded-md border border-amber-400/40">
                <Bot size={18} className="text-amber-300" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold flex items-center gap-1.5">
                  NitiMitra
                  <span className="text-[9px] bg-amber-400 text-blue-950 font-black px-1.5 py-0.2 rounded-full uppercase">SAMIKSHA</span>
                </h3>
                <span className="text-[10px] text-emerald-300 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                  MPLADS-SAMIKSHA Decision Copilot • MoSPI 2023 Rules
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              <button
                onClick={handleReset}
                className="text-slate-300 hover:text-white p-1 rounded hover:bg-white/10 transition-colors"
                title="Reset conversation"
              >
                <RotateCcw size={15} />
              </button>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-slate-300 hover:text-white p-1 rounded hover:bg-white/10 transition-colors hidden sm:block"
                title={isExpanded ? "Collapse width" : "Expand width"}
              >
                {isExpanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-300 hover:text-white p-1 rounded hover:bg-white/10 transition-colors"
                title="Close Copilot"
              >
                <X size={17} />
              </button>
            </div>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3 bg-slate-50/60">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[92%] p-3 rounded-lg text-xs ${
                    m.role === 'user'
                      ? 'bg-[#0b3b60] text-white rounded-br-none shadow-sm'
                      : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none shadow-sm'
                  }`}
                >
                  {m.role === 'assistant' ? renderFormattedText(m.text) : m.text}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-slate-600 text-xs p-2.5 bg-white rounded-lg border border-slate-200 w-fit shadow-xs">
                <Sparkles size={14} className="animate-spin text-purple-600" />
                <span className="font-medium">Querying database & synthesizing intelligence...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Context-Aware Suggestion Chips */}
          <div className="px-3 py-2 bg-slate-100/90 border-t border-slate-200 flex items-center gap-1.5 overflow-x-auto text-[10px] whitespace-nowrap scrollbar-none">
            <span className="text-slate-400 flex items-center gap-1 shrink-0 font-medium">
              <Lightbulb size={12} className="text-amber-500" /> Suggested:
            </span>
            {suggestions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(q)}
                disabled={loading}
                className="px-2.5 py-1 bg-white hover:bg-amber-50 hover:text-amber-900 hover:border-amber-400 border border-slate-200 rounded-full font-medium text-slate-700 transition-colors shadow-2xs cursor-pointer shrink-0"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Bottom Input Field */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-2.5 bg-white border-t border-slate-200 flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Ask NitiMitra anything: State, MP, Work ID, SC/ST rules, high risk works..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              className="flex-1 text-xs px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="p-2 bg-[#0b3b60] text-white rounded-md hover:bg-[#124d7b] disabled:opacity-50 transition-colors shadow-sm cursor-pointer"
              title="Submit query"
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
