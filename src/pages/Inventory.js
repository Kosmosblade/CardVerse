import React, {
  useState,
  useEffect,
  useCallback,
  memo,
  useMemo,
  useRef,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import CardCountDisplay from '../components/CardCountDisplay'; // new component
import './Inventory.css';

const CardItem = memo(function CardItem({
  card,
  onClick,
  onDelete,
  onHover,
  flipped,
  onFlip,
}) {
  const frontImage = card.image_url || '/placeholder.jpg';
  const backImage = card.back_image_url || null;
  const displayedImage = flipped && backImage ? backImage : frontImage;

  return (
    <div
      className="card-item relative group cursor-pointer"
      onClick={() => onClick(card)}
      onMouseEnter={() => onHover(card)}
      onMouseLeave={() => onHover(null)}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(card.id);
        }}
        className="delete-btn absolute top-2 right-2 z-30 bg-red-700 text-white text-xs px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-150"
        aria-label={`Delete ${card.name}`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>

      {backImage && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onFlip(card.id);
          }}
          className="flip-btn absolute top-2 left-2 z-20 bg-gray-800 bg-opacity-75 text-white text-xs px-2 py-1 rounded-full select-none opacity-0 group-hover:opacity-100 transition-opacity duration-150"
          aria-label={flipped ? 'Show front image' : 'Show back image'}
        >
          {flipped ? 'Front' : 'Back'}
        </button>
      )}

      <div className={`card-image-container ${flipped ? 'flipped' : ''}`}>
        <img
          src={displayedImage}
          alt={card.name}
          className="card-image w-full h-[300px] object-contain select-none rounded-lg"
          style={{
            outline: 'none',
            border: 'none',
            backfaceVisibility: 'hidden',
            transform: 'translateZ(0)',
            userSelect: 'none',
          }}
          onError={(e) => (e.target.src = '/placeholder.jpg')}
          loading="lazy"
        />
      </div>
    </div>
  );
},
(prevProps, nextProps) =>
  prevProps.card.id === nextProps.card.id &&
  prevProps.flipped === nextProps.flipped
);

