# How the demo video was made

The [launch video](https://youtu.be/cInr2bGed-Y) was produced entirely with free, scriptable tools: no screen-recording app, no editor, no paid AI video service.

| Step | Script | What it does |
|---|---|---|
| 1. Record | `record.mjs` | Drives the **real deployed site** in headless Microsoft Edge with `playwright-core` and records every scene: the demo pool, a live run (paste links → Apify scrape → agent reads → swipes → 3 live dates → ranking), the profile page, a date replay and the rankings. |
| 2. Voice | `tts.py` + `narration.json` | Neural voiceover with [`edge-tts`](https://github.com/rany2/edge-tts) (falls back to Windows SAPI). |
| 3. Design | `design.mjs` | Builds the branded assets from HTML/CSS: per-feature browser-window frames with headlines, a rounded mask, and animated intro, chapter and outro cards (CSS animations recorded at 1920×1080). |
| 4. Edit | `compose2.mjs` | `ffmpeg` composes everything: each recording is fitted to its narration, dropped into its browser-window frame (alpha mask), cut where nothing happens (with an on-screen "fast-forward" label), sped-up parts are labelled, fades between every segment, then concatenated into a 1080p MP4. |
| 5. Thumbnail | `thumb2.mjs` | HTML/CSS thumbnails rendered with the same headless browser. |

Outputs live in [`docs/video/`](../docs/video): the final `wingmate-launch.mp4`, thumbnails and the feature frames.

```bash
npm i playwright-core ffmpeg-static @ffprobe-installer/ffprobe && pip install edge-tts
node record.mjs && python tts.py && node design.mjs && node compose2.mjs
```
