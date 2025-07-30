import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { ChatInput } from '../components/ui/ChatInput';

export default function AICommanderDecks() {
  const [commander, setCommander] = useState('');
  const [deck, setDeck] = useState([]);
  const [deckAnalytics, setDeckAnalytics] = useState(null);
  const [isPublic, setIsPublic] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [chatLog, setChatLog] = useState([]);

  const toggleSidebar = () => setShowSidebar((prev) => !prev);

  const handleSendMessage = (message) => {
    setChatLog((prev) => [
      ...prev,
      { role: 'user', text: message },
      { role: 'ai', text: "I'm thinking..." },
    ]);
  };

  return (
    <div className="flex min-h-screen bg-midnight text-white relative">
      {/* Sidebar */}
      {showSidebar && (
        <motion.div
          initial={{ x: -250, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -250, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 120 }}
          className="fixed top-0 left-0 h-full w-80 p-4 bg-gray-900 border-r border-gray-700 shadow-xl flex flex-col z-50"
        >
          {/* Header with Hide button */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-neon-purple select-none">🧠 AI Assistant</h2>
            <Button
              size="sm"
              variant="ghost"
              className="text-neon-pink hover:text-electric-blue px-2 py-1 rounded-lg"
              onClick={toggleSidebar}
              aria-label="Hide AI Sidebar"
            >
              Hide
            </Button>
          </div>

          {/* Features */}
          <ul className="text-sm space-y-1 mb-4 select-none">
            <li>✅ Suggests cards</li>
            <li>⚠️ Warns of issues</li>
            <li>💬 Explains synergy</li>
          </ul>

          {/* Chat Log */}
          <div className="flex-1 overflow-y-auto mb-4 rounded-lg p-2 bg-gray-800 border border-gray-700">
            {chatLog.length === 0 ? (
              <p className="text-gray-400 italic text-center select-none">No messages yet. Say hi!</p>
            ) : (
              chatLog.map((msg, idx) => (
                <div
                  key={idx}
                  className={`text-sm my-1 ${
                    msg.role === 'user' ? 'text-glow-blue' : 'text-yellow-400'
                  }`}
                >
                  <span className="font-bold">{msg.role === 'user' ? 'You' : 'AI'}:</span> {msg.text}
                </div>
              ))
            )}
          </div>

          {/* Chat Input */}
          <ChatInput onSend={handleSendMessage} />
        </motion.div>
      )}

      {/* Show Sidebar Button when hidden */}
      {!showSidebar && (
        <Button
          onClick={toggleSidebar}
          className="fixed top-4 left-4 z-50 bg-neon-pink shadow-glow-blue hover:bg-electric-blue px-4 py-2 rounded-lg font-semibold"
          aria-label="Show AI Sidebar"
        >
          Show AI Sidebar
        </Button>
      )}

      {/* Main Content */}
      <div
        className={`flex-1 px-6 py-10 transition-all duration-300 ${
          showSidebar ? 'ml-80' : 'ml-0'
        }`}
      >
        <section className="mb-10">
          <h2 className="text-3xl font-bold text-neon-purple mb-3">🎯 Choose Your Commander</h2>
          <div className="flex items-center gap-4">
            <Input
              type="text"
              value={commander}
              onChange={(e) => setCommander(e.target.value)}
              placeholder="Enter commander name"
              className="bg-gray-800 border-gray-700 text-white w-full"
            />
            <Button className="bg-electric-blue hover:bg-glow-blue font-semibold">
              Let AI Pick One
            </Button>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-3xl font-bold text-neon-purple mb-3">⚙️ Build Deck</h2>
          <Button className="bg-glow-blue hover:bg-neon-purple font-semibold shadow-glow-blue px-6">
            Generate AI Deck
          </Button>
        </section>

        <section className="mb-10">
          <h2 className="text-3xl font-bold text-neon-purple mb-3">📄 Deck List</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {deck.length === 0 ? (
              <p className="text-gray-400">No cards generated yet.</p>
            ) : (
              deck.map((card, idx) => (
                <div key={idx} className="bg-gray-800 p-4 rounded-xl shadow-inner">
                  <h4 className="font-bold text-glow-blue">{card.name}</h4>
                  <p className="text-sm text-gray-300">{card.type_line}</p>
                  <p className="text-sm text-yellow-500 font-bold">${card.price}</p>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-3xl font-bold text-neon-purple mb-3">📊 Deck Analytics</h2>
          {deckAnalytics ? (
            <div className="bg-gray-800 p-4 rounded-xl shadow-md space-y-2">
              <p>
                <strong>Mana Curve:</strong> {deckAnalytics.manaCurve}
              </p>
              <p>
                <strong>Color Pie:</strong> {deckAnalytics.colorPie}
              </p>
              <p>
                <strong>Breakdown:</strong> {deckAnalytics.breakdown}
              </p>
            </div>
          ) : (
            <p className="text-gray-400">Analytics will appear after AI generation.</p>
          )}
        </section>

        <section>
          <h2 className="text-3xl font-bold text-neon-purple mb-3">💾 Save Your Deck</h2>
          <div className="flex flex-wrap gap-4 items-center">
            <Button className="bg-glow-blue hover:bg-neon-pink font-semibold">
              Save to Account
            </Button>
            <label className="flex items-center gap-2 text-sm select-none">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={() => setIsPublic(!isPublic)}
              />
              Make Public
            </label>
            <Button className="bg-electric-blue hover:bg-neon-purple font-semibold">
              Share Link
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
