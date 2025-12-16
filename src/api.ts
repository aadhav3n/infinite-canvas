import type { MediaItem } from "./infinite-canvas/types";

const API_BASE = "https://api.artic.edu/api/v1";
const IIIF_BASE = "https://www.artic.edu/iiif/2";

type ArticSearchResponse = {
  data: ArticArtwork[];
};

type ArticArtwork = {
  id: number;
  title: string;
  artist_display: string;
  date_display: string;
  image_id: string;
  thumbnail?: { width: number; height: number };
};

const SEARCH_QUERY = {
  query: {
    bool: {
      must: [
        { term: { is_public_domain: true } },
        { term: { "classification_titles.keyword": "painting" } },
        { exists: { field: "image_id" } },
        { range: { date_end: { gte: 1600 } } },
        { range: { date_start: { lte: 1725 } } },
      ],
      should: [
        { match: { style_title: "Baroque" } },
        { term: { "department_title.keyword": "Painting and Sculpture of Europe" } },
      ],
      minimum_should_match: 1,
    },
  },
};

export async function fetchArticArtworks(page = 1, limit = 25): Promise<MediaItem[]> {
  const fields = "id,title,artist_display,date_display,image_id,thumbnail";
  const params = encodeURIComponent(JSON.stringify(SEARCH_QUERY));
  const url = `${API_BASE}/artworks/search?params=${params}&page=${page}&limit=${limit}&fields=${fields}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`AIC API error: ${res.status}`);

  const data: ArticSearchResponse = await res.json();
  if (!data.data?.length) return [];

  return data.data
    .filter((item) => item.image_id)
    .sort(() => Math.random() - 0.5)
    .map((item) => ({
      url: `${IIIF_BASE}/${item.image_id}/full/512,/0/default.jpg`,
      type: "image" as const,
      title: item.title,
      artist: item.artist_display || "Unknown Artist",
      year: item.date_display,
      link: `https://www.artic.edu/artworks/${item.id}`,
      width: item.thumbnail?.width,
      height: item.thumbnail?.height,
    }));
}
