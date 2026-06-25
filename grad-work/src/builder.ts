import {
  writeFileSync,
  mkdirSync,
  existsSync,
  rmSync,
  statSync,
  readdirSync,
  copyFileSync
} from "fs";

import { join, dirname } from "node:path";

import { renderPage } from "./template";
import { Page } from "./parser";
import { CollectionRegistry } from "./collections";
import { loadConfig } from "./config";

/**
 * Determines whether a Markdown page should be rebuilt into HTML
 */
function shouldBuild(mdPath: string, htmlPath: string): boolean {
  if (!existsSync(htmlPath)) return true;

  const mdTime = statSync(mdPath).mtimeMs;
  const htmlTime = statSync(htmlPath).mtimeMs;

  return mdTime > htmlTime;
}

/**
 * Recursively copies static assets
 */
function copyStaticDir(src: string, dest: string) {
  if (!existsSync(src)) return;

  const entries = readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);

    if (entry.isDirectory()) {
      mkdirSync(destPath, { recursive: true });
      copyStaticDir(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
      console.log("Copied:", destPath);
    }
  }
}

/**
 * XML escape for RSS
 */
function xmlEscape(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function generateRSS(collectionName: string, pages: Page[], siteUrl: string) {
  const base = siteUrl.replace(/\/$/, "");

  const sorted = pages
    .filter(p => !p.draft)
    .sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : 0;
      const db = b.date ? new Date(b.date).getTime() : 0;
      return db - da;
    });

  const items = sorted
    .map(p => `
<item>
  <title>${xmlEscape(p.title || "")}</title>
  <link>${base}/${collectionName}/${p.slug}.html</link>
  <pubDate>${p.date || new Date().toUTCString()}</pubDate>
</item>`)
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>${xmlEscape(collectionName)}</title>
  <link>${base}/${collectionName}/</link>
  <description>${xmlEscape(collectionName)}</description>
  ${items}
</channel>
</rss>`;
}

/**
 * Build site
 */
export function buildSite(
  sitePath: string,
  pages: Page[],
  templateDir: string,
  clean: boolean = false,
  siteUrl: string = "",
  production: boolean = false
) {
  const config = loadConfig(sitePath);

  const contentDir = join(sitePath, config.content);
  const staticDir = join(sitePath, config.static);
  const outputDir = join(sitePath, config.output);

  if (clean && existsSync(outputDir)) {
    console.log("Cleaning output directory...");
    rmSync(outputDir, { recursive: true, force: true });
  }

  mkdirSync(outputDir, { recursive: true });

  const collections = new CollectionRegistry();
  const dirtyCollections = new Set<string>();
  let rootJsonDirty = false;

  copyStaticDir(staticDir, outputDir);

  for (const page of pages) {
    const relative = page.sourcePath.replace(
      contentDir + "/",
      ""
    );

    const parts = relative.split("/");
    const collectionName = parts.length > 1 ? parts[0] : null;

    if (collectionName) {
      collections.addPage({ ...page, collection: collectionName });
      dirtyCollections.add(collectionName);
    } else {
      rootJsonDirty = true;
    }

    const outPath = join(
      outputDir,
      relative.replace(/\.md$/, ".html")
    );

    if (!shouldBuild(page.sourcePath, outPath)) {
      console.log("Skipped:", outPath);
      continue;
    }

    const html = renderPage(templateDir, page);

    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, html);

    console.log("Written:", outPath);
  }

  collections.sortCollections();

  for (const collection of collections.getAll()) {
    if (!collection.name || !dirtyCollections.has(collection.name)) continue;

    const indexHtmlPath = join(outputDir, collection.name, "index.html");

    const html = renderPage(templateDir, {
      title: collection.name,
      pages: collection.pages,
      collection: collection.name
    } as any);

    mkdirSync(dirname(indexHtmlPath), { recursive: true });
    writeFileSync(indexHtmlPath, html);

    console.log("Generated collection index:", indexHtmlPath);

    const jsonPath = join(outputDir, collection.name, "index.json");

    writeFileSync(jsonPath, JSON.stringify({
      collection: collection.name,
      pages: collection.pages.map(p => ({
        title: p.title,
        slug: p.slug,
        url: `/${collection.name}/${p.slug}.html`
      }))
    }, null, 2));
  }

  if (rootJsonDirty || dirtyCollections.size > 0) {
    const siteIndexPath = join(outputDir, "index.json");

    writeFileSync(siteIndexPath, JSON.stringify({
      pages: pages.map(p => ({
        title: p.title,
        url: `/${p.slug}.html`
      }))
    }, null, 2));
  }

  console.log("Site build completed in", outputDir);
}
