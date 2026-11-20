// gta6-clipper-01-cand-a: reproduce the vertical GTA 6 clip for make.fun.
//
// Reads cutlist.json + VIDEO.json next to this script, validates them,
// checks clip.mp4 (duration parsed from the mvhd box, resolution from tkhd,
// sha256), then copies clip.mp4 and writes clip-manifest.json to the output
// dir (default /output, overridable with MAKEFUN_OUTPUT_DIR).
// Node 22+ stdlib only, no network at runtime. All paths resolve from the
// script's own directory (import.meta.url) — never from CWD.
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const PLAY_CODE = "makefun-crystal-cotton-tarragon";
const VIDEO_URL_PLACEHOLDER =
  "https://www.youtube.com/watch?v=PENDING_UPLOAD_BY_COY";
const YOUTUBE_WATCH_RE = /^https:\/\/www\.youtube\.com\/watch\?v=[\w-]{11}$/;

const here = fileURLToPath(new URL(".", import.meta.url));

function readJson(name) {
  const p = join(here, name);
  let raw;
  try {
    raw = readFileSync(p, "utf8");
  } catch {
    throw new Error(`cannot read ${name} at ${p}: file missing or unreadable`);
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    throw new Error(`${name} is not valid JSON: ${e.message}`);
  }
}

function fail(msg) {
  throw new Error(msg);
}

// ---- cutlist.json -------------------------------------------------------
const cutlist = readJson("cutlist.json");
if (typeof cutlist !== "object" || cutlist === null || Array.isArray(cutlist)) {
  fail("cutlist.json must be a JSON object");
}
if (cutlist.competition !== "gta6-clipper-01") {
  fail(`cutlist.competition must be "gta6-clipper-01", got ${cutlist.competition}`);
}
if (cutlist.candidate !== "A") {
  fail(`cutlist.candidate must be "A", got ${cutlist.candidate}`);
}
if (!cutlist.source || typeof cutlist.source.url !== "string") {
  fail("cutlist.source.url missing");
}
if (
  typeof cutlist.in_seconds !== "number" ||
  !Number.isFinite(cutlist.in_seconds) ||
  typeof cutlist.out_seconds !== "number" ||
  !Number.isFinite(cutlist.out_seconds)
) {
  fail(
    "cutlist in_seconds/out_seconds must be numbers — moment not selected yet (see cutlist.json)",
  );
}
if (cutlist.out_seconds <= cutlist.in_seconds) {
  fail(
    `cutlist out_seconds (${cutlist.out_seconds}) must be > in_seconds (${cutlist.in_seconds})`,
  );
}
const cutSeconds = cutlist.out_seconds - cutlist.in_seconds;
if (cutSeconds < 1 || cutSeconds > 60) {
  fail(`clip length ${cutSeconds}s must be between 1s and 60s (Short format)`);
}
if (typeof cutlist.pitch_text !== "string" || !cutlist.pitch_text.includes("make.fun")) {
  fail('cutlist.pitch_text must be a non-empty string containing "make.fun"');
}
if (cutlist.play_code !== PLAY_CODE) {
  fail(`cutlist.play_code must be "${PLAY_CODE}", got ${cutlist.play_code}`);
}
if (typeof cutlist.ffmpeg_command !== "string" || cutlist.ffmpeg_command.length < 10) {
  fail("cutlist.ffmpeg_command missing — render command not recorded");
}
if (typeof cutlist.filter_chain !== "string" || cutlist.filter_chain.length < 5) {
  fail("cutlist.filter_chain missing");
}

// ---- VIDEO.json ---------------------------------------------------------
const video = readJson("VIDEO.json");
if (typeof video !== "object" || video === null || Array.isArray(video)) {
  fail("VIDEO.json must be a JSON object");
}
if (typeof video.video_url !== "string" || video.video_url.length === 0) {
  fail("VIDEO.json video_url missing");
}
if (video.video_url === VIDEO_URL_PLACEHOLDER) {
  console.warn(
    "WARNING: VIDEO.json still holds the PENDING_UPLOAD_BY_COY placeholder — " +
      "replace with the real YouTube URL after coy posts the clip.",
  );
} else if (!YOUTUBE_WATCH_RE.test(video.video_url)) {
  fail(`VIDEO.json video_url is not a YouTube watch URL: ${video.video_url}`);
}

// ---- clip.mp4 -----------------------------------------------------------
const clipPath = join(here, "clip.mp4");
if (!existsSync(clipPath)) {
  fail(`clip.mp4 missing at ${clipPath} — render the clip first (see cutlist.json)`);
}
const clipBytes = readFileSync(clipPath);
if (clipBytes.length === 0) {
  fail("clip.mp4 is empty (0 bytes)");
}

