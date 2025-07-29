import React, { useState } from 'react';
import { Input } from './input';
import { Button } from './button';

export const ChatInput = ({ onSend }) => {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (message.trim() === '') return;
    onSend(message);
    setMessage('');
  };

  return (
    <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 mt-2">
      <Input
        className="flex-1 bg-transparent text-white placeholder-gray-400 focus:outline-none"
        placeholder="Ask the AI Assistant..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
      />
      <Button
        className="bg-glow-blue hover:bg-neon-purple text-white font-semibold px-4 py-2 rounded-xl"
        onClick={handleSend}
      >
        Send
      </Button>
    </div>
  );
};
