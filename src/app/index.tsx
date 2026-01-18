import * as React from "react";
import { Frame } from "~/src/frame";
import { InfiniteCanvas } from "~/src/infinite-canvas";
import type { MediaItem } from "~/src/infinite-canvas/types";
import { PageLoader } from "~/src/loader";

export function App() {
  const [media, setMedia] = React.useState<MediaItem[]>([]);
  const [textureProgress, setTextureProgress] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
 
  React.useEffect(() => {
    let canceled = false;

    const loadManifest = async () => {
      try {
        setIsLoading(true);
        setError(null);
        // Use import.meta.env.BASE_URL for proper path resolution with Vite
        // Files in public folder are always served from root, so we use absolute path
        const baseUrl = import.meta.env.BASE_URL || '/';
        const manifestPath = baseUrl === '/' 
          ? '/artworks/manifest.json' 
          : `${baseUrl}artworks/manifest.json`.replace(/\/+/g, '/');
        const response = await fetch(manifestPath);
        
        if (!response.ok) {
          throw new Error(`Failed to load manifest: ${response.statusText}`);
        }

        const manifest: MediaItem[] = await response.json();
        
        if (!canceled) {
          setMedia(manifest);
          setIsLoading(false);
        }
      } catch (err) {
        if (!canceled) {
          setError(err instanceof Error ? err.message : "Failed to load manifest");
          setIsLoading(false);
        }
      }
    };

    
    loadManifest();

    return () => {
      canceled = true;
    };
  }, []);

  if (isLoading) {
    return <PageLoader progress={0} />;
  }

  if (error) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", color: "red" }}>
        Error: {error}
      </div>
    );
  }

  if (!media.length) {
    return <PageLoader progress={0} />;
  }

  return (
    <>
      <Frame />
      <PageLoader progress={textureProgress} />
      <InfiniteCanvas media={media} onTextureProgress={setTextureProgress} />
    </>
  );
}
