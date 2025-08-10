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

  const [results, setResults] = useState([]);
  const [sets, setSets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [nextPageUrl, setNextPageUrl] = useState(null);

  // debug log shown on page
  const [webhookLog, setWebhookLog] = useState([]);
  const resultsRef = useRef(null);

  const pushLog = (msg, obj = null) => {
    const line = `${new Date().toISOString()} - ${msg}${obj ? ' | ' + (typeof obj === 'string' ? obj : JSON.stringify(obj)) : ''}`;
    // eslint-disable-next-line no-console
    console.log(line, obj ?? '');
    setWebhookLog((s) => [line, ...s].slice(0, 200));
  };

  // Restore state
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.filters) setFilters(parsed.filters);
        if (parsed.results) setResults(parsed.results);
        if (parsed.currentPage) setCurrentPage(parsed.currentPage);
        if (parsed.hasMore !== undefined) setHasMore(parsed.hasMore);
        if (parsed.nextPageUrl) setNextPageUrl(parsed.nextPageUrl);
        pushLog('Restored saved state');
      }
    } catch (e) {
      pushLog('Failed to restore state', e.message || e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      const stateToSave = { filters, results, currentPage, hasMore, nextPageUrl };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (e) {
      pushLog('Failed to save state', e.message || e);
    }
  }, [filters, results, currentPage, hasMore, nextPageUrl]);

  useEffect(() => {
    const handleBeforeUnload = () => sessionStorage.removeItem(STORAGE_KEY);
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  useEffect(() => {
    const handler = () => {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ filters, results, currentPage, hasMore, nextPageUrl }));
      } catch (e) {
        pushLog('Failed to save state on route change', e.message || e);
      }
    };
    router.events.on('routeChangeStart', handler);
    return () => router.events.off('routeChangeStart', handler);
  }, [filters, results, currentPage, hasMore, nextPageUrl, router.events]);

  // fetch sets
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
    if (f.styles.length) q.push(f.styles.map(s => (s === 'normal' ? '-is:foil -is:etched' : `is:${s}`)).join(' '));
    if (f.availability.length) q.push(f.availability.map(t => `is:${t}`).join(' '));
    return q.join(' ');
  };

  const generatePageUrl = (pageNum) => {
    const q = buildQuery(filters).trim();
    if (!q) return null;
    return `https://api.scryfall.com/cards/search?q=${encodeURIComponent(q)}&unique=cards&order=name&page=${pageNum}`;
  };

  // send webhook (includes source info)
  const sendDiscordWebhook = async (card) => {
    if (!card) return pushLog('sendDiscordWebhook called with no card');

    // safe get page url (window only available client-side)
    const pageUrl = typeof window !== 'undefined' ? window.location.href : router.pathname;

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
            { name: 'Price (USD)', value: card.prices?.usd || 'N/A', inline: true },
            // --- new fields showing source info ---
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
      try { text = await res.text(); } catch (_) { text = '<no-body>'; }

      if (!res.ok) {
        pushLog('Webhook POST failed', { status: res.status, statusText: res.statusText, body: text });
        // eslint-disable-next-line no-console
        console.error('[AdvancedSearch] webhook error', { status: res.status, statusText: res.statusText, body: text, payload });
        return false;
      } else {
        pushLog('Webhook POST success', { status: res.status, body: text });
        // eslint-disable-next-line no-console
        console.log('[AdvancedSearch] webhook success', text);
        return true;
      }
    } catch (err) {
      pushLog('Webhook POST exception', err.message || err);
      // eslint-disable-next-line no-console
      console.error('[AdvancedSearch] webhook exception', err);
      return false;
    }
  };

  // fetch cards and trigger webhook for first result
  const fetchCards = async (pageUrl = null, resetPage = false) => {
    setLoading(true);
    setError(null);

    try {
      const url = pageUrl || generatePageUrl(resetPage ? 1 : currentPage);
      if (!url) {
        setError('Please enter at least one search filter.');
        pushLog('Search aborted - empty query');
        setLoading(false);
        return;
      }

      pushLog('Fetching Scryfall', url);
      const r = await fetch(url);
      const data = await r.json();

      if (data?.object === 'error') {
        setError(data.details || 'No cards found.');
        setResults([]);
        setHasMore(false);
        setNextPageUrl(null);
        pushLog('Scryfall error', data);
      } else {
        setResults(data.data.slice(0, 60));
        setHasMore(data.has_more);
        setNextPageUrl(data.has_more ? data.next_page : null);
        pushLog(`Scryfall returned ${data.data.length} results (has_more=${data.has_more})`);

        if (data.data && data.data.length > 0) {
          const first = data.data[0];
          pushLog('Triggering webhook for first result', { id: first.id, name: first.name });
          await sendDiscordWebhook(first);
        }
      }
    } catch (err) {
      pushLog('Error fetching cards', err.message || err);
      setError('Error fetching card data.');
      setResults([]);
      setHasMore(false);
      setNextPageUrl(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchCards(null, true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNextPage = () => {
    if (!nextPageUrl) return;
    setCurrentPage((p) => p + 1);
    fetchCards(nextPageUrl);
  };

  const handlePrevPage = () => {
    if (currentPage <= 1) return;
    const prevUrl = generatePageUrl(currentPage - 1);
    setCurrentPage((p) => p - 1);
    fetchCards(prevUrl);
  };

  useEffect(() => {
    if (results.length && resultsRef.current) resultsRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [results]);

  // manual resend helper
  const handleResend = async (card) => {
    pushLog('Manual resend requested', { id: card.id, name: card.name });
    await sendDiscordWebhook(card);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto min-h-screen text-black">
      <img src="/assets/advancesearch.png" alt="Advanced Search" className="mb-1 w-1/2 max-w-md mx-auto" />

      <form onSubmit={handleSubmit} className="flex flex-col">
        <SearchFilters filters={filters} onChange={handleFilterChange} sets={sets} />

        <button type="submit" disabled={loading} className="mt-4 mb-8 p-0 border-none bg-transparent self-start">
          {loading ? (
            <img src="/assets/searching...png" alt="Searching" className="w-32 h-auto animate-pulse transition" />
          ) : (
            <img src="/assets/search.png" alt="Search" className="w-32 h-auto hover:opacity-80 transition" />
          )}
        </button>
      </form>

      {error && <p className="text-red-500 text-center mt-4">{error}</p>}

      <div ref={resultsRef} className="mt-6">
        <SearchResults results={results} />
      </div>

      {results.length > 0 && (
        <>
          <div className="flex justify-center gap-4 mt-6">
            <button onClick={handlePrevPage} disabled={currentPage === 1 || loading} className="px-4 py-2 rounded bg-gray-700 text-white disabled:opacity-50">Previous</button>
            <span className="self-center">Page {currentPage}</span>
            <button onClick={handleNextPage} disabled={!hasMore || loading} className="px-4 py-2 rounded bg-gray-700 text-white disabled:opacity-50">Next</button>
          </div>

          <div className="mt-6">
            <strong>Manual webhook tools</strong>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
              {results.map((card) => (
                <div key={card.id} className="p-2 border rounded bg-white/90">
                  <div className="font-medium">{card.name}</div>
                  <div className="text-xs text-gray-600">{card.set_name || 'Unknown set'}</div>
                  <button onClick={() => handleResend(card)} className="mt-2 px-2 py-1 bg-blue-600 text-white rounded text-sm">Resend webhook</button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Debug panel */}
      <div className="mt-8 bg-gray-100 p-4 rounded shadow-inner text-xs text-gray-800">
        <div className="flex items-center justify-between mb-2">
          <strong>Webhook Debug Log</strong>
          <button onClick={() => setWebhookLog([])} className="text-sm px-2 py-1 bg-red-500 text-white rounded">Clear</button>
        </div>
        <div style={{ maxHeight: 240, overflow: 'auto', whiteSpace: 'pre-wrap' }}>
          {webhookLog.length === 0 && <div className="text-gray-500">No webhook activity yet.</div>}
          {webhookLog.map((l, i) => <div key={i} className="mb-1">{l}</div>)}
        </div>
      </div>
    </div>
  );
}
