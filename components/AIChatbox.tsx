'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ChatMessage } from '@/types';
import { 
  Send, 
  Sparkles, 
  Bot, 
  User, 
  HelpCircle, 
  Trash2,
  Loader2
} from 'lucide-react';

interface AIChatboxProps {
  videoId: string;
}

export default function AIChatbox({ videoId }: AIChatboxProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  
  const scrollAnchorRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (e?: React.FormEvent, customPrompt?: string) => {
    if (e) e.preventDefault();
    
    const textToSend = customPrompt || input.trim();
    if (!textToSend || loading) return;

    setInput('');
    setLoading(true);

    const userMsg: ChatMessage = {
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId,
          message: textToSend,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch AI answer.');
      }

      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: data.response || "I couldn't analyze the context properly.",
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error('Chat error:', err);
      const errorMsg: ChatMessage = {
        role: 'assistant',
        content: `Error: ${err.message || 'Could not reach Chatbot servers. Please verify keys.'}`,
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = () => {
    if (confirm('Clear chat history?')) {
      setMessages([]);
    }
  };

  const suggestedQuestions = [
    'What is the core takeaway of this video?',
    'Provide a 3-bullet summary of the main points.',
    'What was discussed in the final minutes?',
  ];

  return (
    <Card className="glass-panel border-white/5 bg-slate-900/10 flex flex-col h-[600px] overflow-hidden shadow-xl">
      <CardHeader className="flex flex-row items-center justify-between border-b border-white/5 pb-4">
        <div className="flex items-center space-x-2">
          <div className="bg-gradient-to-r from-violet-600 to-fuchsia-600 p-2 rounded-xl text-white">
            <Bot className="h-4.5 w-4.5" />
          </div>
          <CardTitle className="text-xl flex items-center space-x-1.5">
            <span>VidBrief Chatbot</span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400">
              Live QA
            </span>
          </CardTitle>
        </div>

        {messages.length > 0 && (
          <button
            onClick={handleClearHistory}
            className="p-2 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-900/50 transition cursor-pointer"
            title="Clear conversation log"
          >
            <Trash2 className="h-4.5 w-4.5" />
          </button>
        )}
      </CardHeader>

      {/* Messages View */}
      <CardContent className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.length === 0 ? (
          /* Empty Chat View */
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-6">
            <div className="bg-slate-900 border border-white/5 p-4 rounded-2xl">
              <Bot className="h-8 w-8 text-violet-400 animate-pulse" />
            </div>
            
            <div className="space-y-1.5">
              <h4 className="font-outfit font-bold text-slate-200 tracking-wide">Ask anything about this video</h4>
              <p className="text-slate-400 text-xs max-w-xs mx-auto font-sans leading-relaxed">
                VidBrief AI Chat reads the full Whisper transcript and answers your specific questions instantly using Gemini 1.5 Flash.
              </p>
            </div>

            {/* Suggestions cards */}
            <div className="w-full max-w-sm space-y-2.5 pt-4 text-left font-sans">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5 pl-1">
                <HelpCircle className="h-3.5 w-3.5" />
                <span>Suggested Queries</span>
              </span>
              
              {suggestedQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(undefined, q)}
                  className="w-full text-left text-xs bg-slate-950/60 border border-slate-800 hover:border-violet-500/30 rounded-xl p-3.5 text-slate-300 hover:text-violet-300 transition duration-200 shadow-sm"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Conversational Bubble Logs */
          <div className="space-y-4 font-sans">
            {messages.map((msg, index) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={index}
                  className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-200`}
                >
                  <div className={`flex items-start space-x-2.5 max-w-[85%] ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
                    {/* User / Bot circle */}
                    <div className={`h-7 w-7 rounded-lg border border-white/5 flex items-center justify-center flex-shrink-0 text-white ${
                      isUser ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 shadow' : 'bg-slate-900'
                    }`}>
                      {isUser ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5 text-violet-400" />}
                    </div>

                    {/* Bubble Content */}
                    <div className="space-y-1">
                      <div className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-sm ${
                        isUser 
                          ? 'bg-gradient-to-r from-violet-600/90 to-fuchsia-600/90 text-white rounded-tr-none' 
                          : 'bg-slate-950/50 border border-white/5 text-slate-200 rounded-tl-none'
                      }`}>
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                      <span className={`block text-[10px] text-slate-500 ${isUser ? 'text-right' : 'text-left'}`}>
                        {msg.timestamp}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Real-time Loader animation */}
            {loading && (
              <div className="flex justify-start animate-in fade-in duration-200">
                <div className="flex items-start space-x-2.5 max-w-[85%]">
                  <div className="h-7 w-7 rounded-lg border border-white/5 bg-slate-900 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-3.5 w-3.5 text-violet-400" />
                  </div>
                  <div className="bg-slate-950/50 border border-white/5 p-3.5 rounded-2xl rounded-tl-none text-slate-400 text-xs sm:text-sm flex items-center space-x-2 font-medium">
                    <Loader2 className="h-3.5 w-3.5 text-violet-400 animate-spin" />
                    <span className="font-outfit animate-pulse">Sourcing transcript analysis...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={scrollAnchorRef} />
          </div>
        )}
      </CardContent>

      {/* Input Bar */}
      <div className="p-4 border-t border-white/5 bg-slate-950/40">
        <form onSubmit={handleSend} className="flex space-x-2.5">
          <input
            type="text"
            placeholder="Ask a question about this video..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            className="flex-1 bg-slate-950/60 border border-slate-800 rounded-xl py-3 px-4 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-violet-500 transition-colors disabled:opacity-50 font-sans"
          />
          <Button
            type="submit"
            variant="primary"
            disabled={!input.trim() || loading}
            className="px-4 py-3 rounded-xl flex items-center justify-center"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </Card>
  );
}
