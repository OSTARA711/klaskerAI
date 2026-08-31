// Path: ~/klaskerAI/grad/src/builder.ts

import {
  writeFileSync,
  mkdirSync,
  existsSync,
  rmSync,
  statSync,
  readdirSync,
  copyFileSync,
  utimesSync
} from "fs";

import { join, dirname } from "node:path";

import { renderPage } from "./template";
import { Page } from "./parser";
import { CollectionRegistry } from "./collections";
import { loadConfig } from "./config";

/**
 * Determines whether a Markdown page should be rebuilt into HTML.
 *
 * A page is rebuilt when:
 *
 * - the output HTML does not exist; or
 * - the Markdown source is newer than the output HTML.
 */
function shouldBuild(
  mdPath: string,
  htmlPath: string
): boolean {
  if (!existsSync(htmlPath)) return true;

  const mdTime = statSync(mdPath).mtimeMs;
  const htmlTime = statSync(htmlPath).mtimeMs;

  return mdTime > htmlTime;
}

/**
 * Recursively copies static assets.
 *
 * Only new or modified files are copied.
 * Unchanged files are skipped.
 *
 * Internal project metadata must never become part of
 * the generated website.
 */
function copyStaticDir(
  src: string,
  dest: string
) {
  if (!existsSync(src)) return;

  const entries = readdirSync(src, {
    withFileTypes: true
  });

  for (const entry of entries) {
    // Never publish Git repository metadata.
    if (entry.name === ".git") continue;

    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);

    if (entry.isDirectory()) {
      mkdirSync(destPath, {
        recursive: true
      });

      copyStaticDir(srcPath, destPath);
      continue;
    }

    if (existsSync(destPath)) {
      const srcStat = statSync(srcPath);
      const destStat = statSync(destPath);

      if (srcStat.mtimeMs <= destStat.mtimeMs) {
        console.log("Skipped:", destPath);
        continue;
      }
    }

    mkdirSync(dirname(destPath), {
      recursive: true
    });

    copyFileSync(srcPath, destPath);

    /*
     * Preserve the source modification times so subsequent
     * incremental builds can correctly detect unchanged files.
     */
    const srcStat = statSync(srcPath);

    utimesSync(
      destPath,
      srcStat.atime,
      srcStat.mtime
    );

    console.log("Copied:", destPath);
  }
}

/**
 * XML escape for RSS.
 */
