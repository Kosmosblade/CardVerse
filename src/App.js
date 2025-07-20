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
import NavBar from './components/NavBar'; // Ensure the NavBar is imported
import SearchBar from './components/SearchBar'; // Import SearchBar

// The App function
export default function App() {
  const [query, setQuery] = useState('');
  const [cards, setCards] = useState([]);
  const location = useLocation();

  const sendDiscordWebhook = async (card) => {
    const payload = {
      username: 'CardVerse Bot',
      embeds: [
        {
          title: `Card Searched: ${card.name}`,
          url: card.scryfall_uri,
          description: card.oracle_text || 'No description',
          color: 7506394,
          fields: [
            { name: 'Set', value: card.set_name, inline: true },
            { name: 'Rarity', value: card.rarity, inline: true },
            { name: 'Price (USD)', value: card.prices?.usd || 'N/A', inline: true },
          ],
          thumbnail: { url: card.image_uris?.small || '' },
          timestamp: new Date().toISOString(),
        },
      ],
    };

    try {
      await fetch('/api/send-to-discord', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.error('Webhook send error:', err);
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
        setCards([]);
        return;
      }

      setCards([data]);
      await sendDiscordWebhook(data);
    } catch (error) {
      alert('Error fetching card data');
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0b1f3a] text-white relative overflow-hidden">
      {/* Background gradient blur */}
      <div
        className="absolute inset-0 bg-animated-gradient bg-size-400 animate-gradient-move"
        style={{ filter: 'blur(80px)', opacity: 0.5, zIndex: -2 }}
      />
      <div className="background-overlay" />

      {/* Navbar - This should be at the top */}
      <NavBar />

      {/* Only render SearchBar on homepage */}
      {location.pathname === '/' && <SearchBar query={query} setQuery={setQuery} handleSearch={handleSearch} />}

      {/* Main content */}
      <main className="flex-grow p-6 max-w-6xl mx-auto mt-12"> {/* Added margin-top */}
        <Routes>
          <Route
            path="/"
            element={cards.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {cards.map((card) => (
                  <Card key={card.id} card={card} />
                ))}
              </div>
            ) : (
              <SearchPage />
            )}
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
          <Route path="*" element={<div className="text-center text-gray-300 text-xl mt-10">Page not found</div>} />
        </Routes>
      </main>

      {/* Footer */}
      <footer className="bg-[#112b4a] border-t mt-20 p-4 text-center text-sm text-blue-200 shadow-inner">
        &copy; {new Date().getFullYear()} CardVerse. All rights reserved.
      </footer>
    </div>
  );
}
