// src/components/CardCountDisplay.js
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function CardCountDisplay({ user, refreshTrigger }) {
  const [cardStats, setCardStats] = useState({ current: 0, limit: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setCardStats({ current: 0, limit: 0 });
      setLoading(false);
      return;
    }

    async function fetchCardStats() {
      setLoading(true);
      try {
        // Get actual current card count from inventory for the user
        const { count, error: countError } = await supabase
          .from('inventory')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        if (countError) {
          console.error('Error fetching inventory count:', countError);
          setCardStats({
            current: 0,
            limit: user.role === 'free' ? 200 : 600,
          });
          setLoading(false);
          return;
        }

        // Get max limit from profiles
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('max_card_limit')
          .eq('id', user.id)
          .single();

        if (profileError || !profileData) {
          setCardStats({
            current: count || 0,
            limit: user.role === 'free' ? 200 : 600,
          });
        } else {
          setCardStats({
            current: count || 0,
            limit: profileData.max_card_limit,
          });
        }
      } catch (err) {
        console.error('Unexpected error fetching card stats:', err);
        setCardStats({
          current: 0,
          limit: user.role === 'free' ? 200 : 600,
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
