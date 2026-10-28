import assert from "node:assert/strict"
import { execFile, execFileSync } from "node:child_process"
import { existsSync, mkdtempSync, readFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, test } from "node:test"
import { fileURLToPath } from "node:url"
import { promisify } from "node:util"

const cli = fileURLToPath(new URL("../dist/cli.js", import.meta.url))
const fixture = (name) => fileURLToPath(new URL(`./fixtures/video/${name}`, import.meta.url))
const run = async (...args) => {
    const out = mkdtempSync(join(tmpdir(), "video-"))
    const { stdout } = await promisify(execFile)("node", [cli, "video", ...args, "--out", out])
    return { out, stdout }
}
const read = (file) => readFileSync(file).toString("base64")

let ffmpeg = true
try {
    execFileSync("ffmpeg", ["-version"], { stdio: "ignore" })
} catch {
    ffmpeg = false
}

describe("motion-ai video", () => {
    test("renders the same frame for a time however it is reached", async () => {
        const video = fixture("Video.tsx")
        const forward = await run("stills", "0", "0.5", "1", "--video", video)
        // Seeking back to 0.5 from 1 reloads the page and steps from the start
        const back = await run("stills", "1", "0.5", "--video", video)

        const [start, middle, end] = [0, 1, 2].map((i) =>
            read(join(forward.out, "stills", `frame-0${i}.png`))
        )
        assert.equal(new Set([start, middle, end]).size, 3)
        assert.equal(read(join(back.out, "stills", "frame-01.png")), middle)
        assert.match(forward.stdout, /^0\.5s /m)
    })

    test("writes a labelled contact sheet", async () => {
        const { out, stdout } = await run("sheet", "0", "1", "0.25", "--video", fixture("Video.tsx"))
        assert.equal(stdout.trim(), join(out, "sheet-0-1.png"))
        assert.ok(readFileSync(join(out, "sheet-0-1.png")).length > 0)
        assert.ok(readFileSync(join(out, "sheet-0-1", "frame-04.png")).length > 0)
    })

    test("renders an MP4 with every frame", { skip: !ffmpeg && "ffmpeg is not installed" }, async () => {
        const { out, stdout } = await run("render", "--video", fixture("Video.tsx"))
        assert.match(stdout, /30 frames, 320x180 at 30 fps/)
        const frames = execFileSync("ffprobe", [
            "-v", "error", "-count_frames", "-select_streams", "v:0",
            "-show_entries", "stream=nb_read_frames", "-of", "csv=p=0",
            join(out, "video.mp4"),
        ]).toString().trim()
        assert.equal(frames, "30")
    })

    test("renders more than 100 frames", { skip: !ffmpeg && "ffmpeg is not installed" }, async () => {
        const { out } = await run("render", "--video", fixture("Long.tsx"))
        const frames = execFileSync("ffprobe", [
            "-v", "error", "-count_frames", "-select_streams", "v:0",
            "-show_entries", "stream=nb_read_frames", "-of", "csv=p=0",
            join(out, "video.mp4"),
        ]).toString().trim()
        assert.equal(frames, "120")
    })

    test("mounts the video at its own size", async () => {
        const { stdout } = await run("stills", "0", "--video", fixture("Wide.tsx"))
        assert.doesNotMatch(stdout, /Page errors/)
    })

    test("shows imported images and stylesheets from the first frame", { skip: !ffmpeg && "ffmpeg is not installed" }, async () => {
        const { out } = await run("stills", "0", "--video", fixture("Assets.tsx"))
        // The image is a 64px blue square in the top left corner
        const pixel = execFileSync("ffmpeg", [
            "-v", "error", "-i", join(out, "stills", "frame-00.png"),
            "-vf", "crop=1:1:32:32", "-f", "rawvideo", "-pix_fmt", "rgb24", "-",
        ])
        assert.deepEqual([...pixel], [0, 128, 255])
    })

    test("fails without writing an MP4 when the page throws", { skip: !ffmpeg && "ffmpeg is not installed" }, async () => {
        let out
        await assert.rejects(
            (async () => {
                out = mkdtempSync(join(tmpdir(), "video-"))
                await promisify(execFile)("node", [cli, "video", "render", "--video", fixture("Throws.tsx"), "--out", out])
            })(),
            (error) => {
                assert.equal(error.code, 1)
                assert.match(error.stderr, /Video broke/)
                return true
            }
        )
        assert.equal(existsSync(join(out, "video.mp4")), false)
    })

    test("says what is missing when the file doesn't export Video and duration", async () => {
        await assert.rejects(run("stills", "0", "--video", fixture("Broken.tsx")), (error) => {
            assert.match(error.stderr, /must export Video \(a component\) and duration/)
            return true
        })
    })

    test("rejects an unknown command", async () => {
        await assert.rejects(run("play"), (error) => {
            assert.match(error.stderr, /Unknown command play/)
            return true
        })
    })
})
