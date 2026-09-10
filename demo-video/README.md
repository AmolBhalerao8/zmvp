# ZOL Advisory Board Demo

The final deliverable is `ZOL-Advisory-Board-Demo.mp4`.

The production files are intentionally separate from the application runtime:

- `narration.md` — board-focused script
- `generate-openai-narration.mjs` — polished OpenAI Coral voice generation
- `generate-narration.ps1` — offline Windows speech fallback
- `capture-demo.mjs` — deterministic Playwright capture
- `render-video.mjs` — caption and MP4 composition
- `captions.srt` — shareable accessibility captions

## Regenerate

Keep ZOL and the Cloud SQL Auth Proxy running, then:

```powershell
node demo-video/generate-openai-narration.mjs
node demo-video/capture-demo.mjs
node demo-video/render-video.mjs
```

Temporary browser and audio artifacts are written under `demo-video/work/` and ignored by Git.

## Complete Product Vision video

The longer `ZOL-Complete-Product-Vision-Demo.mp4` includes AI voice reception, transcription, CRM intake, availability matching, booking, customer notifications, and the full repair-to-payment workflow. It uses OpenAI's distinct Shimmer voice.

```powershell
node demo-video/generate-full-narration.mjs
node demo-video/capture-full-demo.mjs
node demo-video/render-full-video.mjs
node demo-video/verify-full-video.mjs
```
