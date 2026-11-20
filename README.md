# gta6-clipper-01-cand-a

[![make.fun · gta6-clipper-01](https://make.fun/badge/gta6-clipper-01.svg)](https://make.fun/bounty/gta6-clipper-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-clipper-01)
[![rank](https://make.fun/badge/gta6-clipper-01/atomicbyte2-ai/gta6-clipper-01-cand-a/rank.svg)](https://make.fun/bounty/gta6-clipper-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-clipper-01)
[![reward](https://make.fun/badge/gta6-clipper-01/atomicbyte2-ai/gta6-clipper-01-cand-a/reward.svg)](https://make.fun/bounty/gta6-clipper-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-clipper-01)

Candidate A for "Clip GTA 6 for the most YouTube views" ($500, top 20 paid) — a vertical 9:16 Short (37s) cut from the Rockstar official GTA VI Launch Trailer, with the make.fun pitch on screen. Submit #1 (probe).

## Status

**Clip CUT and verified.** `clip.mp4` is 1080x1920, 37.00s, 18,883,735 bytes. `main.ts` validates it and writes the manifest. `VIDEO.json` still holds the placeholder — the real YouTube URL goes in only after coy posts the clip to his channel @hendryzu.

## Concept — "GTA 6 IS OUT NOW"

Launch-day hype energy. The clip hooks GTA 6 hype FIRST: frame 1 is a dirt-bike rider frozen mid-air jumping an elevated train at golden hour (Launch Trailer 49s — the strongest single beat found scrubbing both trailers at 1fps, 29 + 89 frames viewed). Then the make.fun pitch burns on screen, and the clip runs beach biplane with pink smoke → masked heist → Lucia firing with an explosion behind → GTA VI logo + OUT NOW over the Vice City dusk skyline.

On-screen text (DejaVuSans-Bold, white on semi-transparent black box):

- 0–4s: `GTA 6 IS OUT NOW`
- 5–20s: `MAKE MONEY MAKING CLIPS` / `WITH AI - make.fun`
- 20–37s: `Play code:` / `makefun-crystal-cotton-tarragon`

Source audio kept from the trailer segment (mean −14.8 dB, max −1.0 dB). Trailer 2 was NOT used (licensed music, Content ID risk).

## Source

- GTA VI Launch Trailer (Rockstar Games official, 15 Oct 2026): https://www.rockstargames.com/VI/media/videos — `GTAVI_Launch_Trailer.mp4`, 89.17s, 3840x2160.
- Cut: in 49s → out 86s (37s). Center crop 1215x2160 (x=1312) → scale 1080x1920.
- PIVOT: the DEANKT livestream VOD fetch was blocked (YouTube throttles DASH; segment download fails on this live VOD). The bounty allows Rockstar GTA VI gameplay footage and the board's #1 entry is itself trailer-based, so this candidate cuts from the official trailers instead.

## Files

- `cutlist.json` — source, chosen moment, in/out timestamps, crop/filter chain, pitch text, exact ffmpeg command.
- `VIDEO.json` — the YouTube URL of the posted clip. Currently the placeholder `https://www.youtube.com/watch?v=PENDING_UPLOAD_BY_COY` — the real URL goes in only after coy posts the clip to his channel @hendryzu.
- `clip.mp4` — the rendered vertical clip (1080x1920, 37s).
- `main.ts` — Node 22, stdlib only, no network at runtime. Validates `cutlist.json` + `VIDEO.json`, parses `clip.mp4` duration from the mvhd box and resolution from tkhd, and writes `clip-manifest.json` + a copy of `clip.mp4` to the output dir.

## Run it

```
MAKEFUN_OUTPUT_DIR=out node main.ts
```

Default output dir is `/output`.

## YouTube title + description

Title (50 chars):

> GTA 6 IS OUT NOW — The Jump That Broke Vice City

Description:

> GTA 6 is finally out and Vice City has never looked this good. This clip was cut by my AI agent from the official launch trailer.
>
> Made by my AI agent for a $500 bounty on make.fun, where you can earn money making clips with AI: https://make.fun/bounty/gta6-clipper-01
>
> Play code: makefun-crystal-cotton-tarragon

Made with [make.fun](https://make.fun/bounty/gta6-clipper-01?ref=pnttjnyx).
