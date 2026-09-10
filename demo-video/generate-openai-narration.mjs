import OpenAI from "openai";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(root, "..");
const work = path.join(root, "work");
const audioDir = path.join(work, "audio");

function loadLocalEnvironment() {
  const envPath = path.join(projectRoot, ".env.local");
  const contents = fs.readFileSync(envPath, "utf8");
  for (const line of contents.split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;
    const value = match[2].trim().replace(/^["']|["']$/g, "");
    if (!process.env[match[1]]) process.env[match[1]] = value;
  }
}

loadLocalEnvironment();
if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is missing from .env.local.");

const markdown = fs.readFileSync(path.join(root, "narration.md"), "utf8");
const matches = [...markdown.matchAll(/^## (?<number>\d{2}) — (?<title>[^\r\n]+)\r?\n(?<text>.*?)(?=^## |\s*$)/gms)];
if (!matches.length) throw new Error("No narration scenes were found.");

fs.mkdirSync(audioDir, { recursive: true });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const manifest = [];

for (const match of matches) {
  const number = match.groups.number;
  const title = match.groups.title.trim();
  const text = match.groups.text.replace(/\s+/g, " ").trim();
  const output = path.join(audioDir, `${number}.wav`);

  const speech = await openai.audio.speech.create({
    model: "gpt-4o-mini-tts",
    voice: "coral",
    input: text,
    instructions:
      "Use a warm, polished American feminine voice. Sound confident, welcoming, and natural for an advisory-board product presentation. Keep an unhurried but concise pace, with gentle energy and clear automotive and software terminology.",
    response_format: "wav",
  });
  fs.writeFileSync(output, Buffer.from(await speech.arrayBuffer()));
  manifest.push({ number, title, text, audio: `work/audio/${number}.wav` });
  console.log(`Generated scene ${number}.`);
}

fs.writeFileSync(path.join(work, "scenes.json"), JSON.stringify(manifest, null, 2));
console.log(`Generated ${manifest.length} OpenAI narrated scenes using the Coral voice.`);
