// src/App.js
import React, { useState } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import DeckBuilder from './pages/DeckBuilder';
import Inventory from './pages/Inventory';
import SearchPage from './pages/SearchPage';
import About from './pages/About';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Profile from './pages/Profile';
import Logout from './pages/Logout';
import Card from './components/Card';
import './styles/Background.css';
import CardDetail from './pages/CardDetail';
import CardPrints from './components/CardPrints';
import NavBar from './components/NavBar';
import SearchBar from './components/SearchBar';
import AdvancedSearch from './pages/AdvancedSearch';
import AICommanderDecks from './pages/AICommanderDecks';
import TestComponents from './pages/TestComponents.js';


export default function App() {
  const [query, setQuery] = useState('');
  const [cards, setCards] = useState([]);
  const location = useLocation();

  const sendDiscordWebhook = async (card) => {
    const payload = {
      username: 'Conjuring Crypt Bot',
      embeds: [
        {
          title: `Card Searched: ${card.name}`,
          url: card.scryfall_uri,
          description: card.oracle_text || 'No description',
          color: 7506394,
          fields: [
            { name: 'Set', value: card.set_name || 'N/A', inline: true },
            { name: 'Rarity', value: card.rarity || 'N/A', inline: true },
            { name: 'Price (USD)', value: card.prices?.usd || 'N/A', inline: true },
          ],
          thumbnail: { url: card.image_uris?.small || '' },
          timestamp: new Date().toISOString(),
        },
      ],
    };

    try {
      const res = await fetch('/api/send-to-discord', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error('[Webhook Error]', {
          status: res.status,
          statusText: res.statusText,
          response: errorText,
          payload,
        });
      } else {
        console.log('[✅ Webhook Success]', await res.json());
      }
    } catch (err) {
      console.error('[Webhook Exception]', err);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    try {
      const res = await fetch(
        `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(query.trim())}`
      );
      const data = await res.json();

      if (data.object === 'error') {
        alert('Card not found');
        console.warn('[Scryfall Error]', data);
        setCards([]);
        return;
      }

      setCards([data]);
      console.log('[Card Fetched]', data);
      await sendDiscordWebhook(data);
    } catch (error) {
      alert('Error fetching card data');
      console.error('[Search Exception]', error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0b1f3a] text-white relative overflow-hidden">
      {/* Background blur layer */}
      <div
        className="absolute inset-0 bg-animated-gradient bg-size-400 animate-gradient-move"
        style={{ filter: 'blur(80px)', opacity: 0.5, zIndex: -2 }}
      />
      <div className="background-overlay" />

      {/* NavBar */}
      <NavBar />

      {/* Show search bar only on home page */}
      {location.pathname === '/' && (
        <SearchBar query={query} setQuery={setQuery} handleSearch={handleSearch} />
      )}

      {/* Main Routes */}
      <main className="flex-grow flex justify-center items-center p-6 max-w-6xl mx-auto mt-12">
        <div className="w-full flex justify-center">
          <Routes>
            <Route
              path="/"
              element={
                cards.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 justify-center items-center">
                    {cards.map((card) => (
                      <Card key={card.id} card={card} />
                    ))}
                  </div>
                ) : (
                  <SearchPage />
                )
              }
            />
            <Route path="/decks" element={<DeckBuilder />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/about" element={<About />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/logout" element={<Logout />} />
            <Route path="/card/:id" element={<CardDetail />} />
            <Route path="/card-prints" element={<CardPrints />} />
            <Route path="/advanced-search" element={<AdvancedSearch />} />
            <Route path="/test-components" element={<TestComponents />} />
            <Route path="/test" element={<TestComponents />} />


            {/* ✅ Ensure route path matches component casing exactly */}
            <Route path="/AICommanderDecks" element={<AICommanderDecks />} />

            {/* Fallback */}
            <Route
              path="*"
              element={
                <div className="text-center text-gray-300 text-xl mt-10">
                  Page not found
                </div>
              }
            />
          </Routes>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#112b4a] border-t mt-20 p-4 text-center text-sm text-yellow-500 shadow-inner">
        <p style={{ fontSize: '0.8em', color: 'gray', marginBottom: '0.5rem' }}>
          Card data and images © Wizards of the Coast. Data provided by{' '}
          <a
            href="https://scryfall.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Scryfall
          </a>
          . This site is not affiliated with, endorsed, or sponsored by Wizards of the Coast LLC.
        </p>
        &copy; {new Date().getFullYear()} Conjuring Crypt. All rights reserved.
      </footer>
    </div>
  );
}
