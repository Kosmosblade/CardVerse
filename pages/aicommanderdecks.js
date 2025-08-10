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
  const [loadingDeck, setLoadingDeck] = useState(false);
  const [loadingCommander, setLoadingCommander] = useState(false);

  const toggleSidebar = () => setShowSidebar((prev) => !prev);

  const handleSendMessage = (message) => {
    setChatLog((prev) => [
      ...prev,
      { role: 'user', text: message },
      { role: 'ai', text: "I'm thinking..." },
    ]);
  };

  const handleRandomCommander = async () => {
    setLoadingCommander(true);
    try {
      const res = await fetch('/api/randomCommander');
      const data = await res.json();
      if (data.commander) {
        setCommander(data.commander);
      } else {
        console.error('randomCommander error:', data);
        alert('Failed to fetch a commander.');
      }
    } catch (err) {
      console.error('fetch randomCommander failed:', err);
      alert('Error fetching commander.');
    } finally {
      setLoadingCommander(false);
    }
  };

  const generateAIDeck = async () => {
    if (!commander.trim()) {
      alert('Please enter a commander name.');
      return;
    }

    setLoadingDeck(true);
    try {
      const res = await fetch('/api/deckbuilder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commander }),
      });
      const data = await res.json();

      if (res.ok && Array.isArray(data.deck)) {
        setDeck(data.deck);
        setDeckAnalytics({
          manaCurve: 'Coming soon...',
          colorPie: 'Coming soon...',
          breakdown: 'Coming soon...',
        });
      } else {
        console.error('deckbuilder response error:', data);
        alert(`Deck generation failed: ${data.error || data.message}`);
      }
    } catch (err) {
      console.error('Error generating deck:', err);
      alert('Something went wrong while generating the deck.');
    } finally {
      setLoadingDeck(false);
    }
  };

  return (
  <div className="flex min-h-screen bg-midnight text-white relative">
    {/* Sidebar */}
    {showSidebar && (
      <motion.div
        initial={{ x: -300, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: -300, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 100 }}
        className="fixed left-0 top-1/2 transform -translate-y-1/2 w-80 p-0 bg-gray-900/80 border border-white/20 rounded-r-2xl shadow-xl flex flex-col justify-between z-50"
      >
        {/* Top row: AI Assistant + Hide */}
        <div className="flex items-center justify-between mb-0">
          <h2 className="text-xl font-bold text-neon-purple select-none">
            🧠 AI Assistant
          </h2>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-neon-pink hover:text-electric-blue px-0 py-1 rounded-lg"
            onClick={toggleSidebar}
            aria-label="Hide AI Sidebar"
          >
            HIDE
          </Button>
        </div>

        {/* Feature list */}
        <ul className="text-sm space-y-1 mb-4 select-none">
          <li>✅ Suggests cards</li>
          <li>⚠️ Warns of issues</li>
          <li>💬 Explains synergy</li>
        </ul>

        {/* Chat messages */}
        <div className="flex-1 overflow-y-auto mb-4 rounded-lg p-0 bg-gray-800/70 border border-gray-700 max-h-64">
          {chatLog.length === 0 ? (
            <p className="text-gray-400 italic text-center select-none">
              No messages yet. Say hi!
            </p>
          ) : (
            chatLog.map((msg, idx) => (
              <div
                key={idx}
                className={`text-sm my-1 ${
                  msg.role === 'user' ? 'text-glow-blue' : 'text-yellow-400'
                }`}
              >
                <span className="font-bold ">
                  {msg.role === 'user' ? 'You' : 'AI'}:
                </span>{' '}
                {msg.text}
              </div>
            ))
          )}
        </div>

        {/* Chat input */}
        
        <ChatInput onSend={handleSendMessage} />
      </motion.div>
    )}


      {!showSidebar && (
        <Button
          type="button"
          onClick={toggleSidebar}
          className="fixed bottom-4 left-4 z-50 bg-neon-pink shadow-glow-blue hover:bg-electric-blue px-4 py-2 rounded-lg font-semibold transition-all duration-300"
          aria-label="Show AI Sidebar"
        >
          AI Sidebar
        </Button>
      )}

      <div className={`flex-1 px-6 py-10 transition-all duration-300 ${showSidebar ? 'ml-80' : 'ml-0'}`}>
        {/* Commander Picker */}
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
            <Button
              type="button"
              onClick={handleRandomCommander}
              disabled={loadingCommander}
              className={`bg-electric-blue hover:bg-glow-blue font-semibold transition-all duration-300 ${
                loadingCommander ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {loadingCommander ? 'Picking...' : 'Let AI Pick One'}
            </Button>
          </div>
        </section>

        {/* Build Deck */}
        <section className="mb-10">
          <h2 className="text-3xl font-bold text-neon-purple mb-3">⚙️ Build Deck</h2>
          <Button
            type="button"
            onClick={generateAIDeck}
            disabled={loadingDeck}
            className={`${
              loadingDeck ? 'opacity-50 cursor-not-allowed' : ''
            } bg-glow-blue hover:bg-neon-purple font-semibold shadow-glow-blue px-6 transition-all duration-300`}
          >
            {loadingDeck ? 'Generating...' : 'Generate AI Deck'}
          </Button>
        </section>

        {/* Deck List */}
        <section className="mb-10">
          <h2 className="text-3xl font-bold text-neon-purple mb-3">📄 Deck List</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {deck.length === 0 ? (
              <p className="text-gray-400">No cards generated yet.</p>
            ) : (
              deck.map((card, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.02 }}
                  className="bg-gray-800/80 border border-white/10 backdrop-blur-md p-4 rounded-xl shadow-lg hover:shadow-glow-blue transition-all duration-300"
                >
                  <h4 className="font-bold text-glow-blue">{card.name}</h4>
                  <p className="text-sm text-gray-300">{card.type_line}</p>
                  <p className="text-sm text-yellow-500 font-bold">{card.price ? `$${card.price}` : ''}</p>
                </motion.div>
              ))
            )}
          </div>
        </section>

        {/* Deck Analytics */}
        <section className="mb-10">
          <h2 className="text-3xl font-bold text-neon-purple mb-3">📊 Deck Analytics</h2>
          {deckAnalytics ? (
            <div className="bg-gray-800 p-4 rounded-xl shadow-md space-y-2">
              <p><strong>Mana Curve:</strong> {deckAnalytics.manaCurve}</p>
              <p><strong>Color Pie:</strong> {deckAnalytics.colorPie}</p>
              <p><strong>Breakdown:</strong> {deckAnalytics.breakdown}</p>
            </div>
          ) : (
            <p className="text-gray-400">Analytics will appear after AI generation.</p>
          )}
        </section>

        {/* Save/Share */}
        <section>
          <h2 className="text-3xl font-bold text-neon-purple mb-3">💾 Save Your Deck</h2>
          <div className="flex flex-wrap gap-4 items-center">
            <Button type="button" className="bg-glow-blue hover:bg-neon-pink font-semibold transition-all duration-300">
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
            <Button type="button" className="bg-electric-blue hover:bg-neon-purple font-semibold transition-all duration-300">
              Share Link
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
