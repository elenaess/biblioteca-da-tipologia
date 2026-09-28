import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
test("generated mobile image manifest covers every supported source image",()=>{const root=process.cwd(),source=path.join(root,"apps/web/public/source-images"),manifest=fs.readFileSync(path.join(root,"apps/mobile/src/image-assets.ts"),"utf8"),supported=/\.(png|jpe?g|webp)$/i;function walk(dir:string):string[]{return fs.existsSync(dir)?fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):supported.test(e.name)?[path.relative(source,path.join(dir,e.name)).split(path.sep).join("/")]:[]):[]}const keys=walk(source).sort();for(const key of keys)assert.ok(manifest.includes(JSON.stringify(key)+":"),`missing ${key}`);assert.equal(new Set(keys).size,keys.length);});
