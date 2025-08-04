export default async function handler(req, res) {
  try {
    const response = await fetch(
      'https://api.scryfall.com/cards/search?q=is%3Acommander+is%3Alegendary+type%3Acreature+legal%3Acommander'
    );
    const data = await response.json();

    if (!data.data || data.data.length === 0) {
      return res.status(500).json({ error: 'No commanders found.' });
    }

    // Randomly select one
    const random = data.data[Math.floor(Math.random() * data.data.length)];
    return res.status(200).json({ commander: random.name });
  } catch (err) {
    console.error('Error fetching commander:', err);
    res.status(500).json({ error: 'Failed to fetch random commander.' });
  }
}