export default function Inventory() {
  const [cardName, setCardName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);
  const [flippedCards, setFlippedCards] = useState({});
  const [hoveredCard, setHoveredCard] = useState(null);
  const hoveredCardRef = useRef(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const navigate = useNavigate();

  // Get user on mount
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      console.log('User role:', user?.role);
    });
  }, []);

  // Fetch inventory cards when user, page, or refreshTrigger changes
  const fetchInventory = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('inventory')
      .select(
        'id, name, quantity, price, image_url, back_image_url, set_name, scryfall_uri, scryfall_id'
      )
      .eq('user_id', user.id)
      .range((currentPage - 1) * pageSize, currentPage * pageSize - 1)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading inventory:', error);
      setInventory([]);
    } else {
      setInventory(data || []);
      if (!selectedCard && data?.length) setSelectedCard(data[0]);
    }

    setLoading(false);
  }, [user, selectedCard, currentPage, pageSize]);

  useEffect(() => {
    if (user) {
      fetchInventory();
    }
  }, [user, fetchInventory, currentPage, refreshTrigger]);

  const handleFlip = useCallback((cardId) => {
    setFlippedCards((prev) => ({
      ...prev,
      [cardId]: !prev[cardId],
    }));
  }, []);

  const handleAdd = useCallback(
    async (e) => {
      e.preventDefault();

      if (!cardName.trim()) return alert('Card name is required');
      if (!user) return alert('User not loaded');

      const qty = parseInt(quantity, 10);
      if (isNaN(qty) || qty < 1) return alert('Quantity must be at least 1');

      try {
        const response = await fetch(
          `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(
            cardName.trim()
          )}`
        );
        const result = await response.json();

        if (!result || result.object === 'error') {
          return alert('Card not found');
        }

        const image_url =
          result.image_uris?.normal ||
          result.card_faces?.[0]?.image_uris?.normal ||
          '';
        const back_image_url = result.card_faces?.[1]?.image_uris?.normal || '';
        const set_name = result.set_name || '';
        const scryfall_uri = result.scryfall_uri || '';
        const rawPrice = parseFloat(result.prices?.usd ?? '0');
        const price = !isNaN(rawPrice) && rawPrice > 0 ? rawPrice : 0;

        const { error } = await supabase.from('inventory').insert([
          {
            name: result.name,
            quantity: qty,
            user_id: user.id,
            price,
            image_url,
            back_image_url,
            set_name,
            scryfall_uri,
            scryfall_id: result.id,
          },
        ]);

        if (error) {
          console.error(error);
          alert('Failed to add card');
        } else {
          setCardName('');
          setQuantity(1);
          setRefreshTrigger((prev) => prev + 1); // trigger refresh
          alert('Card added successfully!');
        }
      } catch (error) {
        console.error(error);
        alert('Failed to add card due to network or API error');
      }
    },
    [cardName, quantity, user]
  );

  const handleDelete = useCallback(
    async (id) => {
      const { error } = await supabase.from('inventory').delete().eq('id', id);
      if (error) {
        console.error('Error deleting card:', error);
      } else {
        if (selectedCard?.id === id) setSelectedCard(null);
        setRefreshTrigger((prev) => prev + 1); // trigger refresh
      }
    },
    [selectedCard]
  );

  const handleCardClick = useCallback(
    (card) => {
      if (card.scryfall_id) {
        navigate(`/card/${card.scryfall_id}`);
      } else {
        navigate(`/card/${encodeURIComponent(card.name)}`);
      }
    },
    [navigate]
  );

  const handleCardHover = useCallback((card) => {
    if (card) {
      setHoveredCard(card);
      hoveredCardRef.current = card;
    } else {
      setHoveredCard(hoveredCardRef.current);
    }
  }, []);

  const handleNextPage = () => {
    setCurrentPage((prev) => prev + 1);
  };

  const handlePrevPage = () => {
    setCurrentPage((prev) => (prev > 1 ? prev - 1 : 1));
  };

  const inventoryGrid = useMemo(
    () =>
      inventory.map((card) => (
        <CardItem
          key={card.id}
          card={card}
          onClick={handleCardClick}
          onDelete={handleDelete}
          flipped={flippedCards[card.id]}
          onFlip={handleFlip}
          onHover={handleCardHover}
        />
      )),
    [
      inventory,
      flippedCards,
      handleCardClick,
      handleDelete,
      handleFlip,
      handleCardHover,
    ]
  );

  return (
    <div className="flex h-screen bg-[#0a1528] text-white relative">
      <div className="w-[240px] bg-[#0e1d35] p-3 pt-4 border-r border-blue-900 flex flex-col items-center">
        <h1 className="text-xl font-bold text-center text-cyan-300 mb-4">CardVerse</h1>

        {hoveredCard ? (
          <>
            <img
              src={hoveredCard.image_url || '/placeholder.jpg'}
              alt={hoveredCard.name}
              className="w-full h-[260px] object-contain rounded mb-2"
              onError={(e) => (e.target.src = '/placeholder.jpg')}
              loading="eager"
            />
            <div className="text-xs space-y-1">
              <p className="font-bold">{hoveredCard.name}</p>
              <p className="text-green-400">
                Price:{' '}
                {hoveredCard.price > 0
                  ? `$${hoveredCard.price.toFixed(2)}`
                  : 'N/A'}
              </p>
              <p className="text-blue-300">Set: {hoveredCard.set_name}</p>
              <a
                href={hoveredCard.scryfall_uri}
                target="_blank"
                rel="noreferrer"
                className="text-blue-400 underline"
              >
                View on Scryfall
              </a>
            </div>
          </>
        ) : selectedCard ? (
          <>
            <img
              src={selectedCard.image_url || '/placeholder.jpg'}
              alt={selectedCard.name}
              className="w-full h-[260px] object-contain rounded mb-2"
              onError={(e) => (e.target.src = '/placeholder.jpg')}
              loading="eager"
            />
            <div className="text-xs space-y-1">
              <p className="font-bold">{selectedCard.name}</p>
              <p className="text-green-400">
                Price:{' '}
                {selectedCard.price > 0
                  ? `$${selectedCard.price.toFixed(2)}`
                  : 'N/A'}
              </p>
              <p className="text-blue-300">Set: {selectedCard.set_name}</p>
              <a
                href={selectedCard.scryfall_uri}
                target="_blank"
                rel="noreferrer"
                className="text-blue-400 underline"
              >
                View on Scryfall
              </a>
            </div>
          </>
        ) : (
          <p className="text-sm">Hover a card to preview</p>
        )}

        {/* Use the new CardCountDisplay component here */}
        {user && <CardCountDisplay user={user} refreshTrigger={refreshTrigger} />}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <form
          onSubmit={handleAdd}
          className="bg-[#1b2e4b] rounded-xl p-4 shadow-lg max-w-5xl mx-auto mb-6 text-sm"
        >
          <div className="flex flex-wrap gap-4 items-end justify-center">
            <div className="flex-1 min-w-[200px]">
              <label className="block mb-1 font-semibold">Card Name</label>
              <input
                type="text"
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                className="w-full bg-black text-white border border-gray-600 rounded px-3 py-2"
                placeholder="Black Lotus"
                autoComplete="off"
              />
            </div>
            <div className="w-20">
              <label className="block mb-1 font-semibold">Qty</label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full bg-black text-white border border-gray-600 rounded px-3 py-2"
              />
            </div>
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded shadow"
            >
              Add
            </button>
          </div>
        </form>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-2">
          {loading ? (
            <p className="col-span-full text-center text-blue-300">Loading...</p>
          ) : inventory.length === 0 ? (
            <p className="col-span-full text-center text-blue-400">
              No cards in inventory.
            </p>
          ) : (
            inventoryGrid
          )}
        </div>

        <div className="pagination-controls flex justify-center gap-4 mt-4">
          <button
            onClick={handlePrevPage}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-indigo-600 text-white rounded disabled:bg-gray-500"
          >
            Previous
          </button>
          <button
            onClick={handleNextPage}
            disabled={inventory.length < pageSize}
            className="px-4 py-2 bg-indigo-600 text-white rounded"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
