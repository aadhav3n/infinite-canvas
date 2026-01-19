import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ARTWORKS_DIR = "./public/artworks";
const SUBDIRECTORY = "mm 2023 eternal memories";
const SUBDIRECTORY_PATH = path.join(ARTWORKS_DIR, SUBDIRECTORY);
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

async function main() {
  // Read existing manifest
  let existingManifest: ManifestItem[] = [];
  if (fs.existsSync(MANIFEST_PATH)) {
    try {
      const content = fs.readFileSync(MANIFEST_PATH, "utf-8");
      existingManifest = JSON.parse(content);
    } catch (error) {
      console.error("Failed to read existing manifest:", error);
      return;
    }
  }

  // Get all image files from subdirectory
  const files = fs.readdirSync(SUBDIRECTORY_PATH);
  const imageFiles = files.filter(
    (f) => f.toLowerCase().endsWith(".jpg") || f.toLowerCase().endsWith(".jpeg")
  );

  console.log(`Found ${imageFiles.length} image files in "${SUBDIRECTORY}"\n`);

  // Create a set of existing URLs to avoid duplicates
  const existingUrls = new Set(existingManifest.map((item) => item.url));

  const newEntries: ManifestItem[] = [];

  for (const filename of imageFiles.sort()) {
    const filepath = path.join(SUBDIRECTORY_PATH, filename);
    
    // URL encode the subdirectory path and filename
    const encodedSubdir = encodeURIComponent(SUBDIRECTORY);
    const encodedFilename = encodeURIComponent(filename);
    const url = `/artworks/${encodedSubdir}/${encodedFilename}`;

    // Skip if already in manifest
    if (existingUrls.has(url)) {
      console.log(`  Skipped (already in manifest): ${filename}`);
      continue;
    }
    
    try {
      const metadata = await sharp(filepath).metadata();
      
      if (!metadata.width || !metadata.height) {
        console.error(`  Failed to get dimensions for: ${filename}`);
        continue;
      }

      // Extract a readable title from filename (remove extension and clean up)
      const baseName = filename.replace(/\.(jpg|jpeg)$/i, "").replace(/-Enhanced-NR$/, "");
      
      const item: ManifestItem = {
        url: url,
        type: "image",
        title: baseName,
        artist: "Unknown Artist",
        year: "",
        link: "",
        width: metadata.width,
        height: metadata.height,
      };

      newEntries.push(item);
      console.log(`  Added: ${filename} (${metadata.width}x${metadata.height})`);
    } catch (error) {
      console.error(`  Error processing ${filename}:`, error);
    }
  }

  // Combine existing manifest with new entries
  const updatedManifest = [...existingManifest, ...newEntries];

  // Write updated manifest
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(updatedManifest, null, 2));
  console.log(`\nDone! Added ${newEntries.length} new entries. Total entries: ${updatedManifest.length} → ${MANIFEST_PATH}`);
}

main().catch(console.error);
