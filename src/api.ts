import type { MediaItem } from "./infinite-canvas/types";

const API_BASE = "https://api.artic.edu/api/v1";
const IIIF_BASE = "https://www.artic.edu/iiif/2";

type ArticSearchResponse = {
  data: ArticArtwork[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    total_pages: number;
    current_page: number;
  };
};

type ArticArtwork = {
  id: number;
  title: string;
  artist_display: string;
  date_display: string;
  image_id: string;
  thumbnail?: {
    width: number;
    height: number;
  };
};

const MAX_ITEMS = 250;

// 512 is fast enough for grids and still looks decent on most screens.
const GRID_IMAGE_WIDTH = 512;

export async function fetchArticArtworks(page = 1, limit = 25): Promise<MediaItem[]> {
  try {
    // Keep payload small
    const fields = "id,title,artist_display,date_display,image_id,thumbnail";

    // More modern than “just after Renaissance”:
    // 1800+ tends to yield Romanticism/Realism/Impressionism and later.
    const query = {
      query: {
        bool: {
          must: [
            { term: { is_public_domain: true } },
            { term: { "classification_titles.keyword": "painting" } },

            // Period window
            { range: { date_end: { gte: 1800 } } },
            { range: { date_start: { lte: 1950 } } },

            // Only return records that have images
            { exists: { field: "image_id" } },
          ],
          should: [
            { term: { "department_title.keyword": "Painting and Sculpture of Europe" } },
            { term: { "department_title.keyword": "Modern Art" } },
          ],
          minimum_should_match: 1,
        },
      },
    };

    const params = encodeURIComponent(JSON.stringify(query));
    const searchUrl = `${API_BASE}/artworks/search?params=${params}&page=${page}&limit=${limit}&fields=${fields}`;

    const res = await fetch(searchUrl);
    if (!res.ok) {
      throw new Error(`Failed to fetch from AIC API: ${res.status} ${res.statusText}`);
    }

    const data: ArticSearchResponse = await res.json();
    if (!data.data?.length) return [];

    // Shuffle results of this page to give variety
    const shuffled = data.data.sort(() => 0.5 - Math.random());

    const artworks: MediaItem[] = [];

    for (const item of shuffled) {
      if (!item.image_id) continue;

      const imageUrl = `${IIIF_BASE}/${item.image_id}/full/${GRID_IMAGE_WIDTH},/0/default.jpg`;

      artworks.push({
        url: imageUrl,
        type: "image",
        title: item.title,
        artist: item.artist_display || "Unknown Artist",
        year: item.date_display,
        link: `https://www.artic.edu/artworks/${item.id}`,
        width: item.thumbnail?.width,
        height: item.thumbnail?.height,
      });

      // Per-call cap to prevent runaway lists.
      // Enforce the global 250 cap in the caller if you aggregate across pages.
      if (artworks.length >= MAX_ITEMS) break;
    }

    return artworks;
  } catch (error) {
    console.error("Error fetching from AIC API:", error);
    return [];
  }
}
