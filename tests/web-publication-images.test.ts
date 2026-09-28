import test from "node:test";
import assert from "node:assert/strict";
import { resolveWebPublicationHtml } from "../apps/web/src/publication-images";
test("GitHub Pages publication images resolve below the repository base",()=>{const html=resolveWebPublicationHtml('<p>A</p><img src="./source-images/jung/image1.png"><img src="https://cdn.example/a.png"><img src="javascript:alert(1)"><p>B</p>',"https://elenaess.github.io/biblioteca-da-tipologia/");assert.match(html,/https:\/\/elenaess\.github\.io\/biblioteca-da-tipologia\/source-images\/jung\/image1\.png/);assert.match(html,/https:\/\/cdn\.example\/a\.png/);assert.doesNotMatch(html,/javascript:/);assert.match(html,/<p>A<\/p>/);assert.match(html,/<p>B<\/p>/);});
