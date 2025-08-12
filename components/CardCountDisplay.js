// src/components/CardCountDisplay.js
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function CardCountDisplay({ user, refreshTrigger }) {
  const [cardStats, setCardStats] = useState({ current: 0, limit: 'Unlimited' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setCardStats({ current: 0, limit: 'Unlimited' });
      setLoading(false);
      return;
    }

    async function fetchCardStats() {
      setLoading(true);
      try {
        // Get current card count for the user
        const { count, error: countError } = await supabase
          .from('inventory')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        if (countError) {
          console.error('Error fetching inventory count:', countError);
          setCardStats({
            current: 0,
            limit: 'Unlimited',
          });
          setLoading(false);
          return;
        }

        // Ignore any profile-based limit — always set to Unlimited
        setCardStats({
          current: count || 0,
          limit: 'Unlimited',
        });
      } catch (err) {
        console.error('Unexpected error fetching card stats:', err);
        setCardStats({
          current: 0,
          limit: 'Unlimited',
        });
      } finally {
        setLoading(false);
      }
    }

    fetchCardStats();
  }, [user, refreshTrigger]);

  if (loading) {
    return <div className="text-xs mt-4 text-center">Loading card info...</div>;
  }

  return (
    <div className="text-xs mt-4 text-center">
      Cards: {cardStats.current} / {cardStats.limit}
    </div>
  );
}
