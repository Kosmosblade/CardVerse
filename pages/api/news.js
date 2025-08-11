import fetch from 'node-fetch';
import { XMLParser } from 'fast-xml-parser';

export default async function handler(req, res) {
  try {
    const rssUrl = 'https://edhrec.com/articles/feed';

    const response = await fetch(rssUrl);
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch RSS feed' });
    }

    const xmlText = await response.text();

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      parseTagValue: true,
      parseAttributeValue: false,
    });
    const jsonObj = parser.parse(xmlText);

    const items = jsonObj?.rss?.channel?.item;
    if (!items || items.length === 0) {
      return res.status(404).json({ error: 'No news items found' });
    }

    const newsItems = Array.isArray(items) ? items : [items];

    const news = newsItems.map(item => ({
      title: item.title || 'No title',
      date: new Date(item.pubDate).toLocaleDateString(),
      excerpt: (item.description || '').replace(/(<([^>]+)>)/gi, '').slice(0, 150) + '...',
      url: item.link || '#',
    }));

    res.status(200).json({ news });
  } catch (error) {
    console.error('API news error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
