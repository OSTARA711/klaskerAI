import { loadConfig } from "../../src/config";
import { scanMarkdownFiles } from "../../src/scanner";
import { parseMarkdownFile } from "../../src/parser";
import { buildSite } from "../../src/builder";

import { join } from "node:path";

export default async function build(args: string[]) {
  const clean = args.includes("--clean");
  const production = args.includes("--production");

  // FIX: correct sitePath resolution (no args.slice(1))
  const sitePath =
    args.find(a => !a.startsWith("--")) ?? "./example-site";

  // FIX: safe config fallback (no try/catch needed upstream anymore,
  // but kept minimal safety layer)
  let config;
  try {
    config = loadConfig(sitePath);
  } catch {
    config = {
      content: "content",
      templates: "templates",
      static: "static",
      output: "public"
    };
  }

  // FIX: use join instead of string concatenation
  const contentDir = join(sitePath, config.content);
  const templateDir = join(sitePath, config.templates);

  const markdownPaths = scanMarkdownFiles(contentDir);
  const pages = markdownPaths.map(parseMarkdownFile);

  await buildSite(
    sitePath,
    pages,
    templateDir,
    clean,
    "",
    production
  );
}
