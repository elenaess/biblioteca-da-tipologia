import { build } from "esbuild";
import { writeFile, mkdir } from "node:fs/promises";
const result = await build({
  entryPoints: ["apps/web/src/reader/native-entry.tsx"],
  bundle: true,
  format: "iife",
  platform: "browser",
  target: ["chrome100"],
  minify: true,
  write: false,
  outdir: "reader-build",
  define: { "process.env.NODE_ENV": '"production"' },
  jsx: "automatic",
});
const js = result.outputFiles.find((x) => x.path.endsWith(".js")).text;
const css = result.outputFiles.find((x) => x.path.endsWith(".css"))?.text || "";
const html =
  '<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'; img-src https: data:; font-src data:; connect-src \'none\';"><style>body{margin:0}' +
  css +
  '</style></head><body><div id="root"></div><script>__READER_CONFIG__</script><script>' +
  js.replace(/<\/script/gi, "<\\/script") +
  "</script></body></html>";
await mkdir("apps/mobile/src/generated", { recursive: true });
await writeFile(
  "apps/mobile/src/generated/reader-document.json",
  JSON.stringify(html),
);
console.log("Leitor compartilhado preparado para Android.");
