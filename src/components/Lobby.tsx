import { useState } from 'react';
import { motion } from 'motion/react';
import { Plus, LogIn, Gamepad2 } from 'lucide-react';

interface LobbyProps {
  onCreateRoom: () => void;
  onJoinRoom: (roomId: string) => void;
  loading?: boolean;
}

export function Lobby({ onCreateRoom, onJoinRoom, loading }: LobbyProps) {
  const [lang, setLang] = useState<'en' | 'km'>('en');
  const [roomCode, setRoomCode] = useState('');

  const t = {
    en: {
      title: "TIC TAC TOE",
      subtitle: "Real-time Neon Arena",
      create: "Create New Room",
      join: "Join Room",
      placeholder: "ENTER ROOM CODE",
      or: "Or join existing",
      footer: "Powered by Firebase Real-time Synchronization"
    },
    km: {
      title: "ទីក តាក់ តូ",
      subtitle: "កីឡដ្ឋានណេអុង",
      create: "បង្កើតបន្ទប់ថ្មី",
      join: "ចូលរួមបន្ទប់",
      placeholder: "បញ្ចូលលេខកូដ",
      or: "ឬចូលរួមបន្ទប់ដែលមានស្រាប់",
      footer: "ដំណើរការដោយ Firebase Sync"
    }
  }[lang];

  return (
    <div className="flex flex-col items-center justify-center p-6 space-y-8 w-full max-w-md mx-auto" id="lobby-container">
      <div className="absolute top-4 right-4 flex gap-2">
        <button onClick={() => setLang('en')} className={`text-xs font-bold px-2 py-1 rounded ${lang === 'en' ? 'bg-sky-500 text-white' : 'text-slate-500'}`}>EN</button>
        <button onClick={() => setLang('km')} className={`text-xs font-bold px-2 py-1 rounded ${lang === 'km' ? 'bg-sky-500 text-white' : 'text-slate-500'}`}>KM</button>
      </div>
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-center space-y-2"
      >
        <div className="flex justify-center mb-4">
          <div className="p-4 bg-sky-500/10 rounded-full border border-sky-500/20">
            <Gamepad2 className="w-12 h-12 text-sky-400" />
          </div>
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-white uppercase">
          {t.title}
        </h1>
        <p className="text-slate-400 text-lg">{t.subtitle}</p>
      </motion.div>

      <div className="w-full space-y-6">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onCreateRoom}
          disabled={loading}
          className="w-full py-4 px-6 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-colors neon-border-x"
          id="btn-create-room"
        >
          <Plus className="w-6 h-6" />
          {t.create}
        </motion.button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-slate-800"></span>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-slate-950 px-3 text-slate-500 font-medium">{t.or}</span>
          </div>
        </div>

        <div className="space-y-3">
          <input
            type="text"
            placeholder={t.placeholder}
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            className="w-full bg-slate-900/50 border border-slate-800 text-white p-4 rounded-xl text-center text-xl font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-pink-500/50 transition-all placeholder:text-slate-700"
            maxLength={6}
            id="input-room-code"
          />
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onJoinRoom(roomCode)}
            disabled={loading || roomCode.length < 4}
            className="w-full py-4 px-6 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-2xl font-bold flex items-center justify-center gap-3 transition-colors border border-slate-700"
            id="btn-join-room"
          >
            <LogIn className="w-5 h-5" />
            {t.join}
          </motion.button>
        </div>
      </div>

      <div className="text-slate-600 text-xs text-center">
        {t.footer}
      </div>
    </div>
  );
}
