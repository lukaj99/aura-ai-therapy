
import React, { useRef, useEffect } from 'react';
import { Role, type Message } from '../types';

interface TranscriptProps {
  messages: Message[];
}

const Transcript: React.FC<TranscriptProps> = ({ messages }) => {
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex-grow w-full max-w-3xl p-4 sm:p-6 space-y-6 overflow-y-auto">
      {messages.map((message) => (
        <div key={message.id} className={`flex items-end gap-3 ${message.role === Role.USER ? 'justify-end' : 'justify-start'}`}>
          {message.role === Role.AI && (
            <div className="w-10 h-10 rounded-full bg-brand-primary flex-shrink-0 flex items-center justify-center text-white font-bold text-lg">
              A
            </div>
          )}
          <div className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-3 rounded-2xl shadow-md ${
            message.role === Role.USER 
            ? 'bg-brand-secondary text-white rounded-br-none' 
            : 'bg-slate-700 text-slate-50 rounded-bl-none'
          }`}>
            <p className="text-base">{message.text}</p>
            <p className={`text-xs mt-2 ${
              message.role === Role.USER ? 'text-blue-200 text-right' : 'text-slate-400 text-left'
            }`}>
              {formatTimestamp(message.timestamp)}
            </p>
          </div>
        </div>
      ))}
      <div ref={endOfMessagesRef} />
    </div>
  );
};

export default Transcript;