import fs from "node:fs";
import path from "node:path";
import { convertDocHtml } from "./convert-docs";
const dir = process.argv[2];
if (!dir) throw Error("Informe a pasta de exportações HTML.");
const names = [
  [
    "jung",
    "Psicologia Junguiana",
    "jung",
    "1b6u9iQifam8Cg-P06fI04IfY2pny81FM6qg_lcWTDYc",
  ],
  [
    "socionics",
    "Socionics",
    "socionics",
    "1yxdsy3qJkOWg8MnRpfexSk5AVN6dj-ZDKz4PpxTbL9o",
  ],
  [
    "eneagrama",
    "Uma introdução ao Eneagrama",
    "eneagrama",
    "1NIj90GTzyi09JrV9yVXQ-i2qfSNn6M37lPFU7RwAZFs",
  ],
];
const pubs = names.map(([slug, title, topic, id], i) => ({
  id: "20000000-0000-4000-8000-00000000000" + (i + 1),
  title,
  kind: "base_text",
  summary: "Texto-base do acervo original.",
  html: convertDocHtml(
    fs.readFileSync(path.join(dir, slug + ".html"), "utf8"),
    "./source-images/" + slug + "/",
  ),
  topics: [topic],
  schools: [],
  author_name: "",
  published_at: null,
  status: "published",
  source_url: "https://docs.google.com/document/d/" + id + "/edit",
}));
fs.writeFileSync("packages/domain/src/publications.json", JSON.stringify(pubs));
console.log(
  pubs.map((p) => ({
    title: p.title,
    images: (p.html.match(/<img /g) || []).length,
    characters: p.html.length,
  })),
);
