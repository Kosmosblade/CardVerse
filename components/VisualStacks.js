import React, { useState } from "react";

export default function VisualStacks({ cards }) {
  const [activeCard, setActiveCard] = useState(null);

  return (
    <div className="flex flex-wrap gap-4 p-4">
      {Object.entries(cards).map(([section, cardsInSection]) => (
        <div key={section} className="mb-8 w-full">
          <h2 className="text-xl font-bold mb-2">{section}</h2>
          <div className="relative h-[300px]">
            {cardsInSection.map((card, index) => (
              <img
                key={card.id}
                src={card.image}
                alt={card.name}
                onClick={() => setActiveCard(card.id)}
                className={`absolute w-28 cursor-pointer transition-transform duration-200 border border-gray-600 rounded
                  ${activeCard === card.id ? "z-50 scale-110" : `z-${index + 1} hover:z-40 hover:scale-105`}
                `}
                style={{
                  left: `${index * 20}px`, // Overlap cards by 20px
                }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
