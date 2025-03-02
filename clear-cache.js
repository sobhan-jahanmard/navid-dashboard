// Simple script to clear Next.js cache
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Directories to clean
const caches = [".next", "node_modules/.cache"];

console.log("🧹 Cleaning Next.js cache...");

// Remove cache directories
caches.forEach((cache) => {
  const cachePath = path.join(__dirname, cache);
  if (fs.existsSync(cachePath)) {
    try {
      if (process.platform === "win32") {
        // Windows requires a different approach
        execSync(`rmdir /s /q "${cachePath}"`, { stdio: "inherit" });
      } else {
        execSync(`rm -rf "${cachePath}"`, { stdio: "inherit" });
      }
      console.log(`✅ Removed ${cache}`);
    } catch (err) {
      console.error(`❌ Failed to remove ${cache}:`, err.message);
    }
  } else {
    console.log(`ℹ️ ${cache} does not exist, skipping`);
  }
});

console.log("🔄 Starting fresh build...");
try {
  execSync("npm run build", { stdio: "inherit" });
  console.log("✅ Build completed successfully");
} catch (err) {
  console.error("❌ Build failed:", err.message);
}

console.log("🚀 Cache cleared successfully! Now run:");
console.log("npm run dev");
