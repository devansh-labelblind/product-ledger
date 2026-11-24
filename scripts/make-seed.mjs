import fs from "node:fs";
import { parseProductText } from "../lib/parse.js";
const rows = parseProductText(fs.readFileSync(new URL("../data/product_urls.txt", import.meta.url), "utf8"));
fs.writeFileSync(new URL("../data/seed.json", import.meta.url), JSON.stringify(rows, null, 2));
console.log(`seed.json: ${rows.length} products`);
