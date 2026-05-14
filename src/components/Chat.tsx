import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, MessageSquare, X } from 'lucide-react';
import { ChatMessage, PlayerSymbol } from '../constants';
import { useChat } from '../hooks/useChat';

interface ChatProps {
  roomId: string;
  playerSymbol: PlayerSymbol | null;
}

export function Chat({ roomId, playerSymbol }: ChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const { messages, sendMessage } = useChat(roomId, playerSymbol);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim() && playerSymbol) {
      sendMessage(inputText);
      setInputText('');
    }
  };

  if (!playerSymbol) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[90] flex flex-col items-end">
      {/* Floating Notifications for new messages when closed */}
      <div className="mb-2 flex flex-col items-end gap-1 pointer-events-none">
        <AnimatePresence>
          {!isOpen && messages.slice(-2).map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, x: 20, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className={`px-3 py-1.5 rounded-2xl text-xs font-bold shadow-lg border backdrop-blur-md ${
                msg.sender === 'X' 
                  ? 'bg-sky-500/20 border-sky-500/30 text-sky-400' 
                  : 'bg-pink-500/20 border-pink-500/30 text-pink-400'
              }`}
            >
              <span className="opacity-70 mr-1">{msg.sender}:</span> {msg.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="w-72 sm:w-80 h-96 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden mb-4"
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-800/30">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-sky-400" />
                <h3 className="text-sm font-black italic tracking-tight">ជជែកកំសាន្ត</h3>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-slate-500 hover:text-white transition-colors"
              >
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                  <X className="w-4 h-4" />
                </motion.div>
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-2">
                  <MessageSquare className="w-8 h-8 opacity-20" />
                  <p className="text-[10px] uppercase font-bold tracking-widest">No messages yet</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div 
                    key={msg.id} 
                    className={`flex flex-col ${msg.sender === playerSymbol ? 'items-end' : 'items-start'}`}
                  >
                    <div className={`
                      max-w-[85%] px-3 py-2 rounded-2xl text-sm
                      ${msg.sender === playerSymbol 
                        ? (playerSymbol === 'X' ? 'bg-sky-600 text-white rounded-tr-none' : 'bg-pink-600 text-white rounded-tr-none') 
                        : (msg.sender === 'X' ? 'bg-slate-800 border border-sky-500/30 text-sky-400 rounded-tl-none' : 'bg-slate-800 border border-pink-500/30 text-pink-400 rounded-tl-none')
                      }
                    `}>
                      {msg.text}
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-3 border-t border-slate-800 bg-slate-950/50">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="ផ្ញើសារ..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-2 pl-4 pr-10 text-sm focus:outline-none focus:border-sky-500 transition-colors"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="absolute right-2 p-1.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-30 disabled:bg-slate-600 rounded-xl text-white transition-all active:scale-90"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`p-4 rounded-2xl shadow-xl border flex items-center justify-center transition-all ${
          isOpen 
            ? 'bg-slate-800 border-slate-700 text-slate-400' 
            : 'bg-sky-600 border-sky-500 text-white'
        }`}
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
        {!isOpen && messages.length > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-pink-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-slate-950">
            {messages.length}
          </span>
        )}
      </motion.button>
    </div>
  );
}
