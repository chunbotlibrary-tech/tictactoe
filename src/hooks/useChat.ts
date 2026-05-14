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
  doc,
  getDocs
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
      await addDoc(collection(db, 'rooms', roomId, 'chats'), {
        sender: playerSymbol,
        text: text.trim(),
        timestamp: serverTimestamp()
      });
      
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  }, [roomId, playerSymbol]);

  const clearChat = useCallback(async () => {
    if (!roomId) return;
    try {
      const chatRef = collection(db, 'rooms', roomId, 'chats');
      const snapshot = await getDocs(chatRef);
      const deletePromises = snapshot.docs.map(d => deleteDoc(doc(db, 'rooms', roomId, 'chats', d.id)));
      await Promise.all(deletePromises);
    } catch (err) {
      console.error("Failed to clear chat:", err);
    }
  }, [roomId]);

  return {
    messages,
    sendMessage,
    clearChat
  };
}
