// Path: ~/klaskerAI/grad/src/template.ts

import { readFileSync } from "fs";
import { join } from "path";
import { Page } from "./parser";

/**
 * Favicon sizes to inject automatically
 */
const faviconSizes = [16, 32, 48, 64, 180];

/**
 * Generate favicon <link> tags dynamically
 */
function generateFaviconLinks(): string {
  return faviconSizes
    .map((size) => {
      if (size === 180) {
        return `<link rel="apple-touch-icon" sizes="${size}x${size}" href="/favicon-${size}.png">`;
      } else {
        return `<link rel="icon" type="image/png" sizes="${size}x${size}" href="/favicon-${size}.png">`;
      }
    })
    .join("\n  ");
}

/**
 * Generate the development hot-reload script injection.
 *
 * Hot reload is enabled only when explicitly requested by
 * the local development server.
 */
function getHotReloadSnippet(devMode: boolean): string {
  if (!devMode) return "";

  return `
<script defer src="/hotreload.js"></script>
`.trim();
}

/**
 * Render a Page object into full HTML using a template
 */
export function renderPage(
  templateDir: string,
  page: Page,
  devMode: boolean = false
): string {
  const templatePath = join(templateDir, "page.html");
  const rawTemplate = readFileSync(templatePath, "utf-8");

  const faviconLinks = generateFaviconLinks();
  const hotreload = getHotReloadSnippet(devMode);

  let html = rawTemplate;

  html = html.replace("{{title}}", page.title || "Untitled");
  html = html.replace("{{description}}", page.description || "");
  html = html.replace("{{content}}", page.html);
  html = html.replace("{{favicons}}", faviconLinks);
  html = html.replace("{{hotreload}}", hotreload);

  return html;
}
