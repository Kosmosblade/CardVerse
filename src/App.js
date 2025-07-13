import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import DeckBuilder from './pages/DeckBuilder';
import Inventory from './pages/Inventory';
import About from './pages/About';
import SearchPage from './pages/SearchPage';
import SearchBar from './components/SearchBar';
import Card from './components/Card';
import './styles/Background.css';

export default function App() {
  const [query, setQuery] = React.useState('');
  const [cards, setCards] = React.useState([]);

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
    } catch (error) {
      alert('Error fetching card data');
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col text-gray-100 relative overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 bg-animated-gradient bg-size-400 animate-gradient-move"
        style={{ filter: 'blur(80px)', opacity: 0.7, zIndex: -2 }}
      />
      <div className="background-overlay" />

      {/* Search Bar Top Left */}
      <div className="absolute top-4 left-4 z-50">
        <SearchBar query={query} setQuery={setQuery} handleSearch={handleSearch} />
      </div>

      {/* Header */}
      <header className="bg-white/90 backdrop-blur border-b shadow-md pt-36 sticky top-0 z-40">
        <div className="max-w-screen-xl mx-auto px-6 pb-4 flex flex-col items-center">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-4">
            <img
              src={`${process.env.PUBLIC_URL}/assets/logo.png`}
              alt="CardVerse Logo"
              className="h-10 w-auto drop-shadow-md"
            />
            <span className="text-3xl font-extrabold text-blue-600 tracking-wide">
              Card<span className="text-indigo-500">Verse</span>
            </span>
          </div>

          {/* Navigation */}
          <nav className="flex flex-wrap justify-center gap-8 text-gray-700 font-medium text-lg">
            <Link to="/" className="hover:text-blue-600 transition duration-200">Browse Cards</Link>
            <Link to="/decks" className="hover:text-blue-600 transition duration-200">My Decks</Link>
            <Link to="/inventory" className="hover:text-blue-600 transition duration-200">Inventory</Link>
            <Link to="/about" className="hover:text-blue-600 transition duration-200">About</Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow p-6 max-w-6xl mx-auto mt-6">
        {cards.length === 0 ? (
          <Routes>
            <Route path="/" element={<SearchPage />} />
            <Route path="/decks" element={<DeckBuilder />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/about" element={<About />} />
          </Routes>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {cards.map((card) => (
              <Card key={card.id} card={card} />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-20 p-4 text-center text-sm text-gray-500 shadow-inner">
        &copy; {new Date().getFullYear()} CardVerse. All rights reserved.
      </footer>
    </div>
  );
}
