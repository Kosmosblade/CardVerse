import React, { useState, useEffect, useRef, memo } from 'react';

const imageCache = {};

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

  const [imageLoaded, setImageLoaded] = useState(false);
  const imageRef = useRef(null);

  useEffect(() => {
    if (!imageCache[displayedImage]) {
      const img = new Image();
      img.src = displayedImage;
      img.onload = () => {
        imageCache[displayedImage] = true;
        setImageLoaded(true);
      };
      img.onerror = () => {
        imageCache[displayedImage] = false;
        setImageLoaded(true);
      };
    } else {
      setImageLoaded(true);
    }
  }, [displayedImage]);

  return (
    <div
      className="relative w-[172px] h-[240px] rounded-xl overflow-hidden bg-[#142340] shadow-md cursor-pointer"
      onMouseEnter={() => onHover?.(card)}
      onMouseLeave={() => onHover?.(null)}
      onClick={() => onClick?.(card)}
    >
      {/* Spinner while image loads */}
      {!imageLoaded && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-900 bg-opacity-60">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 animate-spin text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v4m0 8v4m8-8h-4M8 12H4" />
          </svg>
        </div>
      )}

      {/* ❌ Delete Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete?.(card.id);
        }}
        className="absolute z-20 top-1 right-1 bg-red-700 hover:bg-red-800 text-white text-xs px-2 py-1 rounded-full shadow"
        aria-label={`Delete ${card.name}`}
      >
        ❌
      </button>

      {/* 🔁 Flip Button (only if back image) */}
      {backImage && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onFlip?.(card.id);
          }}
          className="absolute z-20 top-1 left-1 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded-full shadow"
          aria-label={flipped ? 'Show front' : 'Show back'}
        >
          🔁
        </button>
      )}

      {/* Image */}
      <img
        ref={imageRef}
        src={displayedImage}
        alt={card.name}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          imageLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        onError={(e) => {
          e.target.src = '/placeholder.jpg';
        }}
        loading="lazy"
        draggable={false}
      />
    </div>
  );
},
(prevProps, nextProps) =>
  prevProps.card.id === nextProps.card.id &&
  prevProps.flipped === nextProps.flipped
);

export default CardItem;
