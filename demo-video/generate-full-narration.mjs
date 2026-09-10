import OpenAI from "openai";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(root, "..");
const work = path.join(root, "work-full");
const audioDir = path.join(work, "audio");

const envText = fs.readFileSync(path.join(projectRoot, ".env.local"), "utf8");
for (const line of envText.split(/\r?\n/)) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (!match) continue;
  const value = match[2].trim().replace(/^["']|["']$/g, "");
  if (!process.env[match[1]]) process.env[match[1]] = value;
}
if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is missing from .env.local.");

const markdown = fs.readFileSync(path.join(root, "full-narration.md"), "utf8");
const matches = [...markdown.matchAll(/^## (?<number>\d{2}) — (?<title>[^\r\n]+)\r?\n(?<text>.*?)(?=^## |\s*$)/gms)];
if (!matches.length) throw new Error("No full-demo narration scenes were found.");

fs.mkdirSync(audioDir, { recursive: true });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const manifest = [];

for (const match of matches) {
  const number = match.groups.number;
  const title = match.groups.title.trim();
  const text = match.groups.text.replace(/\s+/g, " ").trim();
  const speech = await openai.audio.speech.create({
    model: "gpt-4o-mini-tts",
    voice: "shimmer",
    input: text,
    instructions:
      "Use a warm, elegant American feminine voice that is distinct from Coral. Sound personable, clear, confident, and engaging for an automotive technology advisory-board presentation. Explain features naturally with measured pacing and gentle enthusiasm.",
    response_format: "wav",
  });
  fs.writeFileSync(path.join(audioDir, `${number}.wav`), Buffer.from(await speech.arrayBuffer()));
  manifest.push({ number, title, text, audio: `work-full/audio/${number}.wav` });
  console.log(`Generated full-demo scene ${number}.`);
}

fs.writeFileSync(path.join(work, "scenes.json"), JSON.stringify(manifest, null, 2));
console.log(`Generated ${manifest.length} full-demo scenes using the Shimmer voice.`);
