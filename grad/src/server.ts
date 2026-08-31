// Path: ~/klaskerAI/grad/src/server.ts

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
  const staticDir = join(sitePath, config.static);
  const publicDir = join(sitePath, "public");

  let pages = scanMarkdownFiles(contentDir).map(parseMarkdownFile);

  // --- 1. Initial development build ---
  await buildSite(
    sitePath,
    pages,
    templateDir,
    false,
    "",
    false,
    true
  );

  console.log(`Initial build completed in ${publicDir}`);

  // --- 2. WebSocket Server for live reload ---
  const wsClients = new Set<WSClient>();

  serve({
    port: 1314,

    fetch(req, server) {
      if (server.upgrade(req)) return;

      return new Response(
        "WebSocket server for GRAD live reload"
      );
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

  console.log(
    "WebSocket server running on ws://localhost:1314"
  );

  // --- 3. File watcher ---
  let rebuilding = false;
  let rebuildPending = false;

  async function rebuild() {
    if (rebuilding) {
      rebuildPending = true;
      return;
    }

    rebuilding = true;

    try {
      console.log("Detected change. Rebuilding...");

      pages = scanMarkdownFiles(contentDir).map(
        parseMarkdownFile
      );

      await buildSite(
        sitePath,
        pages,
        templateDir,
        false,
        "",
        false,
        true
      );

      console.log(
        "Rebuild completed. Sending reload signal..."
      );

      wsClients.forEach((ws) => {
        try {
          ws.send("reload");
        } catch {
          wsClients.delete(ws);
        }
      });
    } finally {
      rebuilding = false;

      if (rebuildPending) {
        rebuildPending = false;
        void rebuild();
      }
    }
  }

  watch(
    contentDir,
    { recursive: true },
    () => void rebuild()
  );

  watch(
    templateDir,
    { recursive: true },
    () => void rebuild()
  );

  watch(
    staticDir,
    { recursive: true },
    () => void rebuild()
  );

  // --- 4. HTTP Dev Server ---
  serve({
    port: 1313,

    async fetch(req) {
      const url = new URL(req.url);

      // Serve the development-only hot-reload client
      // directly from the GRAD development server.
      if (url.pathname === "/hotreload.js") {
        const script = `
(() => {
  const socket = new WebSocket("ws://localhost:1314");

  socket.addEventListener("message", (event) => {
    if (event.data === "reload") {
      window.location.reload();
    }
  });

  socket.addEventListener("close", () => {
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  });
})();
`.trim();

        return new Response(script, {
          headers: {
            "Content-Type": "application/javascript; charset=utf-8",
            "Cache-Control": "no-store",
          },
        });
      }

      let fsPath = join(publicDir, url.pathname);

      try {
        // If directory, serve index.html
        if (
          existsSync(fsPath) &&
          statSync(fsPath).isDirectory()
        ) {
          fsPath = join(fsPath, "index.html");
        }

        // Only serve regular files
        if (
          !existsSync(fsPath) ||
          !statSync(fsPath).isFile()
        ) {
          return new Response("Not Found", {
            status: 404,
          });
        }

        return new Response(Bun.file(fsPath));
      } catch (err) {
        return new Response(
          "Error serving file: " + err,
          { status: 500 }
        );
      }
    },
  });

  console.log(
    `Serving ${publicDir} at http://localhost:1313`
  );
}
