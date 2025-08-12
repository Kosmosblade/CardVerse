// components/AddToCatalog.js
import { supabase } from '../lib/supabase';

/**
 * AddToCatalog
 * cardObj: card object with fields matching your catalog
 * count: number of cards to add (optional, default 1)
 *
 * Returns { success: boolean, message: string }
 */
export default async function AddToCatalog(cardObj, count = 1) {
  try {
    if (!cardObj) {
      return { success: false, message: 'Missing cardObj' };
    }

    // Map fields from cardObj or scryfall data to your DB columns
    const scryfallId = cardObj.id ?? null;
    const name = cardObj.name ?? null;
    const set_code = cardObj.set ?? null;  // your field is 'set_code'
    const number = cardObj.collector_number ?? cardObj.number ?? null;
    const scryfall_uri = cardObj.scryfall_uri ?? null;
    const colors = cardObj.color_identity?.length
      ? cardObj.color_identity
      : cardObj.colors?.length
      ? cardObj.colors
      : null;
    const type_line = cardObj.type_line ?? null;
    const rarity = cardObj.rarity ?? null;
    const cmc = typeof cardObj.cmc !== 'undefined' ? cardObj.cmc : null;
    const oracle_text = cardObj.oracle_text ?? null;
    const image_url =
      cardObj.image_uris?.normal ??
      cardObj.image_uris?.large ??
      cardObj.image_uris?.png ??
      null;
    const back_image_url =
      cardObj.card_faces && cardObj.card_faces[1]?.image_uris?.normal
        ? cardObj.card_faces[1].image_uris.normal
        : null;
    const sm_image_url = cardObj.image_uris?.small ?? null;
    const layout = cardObj.layout ?? null;
    const set_card_id = cardObj.set_card_id ?? null;

    const table = 'card_catalog'; // Your actual table name with underscore

    // 1) Try to find existing card by scryfall_id first
    let { data: existing = [], error: selectErr } = await supabase
      .from(table)
      .select('*')
      .eq('scryfall_id', scryfallId)
      .limit(1);

    if (selectErr) {
      console.error('Error checking catalog:', selectErr);
      return { success: false, message: `Select error: ${selectErr.message || selectErr}` };
    }

    let existingRow = existing.length > 0 ? existing[0] : null;

    // 2) If not found by scryfall_id, try by name + set_code + number
    if (!existingRow && name && set_code && number) {
      const { data: existing2 = [], error: sel2Err } = await supabase
        .from(table)
        .select('*')
        .eq('name', name)
        .eq('set_code', set_code)
        .eq('number', number)
        .limit(1);

      if (sel2Err) {
        console.error('Error checking catalog by name/set_code/number:', sel2Err);
        return { success: false, message: `Select error: ${sel2Err.message || sel2Err}` };
      }

      existingRow = existing2.length > 0 ? existing2[0] : null;
    }

    // Build payload for insert/update
    const payload = {
      scryfall_id: scryfallId,
      name,
      set_code,
      number,
      scryfall_uri,
      colors,
      type_line,
      rarity,
      cmc,
      oracle_text,
      image_url,
      back_image_url,
      sm_image_url,
      layout,
      set_card_id,
      // no user_id because your table doesn't have it
    };

    if (existingRow) {
      // Update existing row
      const { error: updErr } = await supabase
        .from(table)
        .update(payload)
        .eq('id', existingRow.id);

      if (updErr) {
        console.error(`Error updating catalog for ${name}:`, updErr);
        return { success: false, message: `Update error: ${updErr.message || updErr}` };
      }
      return { success: true, message: `Updated ${name}` };
    } else {
      // Insert new card
      const { error: insErr } = await supabase.from(table).insert([payload]);
      if (insErr) {
        console.error(`Error inserting ${name} into catalog:`, insErr);
        return { success: false, message: `Insert error: ${insErr.message || insErr}` };
      }
      return { success: true, message: `Inserted ${name}` };
    }
  } catch (err) {
    console.error('Unexpected error in AddToCatalog:', err);
    return { success: false, message: `Unexpected error: ${err.message || err}` };
  }
}
