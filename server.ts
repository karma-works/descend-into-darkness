import { join } from "path";

const PORT = 3000;
const PUBLIC_DIR = join(import.meta.dir, "public");
const SRC_ENTRY = join(import.meta.dir, "src", "main.ts");

console.log(`Descend into Darkness dev server running at http://localhost:${PORT}`);

Bun.serve({
  port: PORT,
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

    return new Response("Not found", { status: 404 });
  },
});
