import * as React from "react";
import { fetchArticArtworks } from "~/src/api";
import { InfiniteCanvas } from "~/src/infinite-canvas";
import type { MediaItem } from "~/src/infinite-canvas/types";
import { PageLoader } from "~/src/loader";
import styles from "./style.module.css";

export function App() {
  const [media, setMedia] = React.useState<MediaItem[]>([]);
  const [dataLoading, setDataLoading] = React.useState(true);
  const [canvasReady, setCanvasReady] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [textureProgress, setTextureProgress] = React.useState(0);

  const progress = canvasReady ? 100 : dataLoading ? Math.min((media.length / 200) * 30, 30) : 30 + textureProgress * 0.7;

  React.useEffect(() => {
    let mounted = true;

    const fetchAll = async () => {
      try {
        let page = 1;
        let allArtworks: MediaItem[] = [];

        while (mounted && allArtworks.length < 250) {
          const batch = await fetchArticArtworks(page, 50);
          if (!mounted || !batch.length) break;

          allArtworks = [...allArtworks, ...batch].slice(0, 250);
          setMedia(allArtworks);
          page++;
        }

        if (!mounted) return;

        if (allArtworks.length === 0) {
          setError("No artworks found from API.");
        }
        setDataLoading(false);
      } catch (err) {
        if (!mounted) return;
        setError(`Failed to load: ${err instanceof Error ? err.message : String(err)}`);
        setDataLoading(false);
      }
    };

    fetchAll();
    return () => {
      mounted = false;
    };
  }, []);

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorMessage}>{error}</div>
        <button type="button" onClick={() => window.location.reload()} className={styles.retryButton}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      <PageLoader progress={progress} />
      {media.length > 0 && (
        <InfiniteCanvas
          media={media}
          onReady={() => setCanvasReady(true)}
          onTextureProgress={setTextureProgress}
          showControls
          showFps
        />
      )}
    </>
  );
}
