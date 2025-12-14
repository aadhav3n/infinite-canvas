import { useProgress } from "@react-three/drei";
import * as React from "react";
import { fetchArticArtworks } from "~/src/api";
import { InfiniteCanvas } from "~/src/infinite-canvas";
import type { MediaItem } from "~/src/infinite-canvas/types";
import { PageLoader } from "~/src/page-loader";

export function App() {
  const [media, setMedia] = React.useState<MediaItem[]>([]);
  const [dataLoading, setDataLoading] = React.useState(true);
  const [canvasReady, setCanvasReady] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fetchProgress, setFetchProgress] = React.useState(0);
  const { active, progress: textureProgress } = useProgress();

  const totalProgress = React.useMemo(() => {
    if (dataLoading) return fetchProgress * 0.4;
    if (canvasReady) return 100;
    if (!active && textureProgress === 0) return 40;
    return 40 + textureProgress * 0.6;
  }, [dataLoading, fetchProgress, textureProgress, active, canvasReady]);

  React.useEffect(() => {
    let mounted = true;
    const fetchId = Math.random();

    const fetchAll = async () => {
      try {
        const batchSize = 50;
        const maxItems = 250; // consumer controls this

        // Fetch pages until we reach maxItems (or the API stops returning results)
        let page = 1;
        let allArtworks: MediaItem[] = [];

        while (mounted && allArtworks.length < maxItems) {
          console.log(`[${fetchId}] Fetching page ${page} (batchSize=${batchSize})...`);

          // fetcher does NOT decide max, consumer does
          const batch = await fetchArticArtworks(page, batchSize);

          if (!mounted) break;

          if (!batch.length) break;

          allArtworks.push(...batch);

          // Hard cap
          if (allArtworks.length > maxItems) {
            allArtworks = allArtworks.slice(0, maxItems);
          }

          // Progress is based on target maxItems (not on unknown API totals)
          setFetchProgress(Math.min(100, (allArtworks.length / maxItems) * 100));

          page += 1;
        }

        if (!mounted) return;

        if (allArtworks.length === 0) {
          setError("No artworks found from API.");
        } else {
          setMedia(allArtworks);
        }
        setDataLoading(false);
      } catch (err) {
        if (!mounted) return;
        console.error("Failed to fetch artworks:", err);
        setError(`Failed to load from API: ${err instanceof Error ? err.message : String(err)}`);
        setDataLoading(false);
      }
    };

    fetchAll();

    return () => {
      mounted = false;
    };
  }, []);

  const handleCanvasReady = React.useCallback(() => {
    setCanvasReady(true);
  }, []);

  if (error) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          fontFamily: "sans-serif",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        <div style={{ color: "red" }}>{error}</div>
        <button type="button" onClick={() => window.location.reload()} style={{ padding: "8px 16px", cursor: "pointer" }}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      <PageLoader progress={totalProgress} />
      {media.length > 0 && <InfiniteCanvas media={media} onReady={handleCanvasReady} />}
    </>
  );
}
