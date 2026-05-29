import fs from "node:fs";
const raw = fs.readFileSync("./scripts/source-kjv-full.json", "utf8");
console.log("bytes", raw.length, "starts", raw.slice(0, 50));
try {
  const d = JSON.parse(raw);
  console.log("parsed", Array.isArray(d) ? "array" : typeof d, "len", d.length ?? "n/a");
  if (Array.isArray(d) && d[0]) console.log("first", Object.keys(d[0]));
} catch (e) {
  console.log("parse error", e.message);
}
