import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import SearchFilters from '../components/SearchFilters';
import SearchResults from '../components/SearchResults';

const STORAGE_KEY = 'advancedSearchState';

export default function AdvancedSearch() {
  const router = useRouter();

  // filters/state
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

  // Cards shown on current page (max 60)
  const [results, setResults] = useState([]);
  // All fetched cards accumulated across pages
  const [allCards, setAllCards] = useState([]);

  const [sets, setSets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [nextPageUrl, setNextPageUrl] = useState(null);

  const resultsRef = useRef(null);

  // Logging helper
  const pushLog = (msg, obj = null) => {
    const line = `${new Date().toISOString()} - ${msg}${
      obj ? ' | ' + (typeof obj === 'string' ? obj : JSON.stringify(obj)) : ''
    }`;
    console.log(line, obj ?? '');
  };

  // Restore saved state on mount
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.filters) setFilters(parsed.filters);
        if (parsed.results) setResults(parsed.results);
        if (parsed.allCards) setAllCards(parsed.allCards);
        if (parsed.currentPage) setCurrentPage(parsed.currentPage);
        if (parsed.hasMore !== undefined) setHasMore(parsed.hasMore);
        if (parsed.nextPageUrl) setNextPageUrl(parsed.nextPageUrl);
        pushLog('Restored saved state');
      }
    } catch (e) {
      pushLog('Failed to restore state', e.message || e);
    }
  }, []);

  // Save state on relevant changes
  useEffect(() => {
    try {
      const stateToSave = { filters, results, allCards, currentPage, hasMore, nextPageUrl };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (e) {
      pushLog('Failed to save state', e.message || e);
    }
  }, [filters, results, allCards, currentPage, hasMore, nextPageUrl]);

  // Remove saved state on unload
  useEffect(() => {
    const handleBeforeUnload = () => sessionStorage.removeItem(STORAGE_KEY);
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Save state on route change start
  useEffect(() => {
    const handler = () => {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ filters, results, allCards, currentPage, hasMore, nextPageUrl }));
      } catch (e) {
        pushLog('Failed to save state on route change', e.message || e);
      }
    };
    router.events.on('routeChangeStart', handler);
    return () => router.events.off('routeChangeStart', handler);
  }, [filters, results, allCards, currentPage, hasMore, nextPageUrl, router.events]);

  // Fetch all sets for filters
  useEffect(() => {
    async function fetchSets() {
      try {
        const r = await fetch('https://api.scryfall.com/sets');
        const data = await r.json();
        if (data?.data) {
          setSets(data.data.sort((a, b) => a.name.localeCompare(b.name)));
          pushLog('Fetched sets', { count: data.data.length });
        } else {
          pushLog('Unexpected sets payload', data);
        }
      } catch (err) {
        pushLog('Failed to fetch sets', err.message || err);
      }
    }
    fetchSets();
  }, []);

  const handleFilterChange = (field, value) => setFilters((p) => ({ ...p, [field]: value }));

  // Build Scryfall search query string from filters
  const buildQuery = (f) => {
    const q = [];
    if (f.name) q.push(`!"${f.name.trim()}"`);
    if (f.set) q.push(`set:${f.set.trim().toLowerCase()}`);
    if (f.type) q.push(`type:${f.type.trim().toLowerCase()}`);

    if (f.colors.length) {
      const colors = f.colors.map(c => c.toLowerCase()).sort();

      if (colors.length === 1) {
        q.push(`c>=${colors[0]}`);
      } else {
        const monoColorsQuery = colors.map(c => `c=${c}`).join(' or ');
        const exactMultiColorQuery = `c=${colors.join('')}`;
        q.push(`(${monoColorsQuery} or ${exactMultiColorQuery})`);
      }
    }

    if (f.manaCost) q.push(`cmc=${f.manaCost.trim()}`);
    if (f.rarity) q.push(`rarity:${f.rarity.toLowerCase()}`);
    if (f.power) q.push(`power=${f.power.trim()}`);
    if (f.toughness) q.push(`toughness=${f.toughness.trim()}`);
    if (f.text) q.push(f.text.trim());
    if (f.layout) q.push(`layout:${f.layout.toLowerCase()}`);
    if (f.format) q.push(`format:${f.format.toLowerCase()}`);
    if (f.priceMin) q.push(`usd>=${f.priceMin}`);
    if (f.priceMax) q.push(`usd<=${f.priceMax}`);
    if (f.styles.length) q.push(f.styles.map(s => (s === 'normal' ? '-is:foil -is:etched' : `is:${s}`)).join(' '));
    if (f.availability.length) q.push(f.availability.map(t => `is:${t}`).join(' '));

    return q.join(' ');
  };

  // Generate page url for Scryfall API
  const generatePageUrl = (pageNum) => {
    const q = buildQuery(filters).trim();
    if (!q) return null;
    return `https://api.scryfall.com/cards/search?q=${encodeURIComponent(q)}&unique=cards&order=name&page=${pageNum}`;
  };

  // Fetch all pages recursively from Scryfall
  const fetchAllPages = async (url, accumulated = []) => {
    pushLog('Fetching page', url);
    const r = await fetch(url);
    const data = await r.json();

    if (data?.object === 'error') {
      throw new Error(data.details || 'Scryfall API error');
    }

    const newAccumulated = [...accumulated, ...data.data];
    if (data.has_more && data.next_page) {
      return fetchAllPages(data.next_page, newAccumulated);
    }
    return newAccumulated;
  };

  // Fetch cards and accumulate all pages
  const fetchCardsAllPages = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = generatePageUrl(1);
      if (!url) {
        setError('Please enter at least one search filter.');
        pushLog('Search aborted - empty query');
        setLoading(false);
        return;
      }

      const allFetched = await fetchAllPages(url);
      setAllCards(allFetched);
      setResults(allFetched.slice(0, 60)); // Show first 60 cards on UI
      setCurrentPage(1);
      setHasMore(false);
      setNextPageUrl(null);

      pushLog(`Fetched all pages: total cards = ${allFetched.length}`);

      if (allFetched.length > 0) {
        await sendDiscordWebhook(allFetched[0]);
      }
    } catch (err) {
      setError(err.message || 'Error fetching cards');
      setResults([]);
      setAllCards([]);
      setHasMore(false);
      setNextPageUrl(null);
      pushLog('Error fetching cards', err.message || err);
    } finally {
      setLoading(false);
    }
  };

  // Send Discord webhook with fallback price
  const sendDiscordWebhook = async (card) => {
    if (!card) return pushLog('sendDiscordWebhook called with no card');

    const pageUrl = typeof window !== 'undefined' ? window.location.href : router.pathname;

    const rawPrice =
  card.prices?.usd ||
  card.prices?.usd_foil ||
  card.prices?.usd_etched;

const price = rawPrice ? `$${parseFloat(rawPrice).toFixed(2)}` : 'N/A';


    const payload = {
      username: 'Conjuerers Crypt Bot',
      embeds: [
        {
          title: `Card Searched: ${card.name}`,
          url: card.scryfall_uri || '',
          description: card.oracle_text || 'No description',
          color: 7506394,
          fields: [
            { name: 'Set', value: card.set_name || 'N/A', inline: true },
            { name: 'Rarity', value: card.rarity || 'N/A', inline: true },
            { name: 'Price (USD)', value: price, inline: true },
            { name: 'Searched From', value: router.pathname || 'unknown', inline: true },
            { name: 'Page URL', value: pageUrl || 'unknown', inline: false },
          ],
          thumbnail: { url: card.image_uris?.small || card.card_faces?.[0]?.image_uris?.small || '' },
          footer: { text: `Source: ${router.pathname || 'unknown'}` },
          timestamp: new Date().toISOString(),
        },
      ],
    };

    pushLog('Posting webhook', { name: card.name, source: router.pathname, url: pageUrl });

    try {
      const res = await fetch('/api/send-to-discord', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      let text;
      try {
        text = await res.text();
      } catch (_) {
        text = '<no-body>';
      }

      if (!res.ok) {
        pushLog('Webhook POST failed', { status: res.status, statusText: res.statusText, body: text });
        console.error('[AdvancedSearch] webhook error', { status: res.status, statusText: res.statusText, body: text, payload });
        return false;
      } else {
        pushLog('Webhook POST success', { status: res.status, body: text });
        console.log('[AdvancedSearch] webhook success', text);
        return true;
      }
    } catch (err) {
      pushLog('Webhook POST exception', err.message || err);
      console.error('[AdvancedSearch] webhook exception', err);
      return false;
    }
  };

  // Pagination handlers just slice cached allCards
  const handleNextPage = () => {
    const nextPage = currentPage + 1;
    const start = (nextPage - 1) * 60;
    const end = start + 60;
    if (start >= allCards.length) return; // no more pages
    setCurrentPage(nextPage);
    setResults(allCards.slice(start, end));
  };

  const handlePrevPage = () => {
    if (currentPage <= 1) return;
    const prevPage = currentPage - 1;
    const start = (prevPage - 1) * 60;
    const end = start + 60;
    setCurrentPage(prevPage);
    setResults(allCards.slice(start, end));
  };

  // Submit handler triggers fetch
  const handleSubmit = (e) => {
    e.preventDefault();
    fetchCardsAllPages();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Scroll to results on update
  useEffect(() => {
    if (results.length && resultsRef.current)
      resultsRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [results]);

  // Manual webhook resend helper
  const handleResend = async (card) => {
    pushLog('Manual resend requested', { id: card.id, name: card.name });
    await sendDiscordWebhook(card);
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
            <img
              src="/assets/searching...png"
              alt="Searching"
              className="w-32 h-auto animate-pulse transition"
            />
          ) : (
            <img
              src="/assets/search.png"
              alt="Search"
              className="w-32 h-auto hover:opacity-80 transition"
            />
          )}
        </button>
      </form>

      {error && (
        <p className="text-red-500 text-center mt-4">{error}</p>
      )}

      <div ref={resultsRef} className="mt-6">
        <SearchResults results={results} />
      </div>

      {results.length > 0 && (
        <>
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
              disabled={(currentPage * 60) >= allCards.length || loading}
              className="px-4 py-2 rounded bg-gray-700 text-white disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
