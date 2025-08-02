// pages/advanced-search.js

import React, { useState, useRef, useEffect } from 'react';
import SearchFilters from '../components/SearchFilters';
import SearchResults from '../components/SearchResults';

export default function AdvancedSearch() {
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

  // Fetch sets on load
  useEffect(() => {
    async function fetchSets() {
      try {
        const res = await fetch('https://api.scryfall.com/sets');
        const data = await res.json();
        if (data?.data) {
          const sorted = data.data.sort((a, b) => a.name.localeCompare(b.name));
          setSets(sorted);
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
      const styles = f.styles.map((style) =>
        style === 'normal' ? '-is:foil -is:etched' : `is:${style}`
      );
      q.push(styles.join(' '));
    }

    if (f.availability.length) {
      const avail = f.availability.map((tag) => `is:${tag}`);
      q.push(avail.join(' '));
    }

    return q.join(' ');
  };

  const generatePageUrl = (pageNum) => {
    const query = buildQuery(filters).trim();
    return `https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}&unique=cards&order=name&page=${pageNum}`;
  };

  const fetchCards = async (pageUrl = null) => {
    setLoading(true);
    setError(null);

    try {
      const url = pageUrl || generatePageUrl(currentPage);
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
    fetchCards();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNextPage = () => {
    if (!nextPageUrl) return;
    setCurrentPage((prev) => prev + 1);
    fetchCards(nextPageUrl);
  };

  const handlePrevPage = () => {
    if (currentPage <= 1) return;
    const prevUrl = generatePageUrl(currentPage - 1);
    setCurrentPage((prev) => prev - 1);
    fetchCards(prevUrl);
  };

  useEffect(() => {
    if (results.length && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [results]);

  return (
    <div className="p-6 max-w-5xl mx-auto min-h-screen text-white">
      <h1 className="text-2xl font-bold mb-4">Advanced Search</h1>

      <form onSubmit={handleSubmit} className="flex flex-col">
        <SearchFilters filters={filters} onChange={handleFilterChange} sets={sets} />
        <button
          type="submit"
          disabled={loading}
          className="mt-4 mb-8 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 self-start"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {error && <p className="text-red-500 text-center mt-4">{error}</p>}

      <div ref={resultsRef} className="mt-6">
        <SearchResults results={results} />
      </div>

      {results.length > 0 && (
        <div className="flex justify-center gap-4 mt-6">
          <button
            onClick={handlePrevPage}
            disabled={currentPage === 1 || loading}
            className="px-4 py-2 rounded bg-gray-700 text-white disabled:opacity-50"
          >
            Previous
          </button>
          <span className="self-center">Page {currentPage}</span>
          <button
            onClick={handleNextPage}
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
