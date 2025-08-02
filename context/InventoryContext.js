// /context/InventoryContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const InventoryContext = createContext();

export function InventoryProvider({ user, children }) {
  const [currentCardCount, setCurrentCardCount] = useState(0);

  // Fetch current card count from profiles table for the user
  async function fetchCardCount() {
    if (!user?.id) {
      setCurrentCardCount(0);
      return;
    }
    try {
      const cleanUserId = user.id.replace(/[<>]/g, '');
      const { data, error } = await supabase
        .from('profiles')
        .select('current_card_count')
        .eq('id', cleanUserId)
        .single();

      if (error) {
        console.error('Error fetching current card count:', error.message);
        setCurrentCardCount(0);
      } else {
        setCurrentCardCount(data?.current_card_count ?? 0);
      }
    } catch (err) {
      console.error('Exception fetching card count:', err);
      setCurrentCardCount(0);
    }
  }

  // Call fetchCardCount whenever user changes
  useEffect(() => {
    fetchCardCount();
  }, [user]);

  // Expose a manual refresh method for Inventory page to call after add/delete
  const refreshInventory = () => {
    fetchCardCount();
  };

  return (
    <InventoryContext.Provider value={{ currentCardCount, refreshInventory }}>
      {children}
    </InventoryContext.Provider>
  );
}

// Hook to consume inventory context easily
export function useInventory() {
  return useContext(InventoryContext);
}
