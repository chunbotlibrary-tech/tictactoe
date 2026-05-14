import { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  query,
  orderBy,
  limit,
  deleteDoc,
  doc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { PlayerSymbol, ChatMessage } from '../constants';

export function useChat(roomId: string | null, playerSymbol: PlayerSymbol | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    if (!roomId) return;

    const messagesRef = query(
      collection(db, 'rooms', roomId, 'chats'), 
      orderBy('timestamp', 'desc'),
      limit(20)
    );
    
    const unsub = onSnapshot(messagesRef, (snapshot) => {
      const msgList: ChatMessage[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          sender: data.sender,
          text: data.text,
          timestamp: data.timestamp?.toMillis() || Date.now()
        };
      });
      
      // Reverse because we queried desc for limit but want to show cron order
      setMessages(msgList.reverse());
    });

    return () => unsub();
  }, [roomId]);

  const sendMessage = useCallback(async (text: string) => {
    if (!roomId || !playerSymbol || !text.trim()) return;

    try {
      const docRef = await addDoc(collection(db, 'rooms', roomId, 'chats'), {
        sender: playerSymbol,
        text: text.trim(),
        timestamp: serverTimestamp()
      });
      
      // Auto-delete after 15 seconds to fulfill "real-time chat, don't store long"
      setTimeout(async () => {
        try {
          await deleteDoc(doc(db, 'rooms', roomId, 'chats', docRef.id));
        } catch (err) {
          console.error("Cleanup failed:", err);
        }
      }, 15000);
      
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  }, [roomId, playerSymbol]);

  return {
    messages,
    sendMessage
  };
}
