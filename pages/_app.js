// pages/_app.js
import '../styles/background.css';
import '../styles/globals.css';
import styles from '../styles/Inventory.module.css'; // if you have this file
import NavBar from '../components/NavBar';
import SearchBar from '../components/SearchBar';
import Card from '../components/Card';
import { AuthProvider } from '../context/AuthContext';
import { useState } from 'react';
import { useRouter } from 'next/router';

export default function MyApp({ Component, pageProps }) {
  const [query, setQuery] = useState('');
  const [cards, setCards] = useState([]);
  const router = useRouter();

  // Discord webhook helper function
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

  // Search handler function
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

      // Optional: navigate to homepage if not already there
      if (router.pathname !== '/') {
        router.push('/');
      }
    } catch (error) {
      alert('Error fetching card data');
      console.error('[Search Exception]', error);
    }
  };

  return (
    <AuthProvider>
      <div className="min-h-screen flex flex-col bg-[#0b1f3a] text-white relative overflow-hidden">
        {/* Background blur layer */}
        <div
          className="absolute inset-0 bg-animated-gradient bg-size-400 animate-gradient-move"
          style={{ filter: 'blur(80px)', opacity: 0.5, zIndex: -2 }}
        />
        <div className="background-overlay" />

        {/* Navbar */}
        <NavBar />

        {/* Show search bar only on home page */}
        {router.pathname === '/' && (
          <SearchBar query={query} setQuery={setQuery} handleSearch={handleSearch} />
        )}

        {/* Show card results above page content only on home page */}
        {router.pathname === '/' && cards.length > 0 && (
          <div className="max-w-6xl mx-auto px-6 mt-6 mb-12 w-full">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 justify-center items-center">
              {cards.map((card) => (
                <Card key={card.id} card={card} />
              ))}
            </div>
          </div>
        )}

        {/* Main page content */}
        <main className="flex-grow flex justify-center items-center p-6 max-w-6xl mx-auto mt-12">
          <Component {...pageProps} />
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
    </AuthProvider>
  );
}
