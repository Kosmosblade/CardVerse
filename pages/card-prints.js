import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

export default function CardPrints() {
  const router = useRouter();
  const { name } = router.query;

  const [prints, setPrints] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!name) return;

    const fetchPrints = async () => {
      setLoading(true);
      setError(null);

      const query = encodeURIComponent(`!"${name}"`);
      const url = `https://api.scryfall.com/cards/search?q=${query}&unique=prints`;

      try {
        const res = await fetch(url);
        const data = await res.json();

        if (data.object === 'error') {
          setError(data.details || 'Failed to fetch prints');
          setPrints(null);
        } else {
          setPrints(data.data || []);
        }
      } catch {
        setError('Failed to fetch prints');
        setPrints(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPrints();
  }, [name]);

  if (!name) {
    return (
      <div className="text-center mt-20 text-gray-300">
        <p>Waiting for card name...</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center mt-20 text-gray-300">
        <p>Loading prints for "{name}"...</p>
      </div>
    );
  }

  if (error || !prints) {
    return (
      <div className="text-center mt-20 text-gray-300">
        <p>Error: {error || 'Unknown error'}</p>
        <button
          onClick={() => router.back()}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          Go Back
        </button>
      </div>
    );
  }

  if (prints.length === 0) {
    return (
      <div className="text-center mt-20 text-gray-300">
        <p>No prints found for "{name}".</p>
        <button
          onClick={() => router.back()}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          Go Back
        </button>
      </div>
    );
  }

  const handleSelectPrint = (print) => {
    // Navigate to card detail by scryfall_id
    if (print.id) {
      router.push(`/card/${print.id}`);
    } else if (print.name) {
      router.push(`/card/${encodeURIComponent(print.name)}`);
    }
  };

  return (
    <div className="max-w-6xl mx-auto mt-12 px-6 py-8 bg-[#112b4a] text-white rounded-xl shadow-2xl">
      <h1 className="text-4xl font-bold mb-8 text-center">Prints for "{name}"</h1>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
        {prints.map((print) => (
          <div
            key={print.id}
            onClick={() => handleSelectPrint(print)}
            className="bg-[#0b1f3a] rounded-lg p-3 shadow-lg flex flex-col items-center cursor-pointer hover:scale-[1.02] transition-transform duration-200"
          >
            <img
              src={
                print.image_uris?.normal ||
                print.card_faces?.[0]?.image_uris?.normal ||
                ''
              }
              alt={print.name}
              className="w-44 h-auto rounded-md mb-2"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'https://via.placeholder.com/223x310?text=No+Image';
              }}
              draggable={false}
            />
            <p className="text-center font-semibold text-lg">{print.set_name}</p>
            <p className="text-center text-sm capitalize text-gray-300">{print.rarity}</p>
            <a
              href={print.scryfall_uri}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 text-sm text-pink-400 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              View on Scryfall
            </a>
          </div>
        ))}
      </div>

      <div className="mt-8 flex justify-center">
        <button
          onClick={() => router.back()}
          className="px-6 py-2 bg-pink-600 text-white font-bold rounded-full shadow-lg hover:bg-pink-700 transition-all duration-300"
          type="button"
        >
          Back
        </button>
      </div>
    </div>
  );
}