function xmlEscape(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Generate RSS for a collection.
 */
function generateRSS(
  collectionName: string,
  pages: Page[],
  siteUrl: string
) {
  const base = siteUrl.replace(/\/$/, "");

  const sorted = pages
    .filter(p => !p.draft)
    .sort((a, b) => {
      const da = pDate(a);
      const db = pDate(b);

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
 * Convert a page date into a timestamp.
 */
function pDate(page: Page): number {
  return page.date
    ? new Date(page.date).getTime()
    : 0;
}

/**
 * Build site.
 *
 * Modes:
 *
 * build
 *   Incremental development build.
 *
 * build --production
 *   Incremental production build.
 *   Currently identical to a normal incremental build.
 *
 * build --clean
 *   Delete the entire output directory before rebuilding.
 *
 * build --clean --production
 *   Clean production build.
 *   This is suitable for deployment to Cloudflare Pages.
 *
 * serve
 *   Calls this function with devMode=true so that the
 *   development-only hot-reload client is injected.
 */
export function buildSite(
  sitePath: string,
  pages: Page[],
  templateDir: string,
  clean: boolean = false,
  siteUrl: string = "",
  production: boolean = false,
  devMode: boolean = false
) {
  const config = loadConfig(sitePath);

  const contentDir = join(
    sitePath,
    config.content
  );

  const staticDir = join(
    sitePath,
    config.static
  );

  const outputDir = join(
    sitePath,
    config.output
  );

  /*
   * --clean means exactly what its name says:
   * remove the complete output directory.
   *
   * It does not depend on --production.
   */
  if (clean && existsSync(outputDir)) {
    console.log(
      "Cleaning output directory..."
    );

    rmSync(outputDir, {
      recursive: true,
      force: true
    });
  }

  mkdirSync(outputDir, {
    recursive: true
  });

  const collections = new CollectionRegistry();

  /*
   * Collections are marked dirty only when at least one
   * Markdown page actually needs to be rebuilt.
   */
  const dirtyCollections =
    new Set<string>();

  let rootJsonDirty = false;

  /*
   * production is deliberately not used to alter the
   * current build behaviour.
   *
   * This preserves:
   *
   *   build
   *   build --production
   *
   * as equivalent incremental builds while keeping the
   * flag available for future production-specific features.
   */
  void production;

  /*
   * Static assets use their source/output modification
   * times to determine whether they need copying.
   *
   * This remains incremental even during local development.
   */
  copyStaticDir(
    staticDir,
    outputDir
  );

  /*
   * Build Markdown pages.
   */
  for (const page of pages) {
    const relative =
      page.sourcePath.replace(
        contentDir + "/",
        ""
      );

    const parts =
      relative.split("/");

    const collectionName =
      parts.length > 1
        ? parts[0]
        : null;

    const outPath = join(
      outputDir,
      relative.replace(
        /\.md$/,
        ".html"
      )
    );

    /*
     * In development mode, always regenerate HTML.
     *
     * This is necessary because the development template
     * contains {{hotreload}}, which must be injected even
     * when the Markdown source itself has not changed.
     *
     * Production and normal build modes retain incremental
     * timestamp-based rebuilding.
     */
    const needsBuild =
      devMode ||
      shouldBuild(
        page.sourcePath,
        outPath
      );

    /*
     * Register every page so collection indexes always
     * contain the complete collection.
     */
    if (collectionName) {
      collections.addPage({
        ...page,
        collection: collectionName
      });
    }

    if (!needsBuild) {
      console.log(
        "Skipped:",
        outPath
      );

      continue;
    }

    /*
     * A rebuilt page makes its collection dirty.
     */
    if (collectionName) {
      dirtyCollections.add(
        collectionName
      );
    } else {
      rootJsonDirty = true;
    }

    const html = renderPage(
      templateDir,
      page,
      devMode
    );

    mkdirSync(
      dirname(outPath),
      {
        recursive: true
      }
    );

    writeFileSync(
      outPath,
      html
    );

    console.log(
      "Written:",
      outPath
    );
  }

  collections.sortCollections();

  /*
   * Regenerate collection indexes belonging to
   * collections whose pages were rebuilt.
   *
   * In development mode, every page is rebuilt, so the
   * relevant collection indexes are also regenerated.
   */
  for (const collection of collections.getAll()) {
    if (
      !collection.name ||
      !dirtyCollections.has(
        collection.name
      )
    ) {
      continue;
    }

    const indexHtmlPath = join(
      outputDir,
      collection.name,
      "index.html"
    );

    const html = renderPage(
      templateDir,
      {
        title: collection.name,
        pages: collection.pages,
        collection: collection.name
      } as any,
      devMode
    );

    mkdirSync(
      dirname(indexHtmlPath),
      {
        recursive: true
      }
    );

    writeFileSync(
      indexHtmlPath,
      html
    );

    console.log(
      "Generated collection index:",
      indexHtmlPath
    );

    const jsonPath = join(
      outputDir,
      collection.name,
      "index.json"
    );

    writeFileSync(
      jsonPath,
      JSON.stringify(
        {
          collection:
            collection.name,

          pages:
            collection.pages.map(
              p => ({
                title: p.title,
                slug: p.slug,
                url:
                  `/${collection.name}/${p.slug}.html`
              })
            )
        },
        null,
        2
      )
    );
  }

  /*
   * Regenerate the root index only when a root-level
   * Markdown page was rebuilt or a collection changed.
   */
  if (
    rootJsonDirty ||
    dirtyCollections.size > 0
  ) {
    const siteIndexPath = join(
      outputDir,
      "index.json"
    );

    writeFileSync(
      siteIndexPath,
      JSON.stringify(
        {
          pages:
            pages.map(p => ({
              title: p.title,
              url:
                `/${p.slug}.html`
            }))
        },
        null,
        2
      )
    );
  }

  console.log(
    "Site build completed in",
    outputDir
  );
}
