import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const work = path.join(root, "work");
const scenes = JSON.parse(fs.readFileSync(path.join(work, "scenes.json"), "utf8").replace(/^\uFEFF/, ""));
const timeline = JSON.parse(fs.readFileSync(path.join(work, "timeline.json"), "utf8"));
const output = path.join(root, "ZOL-Advisory-Board-Demo.mp4");
const captionsPath = path.join(root, "captions.srt");

const timestamp = (value) => {
  const ms = Math.max(0, Math.round(value));
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const millis = ms % 1000;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")},${String(millis).padStart(3, "0")}`;
};

const captions = [];
let captionIndex = 1;
for (const scene of timeline) {
  const sentences = scene.text.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((text) => text.trim()).filter(Boolean) || [scene.text];
  const weights = sentences.map((sentence) => Math.max(1, sentence.length));
  const totalWeight = weights.reduce((sum, value) => sum + value, 0);
  let cursor = scene.startMs;
  sentences.forEach((sentence, index) => {
    const share = scene.durationMs * (weights[index] / totalWeight);
    const end = index === sentences.length - 1 ? scene.startMs + scene.durationMs : cursor + share;
    captions.push(`${captionIndex++}\n${timestamp(cursor)} --> ${timestamp(end)}\n${sentence}\n`);
    cursor = end;
  });
}
fs.writeFileSync(captionsPath, `${captions.join("\n")}\n`, "utf8");

const args = ["-y", "-i", "work/capture.webm"];
for (const scene of scenes) args.push("-i", scene.audio);

const audioFilters = timeline.map((scene, index) => `[${index + 1}:a]adelay=${Math.round(scene.startMs)},volume=1[a${index}]`);
const mixInputs = timeline.map((_, index) => `[a${index}]`).join("");
const subtitleStyle = "FontName=Arial,FontSize=14,PrimaryColour=&H00FFFFFF,OutlineColour=&H70000000,BackColour=&H70000000,BorderStyle=3,Outline=1,Shadow=0,MarginV=28,Alignment=2";
const filter = [
  ...audioFilters,
  `${mixInputs}amix=inputs=${timeline.length}:duration=longest:dropout_transition=0,volume=${timeline.length}[aout]`,
  `[0:v]scale=1920:1080,subtitles=captions.srt:force_style='${subtitleStyle}'[vout]`,
].join(";");

args.push(
  "-filter_complex", filter,
  "-map", "[vout]",
  "-map", "[aout]",
  "-c:v", "libx264",
  "-preset", "medium",
  "-crf", "20",
  "-pix_fmt", "yuv420p",
  "-r", "30",
  "-c:a", "aac",
  "-b:a", "192k",
  "-movflags", "+faststart",
  "-shortest",
  output,
);

const result = spawnSync(ffmpegInstaller.path, args, {
  cwd: root,
  stdio: "inherit",
  windowsHide: true,
});
if (result.status !== 0) process.exit(result.status || 1);

const stats = fs.statSync(output);
console.log(`Rendered ${output} (${(stats.size / 1024 / 1024).toFixed(1)} MB)`);
