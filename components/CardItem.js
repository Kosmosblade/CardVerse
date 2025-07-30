import React, { useState, useEffect, useRef, memo } from 'react';

// Global cache for loaded images to avoid refetching
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
        setImageLoaded(true); // stop spinner even if error
      };
    } else {
      setImageLoaded(true);
    }
  }, [displayedImage]);

  return (
    <div
      className="card-item relative group rounded-lg shadow-lg overflow-hidden bg-[#142340] cursor-pointer"
      onMouseEnter={() => onHover && onHover(card)}
      onMouseLeave={() => onHover && onHover(null)}
      style={{ width: '180px', height: '300px' }}
    >
      {/* Image Container - position relative so buttons are positioned inside */}
      <div className="relative w-full h-full">
        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50 rounded-lg z-10">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 animate-spin text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v12m6-6H6" />
            </svg>
          </div>
        )}

        {/* Buttons inside image container */}
        {/* Delete Button - top right corner */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(card.id);
          }}
          className="absolute top-1 right-1 z-20 bg-red-700 text-white text-xs px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-auto"
          aria-label={`Delete ${card.name}`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Flip Button - top left corner */}
        {backImage && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onFlip(card.id);
            }}
            className="absolute top-1 left-1 z-20 bg-gray-800 bg-opacity-75 text-white text-xs px-2 py-1 rounded-full select-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-auto"
            aria-label={flipped ? 'Show front image' : 'Show back image'}
          >
            {flipped ? 'Front' : 'Back'}
          </button>
        )}

        <img
          ref={imageRef}
          src={displayedImage}
          alt={card.name}
          className={`w-full h-full object-contain select-none rounded-lg transition-opacity duration-300 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onError={(e) => (e.target.src = '/placeholder.jpg')}
          loading="lazy"
          draggable={false}
          onLoad={() => setImageLoaded(true)}
          onClick={() => onClick(card)}
          style={{
            outline: 'none',
            border: 'none',
            backfaceVisibility: 'hidden',
            userSelect: 'none',
          }}
        />
      </div>
    </div>
  );
},
(prevProps, nextProps) =>
  prevProps.card.id === nextProps.card.id && prevProps.flipped === nextProps.flipped
);

export default CardItem;
