// src/context/CardCountContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const CardCountContext = createContext({
  cardCount: 0,
  cardLimit: 0,
  setCardCount: () => {},
  setCardLimit: () => {},
  refreshCardCount: async () => {},
});

export function CardCountProvider({ user, children }) {
  const [cardCount, setCardCount] = useState(0);
  const [cardLimit, setCardLimit] = useState(0);

  const refreshCardCount = async () => {
    if (!user) {
      setCardCount(0);
      setCardLimit(0);
      return;
    }

    try {
      const { count, error: countError } = await supabase
        .from('inventory')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (countError) {
        console.error('Error fetching inventory count:', countError);
        setCardCount(0);
      } else {
        setCardCount(count || 0);
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('max_card_limit')
        .eq('id', user.id)
        .single();

      if (profileError || !profileData) {
        const role = user.role || 'free';
        setCardLimit(role === 'free' ? 200 : 600);
      } else {
        setCardLimit(profileData.max_card_limit);
      }
    } catch (err) {
      console.error('Unexpected error fetching card stats:', err);
      const role = user.role || 'free';
      setCardCount(0);
      setCardLimit(role === 'free' ? 200 : 600);
    }
  };

  useEffect(() => {
    refreshCardCount();
  }, [user]);

  return (
    <CardCountContext.Provider
      value={{ cardCount, cardLimit, setCardCount, setCardLimit, refreshCardCount }}
    >
      {children}
    </CardCountContext.Provider>
  );
}

export function useCardCount() {
  return useContext(CardCountContext);
}
