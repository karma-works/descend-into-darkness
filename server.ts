import { extname, join, relative } from "path";

const PORT = Number(Bun.env.PORT ?? 3000);
const PUBLIC_DIR = join(import.meta.dir, "public");
const SRC_ENTRY = join(import.meta.dir, "src", "main.ts");

console.log(`Descend into Darkness dev server running at http://localhost:${PORT}`);

Bun.serve({
  port: PORT,
  hostname: "127.0.0.1",
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;

    if (path === "/" || path === "/index.html") {
      return new Response(Bun.file(join(PUBLIC_DIR, "index.html")));
    }

    if (path === "/bundle.js") {
      const result = await Bun.build({
        entrypoints: [SRC_ENTRY],
        target: "browser",
        sourcemap: "inline",
      });
      if (!result.success) {
        const errors = result.logs.map((l) => l.message).join("\n");
        console.error("Build error:\n", errors);
        return new Response(`console.error(${JSON.stringify(errors)})`, {
          headers: { "Content-Type": "application/javascript" },
        });
      }
      const code = await result.outputs[0].text();
      return new Response(code, {
        headers: { "Content-Type": "application/javascript" },
      });
    }

    const filePath = join(PUBLIC_DIR, path);
    if (!relative(PUBLIC_DIR, filePath).startsWith("..")) {
      const file = Bun.file(filePath);
      if (await file.exists()) {
        return new Response(file, {
          headers: { "Content-Type": contentType(filePath) },
        });
      }
    }

    return new Response("Not found", { status: 404 });
  },
});

function contentType(filePath: string): string {
  switch (extname(filePath)) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".js":
      return "application/javascript; charset=utf-8";
    case ".ogg":
      return "audio/ogg";
    case ".svg":
      return "image/svg+xml";
    case ".json":
      return "application/json; charset=utf-8";
    default:
      return "application/octet-stream";
  }
}
