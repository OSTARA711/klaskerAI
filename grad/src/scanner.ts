import { readdirSync, statSync, existsSync } from "fs";
import { join } from "path";

export function scanMarkdownFiles(dir: string): string[] {
  const results: string[] = [];

  // Prevent hard crash when directory is missing (Cloudflare CI / misconfigured site)
  if (!existsSync(dir)) {
    console.warn(`[Grad] content directory not found: ${dir}`);
    return results;
  }

  function scan(currentDir: string) {
    let entries: string[];

    try {
      entries = readdirSync(currentDir);
    } catch (err) {
      console.warn(`[Grad] cannot read directory: ${currentDir}`);
      return;
    }

    for (const entry of entries) {
      const fullPath = join(currentDir, entry);

      let stats;
      try {
        stats = statSync(fullPath);
      } catch {
        continue;
      }

      if (stats.isDirectory()) {
        scan(fullPath);
      } else if (entry.endsWith(".md")) {
        results.push(fullPath);
      }
    }
  }

  scan(dir);

  return results;
}
