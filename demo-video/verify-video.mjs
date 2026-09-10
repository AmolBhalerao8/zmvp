import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const video = path.join(root, "ZOL-Advisory-Board-Demo.mp4");
const sheet = path.join(root, "work", "contact-sheet.png");

const probe = spawnSync(ffmpegInstaller.path, ["-i", video, "-f", "null", "-"], {
  encoding: "utf8",
  windowsHide: true,
});
const probeText = `${probe.stdout || ""}\n${probe.stderr || ""}`;
const duration = probeText.match(/Duration:\s*([0-9:.]+)/)?.[1];
const videoStream = probeText.match(/Video:\s*([^\r\n]+)/)?.[1];
const audioStream = probeText.match(/Audio:\s*([^\r\n]+)/)?.[1];

const frames = spawnSync(
  ffmpegInstaller.path,
  ["-y", "-i", video, "-vf", "fps=1/35,scale=640:-1,tile=3x2", "-frames:v", "1", sheet],
  { encoding: "utf8", windowsHide: true },
);
if (frames.status !== 0) {
  console.error(frames.stderr);
  process.exit(frames.status || 1);
}

const stats = fs.statSync(video);
const report = {
  file: video,
  sizeMB: Number((stats.size / 1024 / 1024).toFixed(1)),
  duration,
  resolution: videoStream?.match(/(\d{3,5}x\d{3,5})/)?.[1],
  videoCodec: videoStream?.split(",")[0],
  audioCodec: audioStream?.split(",")[0],
  captions: fs.existsSync(path.join(root, "captions.srt")),
  contactSheet: sheet,
};
fs.writeFileSync(path.join(root, "work", "qa.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
