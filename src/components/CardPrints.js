import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function CardPrints() {
  const { state } = useLocation(); // Grabbing the card data from location state
  const navigate = useNavigate();
  const [prints, setPrints] = useState([]);
  const [loadingPrints, setLoadingPrints] = useState(false);
  const [fetchError, setFetchError] = useState(null); // Added for handling fetch errors
  const card = state?.card;

  // Log card data to make sure it's passed correctly
  console.log("Card received in CardPrints:", card);

  // Check if card exists and prints_search_uri exists before trying to fetch prints
  useEffect(() => {
    if (!card?.prints_search_uri) {
      console.log("No prints_search_uri found for this card.");
      setFetchError("No prints_search_uri available.");
      return; // If no prints_search_uri, do not proceed
    }

    const fetchPrints = async () => {
      setLoadingPrints(true);
      setFetchError(null); // Reset any previous fetch errors
      try {
        const res = await fetch(card.prints_search_uri);
        const data = await res.json();
        if (data.data) {
          setPrints(data.data); // Update prints state if data exists
        } else {
          setFetchError("No print data found."); // Set error if no print data
        }
      } catch (err) {
        console.error("Error fetching prints:", err);
        setFetchError("Error fetching prints data."); // Set error on network failure
      } finally {
        setLoadingPrints(false);
      }
    };

    fetchPrints();
  }, [card]); // Depend on card object to reload when it changes

  // Handle missing card or prints_search_uri
  if (!card) {
    return (
      <div className="text-center mt-20 text-gray-300">
        <p>Card data not found.</p>
        <button
          onClick={() => navigate(-1)}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          Go Back
        </button>
      </div>
    );
  }

  // Handle navigating to the CardDetail page with print data
  const handlePrintClick = (print) => {
    // Updated the path to /card/:id (matches your App.js routing)
    navigate(`/card/${card.id}`, { state: { card, print } });
  };

  return (
    <div className="max-w-6xl mx-auto mt-12 px-6 py-8 bg-[#112b4a] text-white rounded-xl shadow-2xl">
      <div className="flex flex-col items-center">
        <h2 className="text-3xl font-bold mb-6">Alternate Printings for {card?.name}</h2>

        {/* Handle loading state */}
        {loadingPrints && (
          <div className="text-center mt-6 text-blue-200 text-sm">Loading alternate printings...</div>
        )}

        {/* Handle fetch error state */}
        {fetchError && (
          <div className="text-center mt-6 text-red-500 text-sm">{fetchError}</div>
        )}

        {/* Render prints if available */}
        {prints.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {prints.map((p) => (
              <div
                key={p.id}
                className="bg-[#0d223f] p-2 rounded-lg text-center shadow-md hover:shadow-xl transition cursor-pointer"
                onClick={() => handlePrintClick(p)} // Make the print clickable
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
          <p className="text-center text-gray-400">No alternate printings found.</p>
        )}

        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="mt-6 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          Go Back
        </button>
      </div>
    </div>
  );
}
