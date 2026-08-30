import { readFileSync } from "fs";
import { marked } from "marked";

export interface Page {
  title: string;
  date?: string;
  html: string;
  sourcePath: string;
}

export function parseMarkdownFile(filePath: string): Page {
  const raw = readFileSync(filePath, "utf-8");

  let metadata: any = {};
  let content = raw;

  // Check if file starts with front matter ---
  if (raw.startsWith("---")) {
    const end = raw.indexOf("\n---", 3); // find closing ---
    if (end !== -1) {
      const fm = raw.slice(3, end).trim();
      content = raw.slice(end + 4).trim();

      fm.split("\n").forEach((line) => {
        const [key, ...rest] = line.split(":");
        if (key) metadata[key.trim()] = rest.join(":").trim();
      });
    }
  }

  const html = marked(content);

  return {
    title: metadata.title || "Untitled",
    date: metadata.date,
    html,
    sourcePath: filePath,
  };
}
