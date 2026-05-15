import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

interface ScriptLine {
  id: string;
  text: string;
  target: string;
}

const scriptPath = "public/audio/mara/script.json";
const outputDir = "public/audio/mara";
const piperPython = process.env.PIPER_PYTHON ?? "python3";
const piperVoice = process.env.PIPER_VOICE ?? "en_US-hfc_female-medium";
const piperDataDir = process.env.PIPER_DATA_DIR;
const ffmpegBin = process.env.FFMPEG_BIN ?? "ffmpeg";
const force = process.env.FORCE_VOICE === "1";

const lines = JSON.parse(readFileSync(scriptPath, "utf8")) as ScriptLine[];
const tempDir = mkdtempSync(join(tmpdir(), "mara-voice-"));

mkdirSync(outputDir, { recursive: true });

for (const line of lines) {
  const oggPath = join(outputDir, line.target);
  if (existsSync(oggPath) && !force) {
    console.log(`Skipped ${oggPath}`);
    continue;
  }
  if (line.text.trim() === "...") {
    run(ffmpegBin, [
      "-y",
      "-hide_banner",
      "-loglevel",
      "error",
      "-f",
      "lavfi",
      "-i",
      "anullsrc=channel_layout=mono:sample_rate=22050",
      "-t",
      "0.45",
      "-c:a",
      "libvorbis",
      "-q:a",
      "3",
      oggPath,
    ]);
    console.log(`Generated ${oggPath}`);
    continue;
  }

  const sentenceWavs = splitSentences(line.text).map((sentence, index) => {
    const wavPath = join(tempDir, `${line.id}-${index}.wav`);
    const piperArgs = ["-m", "piper", "-m", piperVoice];
    if (piperDataDir) piperArgs.push("--data-dir", piperDataDir);
    piperArgs.push("-f", wavPath);
    runWithInput(piperPython, piperArgs, `${sentence}\n`);
    return wavPath;
  });

  const ffmpegArgs = [
    "-y",
    "-hide_banner",
    "-loglevel",
    "error",
  ];
  for (const wavPath of sentenceWavs) ffmpegArgs.push("-i", wavPath);

  const postFilter =
    "loudnorm=I=-16:TP=-1.5:LRA=11,aresample=22050";
  if (sentenceWavs.length === 1) {
    ffmpegArgs.push("-af");
    ffmpegArgs.push(postFilter);
  } else {
    ffmpegArgs.push("-filter_complex", `${sentenceWavs.map((_, index) => `[${index}:a]`).join("")}concat=n=${sentenceWavs.length}:v=0:a=1,${postFilter}`);
  }

  ffmpegArgs.push(
    "-c:a",
    "libvorbis",
    "-q:a",
    "5",
    oggPath,
  );

  run(ffmpegBin, ffmpegArgs);
  console.log(`Generated ${oggPath}`);
}

function run(command: string, args: string[]): void {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} exited with ${result.status ?? "unknown status"}`);
  }
}

function runWithInput(command: string, args: string[], input: string): void {
  const result = spawnSync(command, args, {
    input,
    stdio: ["pipe", "inherit", "inherit"],
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} exited with ${result.status ?? "unknown status"}`);
  }
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}
