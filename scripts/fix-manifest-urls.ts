import fs from "node:fs";

const MANIFEST_PATH = "./public/artworks/manifest.json";

type ManifestItem = {
  url: string;
  type: string;
  title: string;
  artist: string;
  year: string;
  link: string;
  width: number;
  height: number;
};

function main() {
  // Read existing manifest
  let manifest: ManifestItem[] = [];
  if (fs.existsSync(MANIFEST_PATH)) {
    try {
      const content = fs.readFileSync(MANIFEST_PATH, "utf-8");
      manifest = JSON.parse(content);
    } catch (error) {
      console.error("Failed to read existing manifest:", error);
      return;
    }
  }

  let fixedCount = 0;

  // Fix URLs that contain "mm 2023 eternal memories" with spaces
  const updatedManifest = manifest.map((item) => {
    if (item.url.includes("mm 2023 eternal memories")) {
      // Split the URL to get the parts
      const parts = item.url.split("/");
      const artworksIndex = parts.indexOf("artworks");
      
      if (artworksIndex >= 0 && artworksIndex < parts.length - 1) {
        // Reconstruct with proper encoding
        const subdir = parts[artworksIndex + 1];
        const filename = parts[artworksIndex + 2];
        
        if (subdir === "mm 2023 eternal memories") {
          const encodedSubdir = encodeURIComponent(subdir);
          const encodedFilename = encodeURIComponent(filename);
          const newUrl = `/artworks/${encodedSubdir}/${encodedFilename}`;
          
          fixedCount++;
          return { ...item, url: newUrl };
        }
      }
    }
    return item;
  });

  // Write updated manifest
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(updatedManifest, null, 2));
  console.log(`Fixed ${fixedCount} URLs with proper URL encoding.`);
}

main();
