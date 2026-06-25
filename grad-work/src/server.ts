import { loadConfig } from "./config";
import { scanMarkdownFiles } from "./scanner";
import { parseMarkdownFile } from "./parser";
import { buildSite } from "./builder";
import { serve } from "bun";
import { existsSync, statSync, watch } from "fs";
import { join } from "path";

interface WSClient {
  send(msg: string): void;
}

// === ServeSite: orchestrates everything ===
export async function serveSite(sitePath: string) {
  const config = loadConfig(sitePath);
  const contentDir = join(sitePath, config.content);
  const templateDir = join(sitePath, config.templates);
  const publicDir = join(sitePath, "public");

  let pages = scanMarkdownFiles(contentDir).map(parseMarkdownFile);

  // --- 1. Initial build ---
  await buildSite(sitePath, pages, templateDir);
  console.log(`Initial build completed in ${publicDir}`);

  // --- 2. WebSocket Server for live reload ---
  const wsClients = new Set<WSClient>();
  serve({
    port: 1314,
    fetch(req, server) {
      if (server.upgrade(req)) return;
      return new Response("WebSocket server for GRAD live reload");
    },
    websocket: {
      open(ws: WSClient) {
        wsClients.add(ws);
      },
      close(ws: WSClient) {
        wsClients.delete(ws);
      },
    },
  });
  console.log("WebSocket server running on ws://localhost:1314");

  // --- 3. File watcher ---
  function rebuild() {
    console.log("Detected change. Rebuilding...");
    pages = scanMarkdownFiles(contentDir).map(parseMarkdownFile);
    buildSite(sitePath, pages, templateDir).then(() => {
      console.log("Rebuild completed. Sending reload signal...");
      wsClients.forEach((ws) => ws.send("reload"));
    });
  }

  watch(contentDir, { recursive: true }, rebuild);
  watch(templateDir, { recursive: true }, rebuild);

  // --- 4. HTTP Dev Server ---
  serve({
    port: 1313,
    fetch(req) {
      const url = new URL(req.url);
      let fsPath = join(publicDir, url.pathname);

      try {
        // If directory, serve index.html
        if (existsSync(fsPath) && statSync(fsPath).isDirectory()) {
          fsPath = join(fsPath, "index.html");
        }

        // Only serve regular files
        if (!existsSync(fsPath) || !statSync(fsPath).isFile()) {
          return new Response("Not Found", { status: 404 });
        }

        return new Response(Bun.file(fsPath));
      } catch (err) {
        return new Response("Error serving file: " + err, { status: 500 });
      }
    },
  });

  console.log(`Serving ${publicDir} at http://localhost:1313`);
}
