import * as https from "https";
import * as http from "http";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

/**
 * Downloads a file from a URL and saves it to disk.
 */
export function downloadFile(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith("https") ? https : http;
    const file = fs.createWriteStream(destPath);

    console.log(`⬇️  Downloading: ${url}`);

    protocol
      .get(url, (response) => {
        // Follow redirects (301, 302, 307, 308)
        if (
          response.statusCode &&
          response.statusCode >= 300 &&
          response.statusCode < 400 &&
          response.headers.location
        ) {
          file.close();
          fs.unlinkSync(destPath);
          console.log(`↪️  Redirecting to: ${response.headers.location}`);
          return downloadFile(response.headers.location, destPath)
            .then(resolve)
            .catch(reject);
        }

        if (response.statusCode !== 200) {
          reject(
            new Error(`Download failed with status: ${response.statusCode}`)
          );
          return;
        }

        const totalBytes = parseInt(
          response.headers["content-length"] ?? "0",
          10
        );
        let downloadedBytes = 0;

        response.on("data", (chunk: Buffer) => {
          downloadedBytes += chunk.length;
          if (totalBytes > 0) {
            const pct = ((downloadedBytes / totalBytes) * 100).toFixed(1);
            process.stdout.write(`\r   Progress: ${pct}%`);
          }
        });

        response.pipe(file);

        file.on("finish", () => {
          file.close();
          if (totalBytes > 0) process.stdout.write("\n");
          console.log(`✅ Download complete: ${destPath}`);
          resolve();
        });
      })
      .on("error", (err) => {
        fs.unlink(destPath, () => {}); // clean up partial file
        reject(err);
      });
  });
}

/**
 * Computes the SHA-256 checksum of a file.
 */
export function computeSHA256(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath);

    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", reject);
  });
}

/**
 * Main: download an exe and log its SHA-256.
 */
async function main(): Promise<void> {
  // ── Configure these ──────────────────────────────────────────────────────
  const EXE_URL =
    "https://github.com/git-for-windows/git/releases/download/v2.47.1.windows.1/Git-2.47.1-64-bit.exe";
  const OUTPUT_DIR = "./downloads";
  // ─────────────────────────────────────────────────────────────────────────

  const fileName = path.basename(new URL(EXE_URL).pathname);
  const destPath = path.join(OUTPUT_DIR, fileName);

  // Ensure output directory exists
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  await downloadFile(EXE_URL, destPath);

  console.log("\n🔐 Computing SHA-256 checksum...");
  const checksum = await computeSHA256(destPath);

  const fileStat = fs.statSync(destPath);
  const fileSizeKB = (fileStat.size / 1024).toFixed(2);

  console.log("\n──────────────────────────────────────────────────────────");
  console.log(`  File     : ${destPath}`);
  console.log(`  Size     : ${fileSizeKB} KB`);
  console.log(`  SHA-256  : ${checksum}`);
  console.log("──────────────────────────────────────────────────────────\n");
}

/*main().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});*/