// Walk top-level MP4 boxes; find moov > mvhd (duration) and tkhd (size).
function findBox(buf, start, end, type) {
  let off = start;
  while (off + 8 <= end) {
    const size = buf.readUInt32BE(off);
    const name = buf.toString("ascii", off + 4, off + 8);
    if (size < 8) break;
    if (name === type) return { off, size };
    off += size;
  }
  return null;
}
const moov = findBox(clipBytes, 0, clipBytes.length, "moov");
if (!moov) fail("clip.mp4 has no moov box — not a valid MP4");
const mvhd = findBox(clipBytes, moov.off + 8, moov.off + moov.size, "mvhd");
if (!mvhd) fail("clip.mp4 has no mvhd box");
const mvhdBody = mvhd.off + 8;
const mvhdVersion = clipBytes[mvhdBody];
let timescale;
let durationUnits;
if (mvhdVersion === 0) {
  timescale = clipBytes.readUInt32BE(mvhdBody + 12);
  durationUnits = clipBytes.readUInt32BE(mvhdBody + 16);
} else if (mvhdVersion === 1) {
  timescale = clipBytes.readUInt32BE(mvhdBody + 20);
  durationUnits = Number(clipBytes.readBigUInt64BE(mvhdBody + 24));
} else {
  fail(`unsupported mvhd version ${mvhdVersion}`);
}
if (!timescale || timescale <= 0) fail(`bad mvhd timescale ${timescale}`);
const durationSeconds = durationUnits / timescale;
if (!(durationSeconds >= 1 && durationSeconds <= 60.5)) {
  fail(`clip.mp4 duration ${durationSeconds.toFixed(3)}s outside 1–60s Short range`);
}
if (Math.abs(durationSeconds - cutSeconds) > 2.0) {
  fail(
    `clip.mp4 duration ${durationSeconds.toFixed(2)}s differs from cutlist ` +
      `(${cutSeconds}s) by more than 2s — wrong segment rendered?`,
  );
}

// Resolution from tkhd (width/height are 16.16 fixed-point). tkhd lives
// inside a trak box, not as a direct child of moov, so search each trak.
let width = null;
let height = null;
let tkhd = null;
{
  let off = moov.off + 8;
  const moovEnd = moov.off + moov.size;
  while (off + 8 <= moovEnd && !tkhd) {
    const size = clipBytes.readUInt32BE(off);
    const name = clipBytes.toString("ascii", off + 4, off + 8);
    if (size < 8) break;
    if (name === "trak") tkhd = findBox(clipBytes, off + 8, off + size, "tkhd");
    off += size;
  }
}
if (tkhd) {
  const body = tkhd.off + 8;
  const version = clipBytes[body];
  const dimOff = version === 1 ? body + 88 : body + 76;
  if (dimOff + 8 <= tkhd.off + tkhd.size) {
    width = clipBytes.readUInt32BE(dimOff) / 65536;
    height = clipBytes.readUInt32BE(dimOff + 4) / 65536;
  }
}
if (width !== null && height !== null) {
  if (width !== 1080 || height !== 1920) {
    fail(`clip.mp4 is ${width}x${height}, must be vertical 1080x1920`);
  }
} else {
  console.warn("WARNING: could not read resolution from tkhd — skipping size check");
}

const sha256 = createHash("sha256").update(clipBytes).digest("hex");

// ---- output -------------------------------------------------------------
const outDir = process.env.MAKEFUN_OUTPUT_DIR || "/output";
mkdirSync(outDir, { recursive: true });
copyFileSync(clipPath, join(outDir, "clip.mp4"));

const manifest = {
  competition: "gta6-clipper-01",
  candidate: "A",
  video_url: video.video_url,
  source: cutlist.source,
  moment: cutlist.moment || null,
  in_seconds: cutlist.in_seconds,
  out_seconds: cutlist.out_seconds,
  clip_seconds: cutSeconds,
  duration_seconds: Number(durationSeconds.toFixed(3)),
  width,
  height,
  size_bytes: clipBytes.length,
  sha256,
  pitch_text: cutlist.pitch_text,
  play_code: cutlist.play_code,
};
writeFileSync(join(outDir, "clip-manifest.json"), JSON.stringify(manifest, null, 2) + "\n");

console.log(
  `clip.mp4: ${durationSeconds.toFixed(2)}s, ${width}x${height}, ` +
    `${clipBytes.length} bytes, sha256 ${sha256}`,
);
console.log(`wrote ${join(outDir, "clip.mp4")}`);
console.log(`wrote ${join(outDir, "clip-manifest.json")}`);
