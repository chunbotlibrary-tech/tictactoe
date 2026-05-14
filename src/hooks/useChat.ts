import { useState, useEffect, useCallback } from 'react';
import { 
  ref, 
  onValue, 
  push, 
  set, 
  serverTimestamp, 
  off,
  remove,
  query,
  limitToLast
} from 'firebase/database';
import { rtdb } from '../lib/firebase';
import { PlayerSymbol, ChatMessage } from '../constants';

export function useChat(roomId: string | null, playerSymbol: PlayerSymbol | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    if (!roomId) return;

    const messagesRef = query(ref(rtdb, `chats/${roomId}`), limitToLast(20));
    
    const unsub = onValue(messagesRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const msgList: ChatMessage[] = Object.entries(data).map(([id, msg]: [string, any]) => ({
          id,
          ...msg
        }));
        
        // Filter messages that are older than 15 seconds (giving some buffer)
        const now = Date.now();
        const recentMessages = msgList.filter(m => now - m.timestamp < 15000);
        
        // Sort by timestamp
        recentMessages.sort((a, b) => a.timestamp - b.timestamp);
        
        setMessages(recentMessages);
      } else {
        setMessages([]);
      }
    });

    // Cleanup timer to refresh messages every second to remove old ones from state
    const interval = setInterval(() => {
      setMessages(prev => {
        const now = Date.now();
        const filtered = prev.filter(m => now - m.timestamp < 10000);
        if (filtered.length !== prev.length) return filtered;
        return prev;
      });
    }, 1000);

    return () => {
      off(messagesRef, 'value', unsub);
      clearInterval(interval);
    };
  }, [roomId]);

  const sendMessage = useCallback(async (text: string) => {
    if (!roomId || !playerSymbol || !text.trim()) return;

    const chatRef = ref(rtdb, `chats/${roomId}`);
    const newMessageRef = push(chatRef);
    const timestamp = Date.now();

    const msgData = {
      sender: playerSymbol,
      text: text.trim(),
      timestamp
    };

    try {
      await set(newMessageRef, msgData);
      
      // Auto-delete after 12 seconds to keep DB clean
      setTimeout(() => {
        remove(newMessageRef).catch(err => console.error("Failed to cleanup message:", err));
      }, 12000);
      
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  }, [roomId, playerSymbol]);

  return {
    messages,
    sendMessage
  };
}
