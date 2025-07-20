import React, { useState, useEffect, memo } from 'react';

// Global cache object to store loaded images
const imageCache = {};

const CardItem = memo(function CardItem({ card, onClick, onDelete, onHover, flipped, onFlip }) {
  const [imageLoaded, setImageLoaded] = useState(false);  // Track if image has been cached/loaded
  const frontImage = card.image_url || '/placeholder.jpg';
  const backImage = card.back_image_url || null;
  const displayedImage = flipped && backImage ? backImage : frontImage;

  // Cache the images globally to prevent re-fetching on each render
  const loadImage = (url) => {
    if (imageCache[url]) {
      console.log(`Image already cached: ${url}`);
      setImageLoaded(true);  // If it's already cached, update state
      return;
    }

    const img = new Image();
    img.src = url;
    img.onload = () => {
      imageCache[url] = img;  // Store image in cache once loaded
      console.log(`Image cached: ${url}`);
      setImageLoaded(true);  // Update state when image is loaded
    };
    img.onerror = () => {
      console.error(`Error loading image: ${url}`);
      imageCache[url] = null;
      setImageLoaded(false);  // Handle error case
    };
  };

  useEffect(() => {
    loadImage(displayedImage);  // Cache the image when displayedImage changes
  }, [displayedImage]);

  // Only render the image if it's loaded or fallback to placeholder
  const imageToDisplay = imageCache[displayedImage]?.src || '/placeholder.jpg';

  return (
    <div
      className="card-item relative group cursor-pointer"
      onClick={() => onClick(card)}
      onMouseEnter={() => onHover(card)}  // Only pass card if it's valid
      onMouseLeave={() => onHover(null)}  // Ensure null is passed when mouse leaves
    >
      {/* Delete button at top-right corner */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(card.id);
        }}
        className="delete-btn absolute top-2 right-2 z-30 bg-red-700 text-white text-xs px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-150"
        aria-label={`Delete ${card.name}`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Flip button */}
      {backImage && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onFlip(card.id);  // Toggle flip state on click
          }}
          className="flip-btn absolute top-2 left-2 z-20 bg-gray-800 bg-opacity-75 text-white text-xs px-2 py-1 rounded-full select-none opacity-0 group-hover:opacity-100 transition-opacity duration-150"
          aria-label={flipped ? 'Show front image' : 'Show back image'}
        >
          {flipped ? 'Front' : 'Back'}
        </button>
      )}

      {/* Image container */}
      <div className={`card-image-container ${flipped ? 'flipped' : ''}`}>
        {/* Display loading state until the image is cached */}
        {!imageLoaded && (
          <div className="loading-spinner">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v12m6-6H6" />
            </svg>
          </div>
        )}
        <img
          src={imageToDisplay}
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
}, (prevProps, nextProps) => {
  // Prevent re-render unless card or flipped state changes
  return prevProps.card.id === nextProps.card.id && prevProps.flipped === nextProps.flipped;
});

export default CardItem;
