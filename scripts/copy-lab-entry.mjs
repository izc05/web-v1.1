import { copyFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const dist = resolve("dist");
const lab = resolve(dist, "lab-intro-3d");
const labAnti = resolve(dist, "lab-antigravity-intro");

await mkdir(lab, { recursive: true });
await copyFile(resolve(dist, "index.html"), resolve(lab, "index.html"));

await mkdir(labAnti, { recursive: true });
await copyFile(resolve(dist, "antigravity.html"), resolve(labAnti, "index.html"));
