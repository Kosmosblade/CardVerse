// src/components/CardPrints.js
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export default function CardPrints() {
  const router = useRouter();
  const { query } = router;
  const [prints, setPrints] = useState([]);
  const [loadingPrints, setLoadingPrints] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  // Card data is passed via router query or pageProps. 
  // For this example, we expect card data passed via router query as JSON string or via state-like approach.
  // If you are using Next.js 13+ with app router, you might use props or server fetch.
  // Here, fallback to query param "card" as JSON string:
  const card = React.useMemo(() => {
    if (query.card) {
      try {
        return JSON.parse(query.card);
      } catch {
        return null;
      }
    }
    return null;
  }, [query.card]);

  useEffect(() => {
    if (!card?.prints_search_uri) {
      setFetchError('No prints_search_uri available.');
      return;
    }

    const fetchPrints = async () => {
      setLoadingPrints(true);
      setFetchError(null);

      try {
        const res = await fetch(card.prints_search_uri);
        const data = await res.json();

        if (data.data) {
          setPrints(data.data);
        } else {
          setFetchError('No print data found.');
        }
      } catch (err) {
        console.error('Error fetching prints:', err);
        setFetchError('Error fetching prints data.');
      } finally {
        setLoadingPrints(false);
      }
    };

    fetchPrints();
  }, [card?.prints_search_uri]);

  if (!card) {
    return (
      <div className="text-center mt-20 text-gray-300">
        <p>Card data not found.</p>
        <button
          onClick={() => router.back()}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          Go Back
        </button>
      </div>
    );
  }

  // Navigate to card detail page passing print as JSON string in query (could also consider state or global store)
  const handlePrintClick = (print) => {
    router.push({
      pathname: `/card/${card.id}`,
      query: {
        card: JSON.stringify(card),
        print: JSON.stringify(print),
      },
    });
  };

  return (
    <div className="max-w-6xl mx-auto mt-12 px-6 py-8 bg-[#112b4a] text-white rounded-xl shadow-2xl">
      <div className="flex flex-col items-center">
        <h2 className="text-3xl font-bold mb-6">Alternate Printings for {card.name}</h2>

        {loadingPrints && (
          <div className="text-center mt-6 text-blue-200 text-sm">Loading alternate printings...</div>
        )}

        {fetchError && (
          <div className="text-center mt-6 text-red-500 text-sm">{fetchError}</div>
        )}

        {prints.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {prints.map((p) => (
              <div
                key={p.id}
                className="bg-[#0d223f] p-2 rounded-lg text-center shadow-md hover:shadow-xl transition cursor-pointer"
                onClick={() => handlePrintClick(p)}
              >
                <img
                  src={p.image_uris?.small || p.card_faces?.[0]?.image_uris?.small || 'https://via.placeholder.com/150x210?text=No+Image'}
                  alt={p.name}
                  className="rounded-md mb-2 mx-auto"
                />
                <p className="text-sm text-blue-100">{p.set_name}</p>
                <p className="text-xs text-gray-300">{p.rarity}</p>
              </div>
            ))}
          </div>
        ) : (
          !loadingPrints && <p className="text-center text-gray-400">No alternate printings found.</p>
        )}

        <button
          onClick={() => router.back()}
          className="mt-6 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          Go Back
        </button>
      </div>
    </div>
  );
}
