import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import SearchFilters from '../components/SearchFilters';

const STORAGE_KEY = 'advancedSearchState';

export default function AdvancedSearch() {
  const router = useRouter();
  const [filters, setFilters] = useState({
    name: '',
    set: '',
    type: '',
    colors: [],
    manaCost: '',
    rarity: '',
    power: '',
    toughness: '',
    text: '',
    layout: '',
    format: '',
    priceMin: '',
    priceMax: '',
    styles: [],
    availability: [],
  });
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sets, setSets] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [nextPageUrl, setNextPageUrl] = useState(null);
  const resultsRef = useRef(null);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setFilters(parsed.filters || filters);
        setResults(parsed.results || []);
        setCurrentPage(parsed.currentPage || 1);
        setHasMore(parsed.hasMore || false);
        setNextPageUrl(parsed.nextPageUrl || null);
      }
    } catch (e) {
      console.warn('Restore failed:', e);
    }
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ filters, results, currentPage, hasMore, nextPageUrl })
      );
    } catch (e) {
      console.warn('Save failed:', e);
    }
  }, [filters, results, currentPage, hasMore, nextPageUrl]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      sessionStorage.removeItem(STORAGE_KEY);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  useEffect(() => {
    router.events.on('routeChangeStart', () => {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ filters, results, currentPage, hasMore, nextPageUrl })
      );
    });
    return () => {
      router.events.off('routeChangeStart', () => {});
    };
  }, [filters, results, currentPage, hasMore, nextPageUrl, router.events]);

  useEffect(() => {
    async function fetchSets() {
      try {
        const res = await fetch('https://api.scryfall.com/sets');
        const data = await res.json();
        if (data?.data) {
          setSets(data.data.sort((a, b) => a.name.localeCompare(b.name)));
        }
      } catch (err) {
        console.error('Failed to fetch sets:', err);
      }
    }
    fetchSets();
  }, []);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const buildQuery = (f) => {
    const q = [];
    if (f.name) q.push(`!"${f.name.trim()}"`);
    if (f.set) q.push(`set:${f.set.trim().toLowerCase()}`);
    if (f.type) q.push(`type:${f.type.trim().toLowerCase()}`);
    if (f.colors.length) q.push(`c>=${f.colors.join('')}`);
    if (f.manaCost) q.push(`cmc=${f.manaCost.trim()}`);
    if (f.rarity) q.push(`rarity:${f.rarity.toLowerCase()}`);
    if (f.power) q.push(`power=${f.power.trim()}`);
    if (f.toughness) q.push(`toughness=${f.toughness.trim()}`);
    if (f.text) q.push(f.text.trim());
    if (f.layout) q.push(`layout:${f.layout.toLowerCase()}`);
    if (f.format) q.push(`format:${f.format.toLowerCase()}`);
    if (f.priceMin) q.push(`usd>=${f.priceMin}`);
    if (f.priceMax) q.push(`usd<=${f.priceMax}`);
    if (f.styles.length) {
      q.push(
        f.styles
          .map((style) =>
            style === 'normal' ? '-is:foil -is:etched' : `is:${style}`
          )
          .join(' ')
      );
    }
    if (f.availability.length) {
      q.push(f.availability.map((tag) => `is:${tag}`).join(' '));
    }
    return q.join(' ');
  };

  const generatePageUrl = (pageNum) => {
    const query = buildQuery(filters).trim();
    if (!query) return null;
    return `https://api.scryfall.com/cards/search?q=${encodeURIComponent(
      query
    )}&unique=cards&order=name&page=${pageNum}`;
  };

  const fetchCards = async (pageUrl = null, resetPage = false) => {
    setLoading(true);
    setError(null);
    try {
      const url = pageUrl || generatePageUrl(resetPage ? 1 : currentPage);
      if (!url) {
        setError('Please enter at least one search filter.');
        setLoading(false);
        return;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.object === 'error') {
        setError(data.details || 'No cards found.');
        setResults([]);
        setHasMore(false);
        setNextPageUrl(null);
      } else {
        setResults(data.data.slice(0, 60));
        setHasMore(data.has_more);
        setNextPageUrl(data.has_more ? data.next_page : null);
      }
    } catch (err) {
      console.error('Error fetching cards:', err);
      setError('Error fetching card data.');
      setResults([]);
      setHasMore(false);
      setNextPageUrl(null);
    }
    setLoading(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchCards(null, true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="p-6 max-w-6xl mx-auto min-h-screen text-black">
      <img
        src="/assets/advancesearch.png"
        alt="Advanced Search"
        className="mb-1 w-1/2 max-w-md mx-auto"
      />

      <form onSubmit={handleSubmit} className="flex flex-col">
        <SearchFilters filters={filters} onChange={handleFilterChange} sets={sets} />
        <button
          type="submit"
          disabled={loading}
          className="mt-4 mb-8 p-0 border-none bg-transparent self-start"
        >
          {loading ? (
            <img src="/assets/searching...png" alt="Searching" className="w-32 h-auto animate-pulse" />
          ) : (
            <img src="/assets/search.png" alt="Search" className="w-32 h-auto hover:opacity-80" />
          )}
        </button>
      </form>

      {error && <p className="text-red-500 text-center mt-4">{error}</p>}

      <div ref={resultsRef} className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        {results.map((card) => (
          <Link key={card.id} href={`/card/${card.id}`} className="block">
            <img
              src={card.image_uris?.normal || card.card_faces?.[0]?.image_uris?.normal}
              alt={card.name}
              className="rounded shadow hover:scale-105 transition-transform"
            />
            <p className="mt-1 text-center">{card.name}</p>
          </Link>
        ))}
      </div>

      {results.length > 0 && (
        <div className="flex justify-center gap-4 mt-6">
          <button
            onClick={() => {
              if (currentPage > 1) {
                setCurrentPage((p) => p - 1);
                fetchCards(generatePageUrl(currentPage - 1));
              }
            }}
            disabled={currentPage === 1 || loading}
            className="px-4 py-2 rounded bg-gray-700 text-white disabled:opacity-50"
          >
            Previous
          </button>
          <span className="self-center">Page {currentPage}</span>
          <button
            onClick={() => {
              if (hasMore) {
                setCurrentPage((p) => p + 1);
                fetchCards(nextPageUrl);
              }
            }}
            disabled={!hasMore || loading}
            className="px-4 py-2 rounded bg-gray-700 text-white disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
