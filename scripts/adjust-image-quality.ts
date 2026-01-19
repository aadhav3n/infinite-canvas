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

// Quality settings
const NEW_IMAGES_QUALITY = 70; // Reduced by 30 from 100
const EXISTING_IMAGES_QUALITY = 100; // Increased by 20 (assuming they were at 80, now 100)

async function adjustImageQuality(
  filepath: string,
  quality: number
): Promise<{ width: number; height: number; originalSize: number; newSize: number } | null> {
  try {
    const stats = fs.statSync(filepath);
    const originalSize = stats.size;
    
    // Get current image metadata
    const metadata = await sharp(filepath).metadata();
    
    if (!metadata.width || !metadata.height) {
      console.error(`  Failed to get dimensions for: ${path.basename(filepath)}`);
      return null;
    }

    const { width, height } = metadata;
    
    // Create a temporary file for the re-encoded image
    const tempPath = `${filepath}.tmp`;
    
    await sharp(filepath)
      .jpeg({ 
        quality: quality,
        mozjpeg: true, // Better compression
      })
      .toFile(tempPath);

    const newStats = fs.statSync(tempPath);
    const newSize = newStats.size;
    
    // Replace original with re-encoded version
    fs.renameSync(tempPath, filepath);
    
    return {
      width,
      height,
      originalSize,
      newSize,
    };
  } catch (error) {
    console.error(`  Error processing ${path.basename(filepath)}:`, error);
    return null;
  }
}

async function main() {
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

  // Create a map of manifest entries by URL for quick lookup
  const manifestMap = new Map<string, ManifestItem>();
  for (const item of manifest) {
    manifestMap.set(item.url, item);
  }

  console.log("Processing images to adjust quality...\n");
  console.log(`New images (from subdirectory): Quality ${NEW_IMAGES_QUALITY}% (reduced by 30%)\n`);
  console.log(`Existing images (from root): Quality ${EXISTING_IMAGES_QUALITY}% (increased by 20%)\n`);

  let newImagesProcessed = 0;
  let existingImagesProcessed = 0;
  let newImagesTotalOriginalSize = 0;
  let newImagesTotalNewSize = 0;
  let existingImagesTotalOriginalSize = 0;
  let existingImagesTotalNewSize = 0;

  // Process new images from subdirectory
  if (fs.existsSync(SUBDIRECTORY_PATH)) {
    const subdirFiles = fs.readdirSync(SUBDIRECTORY_PATH);
    const imageFiles = subdirFiles.filter(
      (f) => f.toLowerCase().endsWith(".jpg") || f.toLowerCase().endsWith(".jpeg")
    );

    console.log(`\n=== Processing ${imageFiles.length} new images from subdirectory ===\n`);

    for (let i = 0; i < imageFiles.length; i++) {
      const filename = imageFiles[i];
      const filepath = path.join(SUBDIRECTORY_PATH, filename);
      
      console.log(`[${i + 1}/${imageFiles.length}] Processing: ${filename}`);
      
      const result = await adjustImageQuality(filepath, NEW_IMAGES_QUALITY);
      
      if (result) {
        newImagesProcessed++;
        newImagesTotalOriginalSize += result.originalSize;
        newImagesTotalNewSize += result.newSize;
        
        const reduction = ((1 - result.newSize / result.originalSize) * 100).toFixed(1);
        const sizeMB = (result.newSize / (1024 * 1024)).toFixed(2);
        console.log(`  ✓ ${result.width}x${result.height} - ${sizeMB}MB (${reduction}% size change)`);
      }
    }
  }

  // Process existing images from root directory
  const rootFiles = fs.readdirSync(ARTWORKS_DIR);
  const rootImageFiles = rootFiles.filter(
    (f) => (f.toLowerCase().endsWith(".jpg") || f.toLowerCase().endsWith(".jpeg")) && f !== "manifest.json"
  );

  console.log(`\n=== Processing ${rootImageFiles.length} existing images from root directory ===\n`);

  for (let i = 0; i < rootImageFiles.length; i++) {
    const filename = rootImageFiles[i];
    const filepath = path.join(ARTWORKS_DIR, filename);
    
    console.log(`[${i + 1}/${rootImageFiles.length}] Processing: ${filename}`);
    
    const result = await adjustImageQuality(filepath, EXISTING_IMAGES_QUALITY);
    
    if (result) {
      existingImagesProcessed++;
      existingImagesTotalOriginalSize += result.originalSize;
      existingImagesTotalNewSize += result.newSize;
      
      const change = ((result.newSize / result.originalSize - 1) * 100).toFixed(1);
      const sizeMB = (result.newSize / (1024 * 1024)).toFixed(2);
      const sign = result.newSize > result.originalSize ? "+" : "";
      console.log(`  ✓ ${result.width}x${result.height} - ${sizeMB}MB (${sign}${change}% size change)`);
    }
  }

  // Print summary
  console.log(`\n✅ Done!\n`);
  console.log(`New Images (Subdirectory):`);
  console.log(`   Processed: ${newImagesProcessed} images`);
  console.log(`   Original size: ${(newImagesTotalOriginalSize / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`   New size: ${(newImagesTotalNewSize / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`   Total change: ${((1 - newImagesTotalNewSize / newImagesTotalOriginalSize) * 100).toFixed(1)}% reduction`);
  console.log(`\nExisting Images (Root):`);
  console.log(`   Processed: ${existingImagesProcessed} images`);
  console.log(`   Original size: ${(existingImagesTotalOriginalSize / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`   New size: ${(existingImagesTotalNewSize / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`   Total change: ${((existingImagesTotalNewSize / existingImagesTotalOriginalSize - 1) * 100).toFixed(1)}% change`);
}

main().catch(console.error);
