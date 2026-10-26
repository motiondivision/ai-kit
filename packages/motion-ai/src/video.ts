import { execFileSync } from "node:child_process"
import { mkdirSync, rmSync, writeFileSync } from "node:fs"
import { createRequire } from "node:module"
import { join, resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import {
    captureFrames,
    frameDigits,
    loadPlaywright,
    writeContactSheet,
} from "./capture.js"

const VIDEO_DIR = fileURLToPath(new URL("../video/", import.meta.url))

export const VIDEO_USAGE = `Usage:  npx motion-ai video <command> [options]

Renders a video written as a React component (Video.tsx) frame by frame on
Motion's manual clock, so springs, staggers and every value land exactly on
each frame. The file exports Video and duration (seconds), and optionally
width, height (default 1280x720) and fps (default 30).

  sheet <from> <to> [step]   Contact sheet of frames, labelled with their
                             time (default step 0.1s)
  stills <t> [t...]          Full-size frames at these times
  render                     MP4 of the whole video

  --video <file>   Component file (default motion-video/Video.tsx)
  --out <dir>      Output folder (default motion-video/out)

Import Counter from "motion-ai/video" for numbers that count.

Needs motion 14.6 or later, react, react-dom, esbuild and Playwright with
Chromium in the project, and ffmpeg for render:
  npm i -D esbuild playwright && npx playwright install chromium`

interface Config {
    duration: number
    width: number
    height: number
    fps: number
}

function fail(message: string): never {
    console.error(message)
    process.exit(1)
}

function parse(args: string[]) {
    const flags: Record<string, string> = {}
    const positional: string[] = []
    for (let i = 0; i < args.length; i++) {
        const arg = args[i]
        if (arg.startsWith("--")) {
            const [name, inline] = arg.slice(2).split(/=(.*)/s)
            if (name !== "video" && name !== "out") throw new Error(`Unknown option --${name}`)
            const value = inline ?? args[++i]
            if (value === undefined) throw new Error(`--${name} needs a value`)
            flags[name] = value
        } else {
            positional.push(arg)
        }
    }
    const [command, ...rest] = positional
    if (!["sheet", "stills", "render"].includes(command)) {
        throw new Error(command ? `Unknown command ${command}` : "Pass a command")
    }
    const times = rest.map(Number)
    if (times.some((t) => !(t >= 0))) throw new Error("Times must be seconds, 0 or more")
    if (command === "stills" && !times.length) throw new Error("stills needs at least one time")
    return {
        command,
        times,
        labels: rest,
        video: resolve(flags.video ?? "motion-video/Video.tsx"),
        out: resolve(flags.out ?? "motion-video/out"),
    }
}

/**
 * Resolves packages imported by motion-ai's own video files (react, motion)
 * from the project, never from next to motion-ai, so the bundle has one
 * copy of React and the project's version of Motion.
 */
const projectPackages = {
    name: "project-packages",
    setup(build: any) {
        build.onResolve({ filter: /^[^./]/ }, (args: any) => {
            if (args.pluginData || !args.importer.startsWith(VIDEO_DIR)) return
            if (args.path.startsWith("@motion-ai/") || args.path.startsWith("motion-ai/")) return
            return build.resolve(args.path, {
                kind: args.kind,
                resolveDir: process.cwd(),
                pluginData: true,
            })
        })
    },
}

/**
 * Bundles the video with the project's own esbuild, motion and React, so
 * the render uses exactly the versions the project ships.
 */
async function bundle(video: string, out: string) {
    let esbuild: any
    try {
        esbuild = await import(
            pathToFileURL(createRequire(join(process.cwd(), "package.json")).resolve("esbuild")).href
        )
    } catch {
        fail("motion-ai video needs esbuild in the project.\n\n  npm i -D esbuild")
    }
    mkdirSync(out, { recursive: true })
    try {
        await (esbuild.build ?? esbuild.default.build)({
            entryPoints: [join(VIDEO_DIR, "entry.tsx")],
            bundle: true,
            outfile: join(out, "bundle.js"),
            format: "iife",
            jsx: "automatic",
            logLevel: "error",
            define: { "process.env.NODE_ENV": '"production"' },
            alias: {
                "@motion-ai/video-source": video,
                "motion-ai/video": join(VIDEO_DIR, "Counter.tsx"),
            },
            nodePaths: [join(process.cwd(), "node_modules")],
            plugins: [projectPackages],
        })
    } catch {
        process.exit(1)
    }
    const html = join(out, "index.html")
    writeFileSync(
        html,
        `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;overflow:hidden;background:#000}#root{position:relative;overflow:hidden}</style></head><body><div id="root"></div><script src="bundle.js"></script></body></html>`
    )
    return pathToFileURL(html).href
}

export async function video(args: string[]): Promise<void> {
    if (args.includes("--help") || args.includes("-h")) {
        console.log(VIDEO_USAGE)
        return
    }

    let options: ReturnType<typeof parse>
    try {
        options = parse(args)
    } catch (error) {
        fail(`${(error as Error).message}\n\n${VIDEO_USAGE}`)
    }
    const playwright = loadPlaywright()
    if (!playwright) {
        fail("motion-ai video needs Playwright.\n\n  npm i -D playwright && npx playwright install chromium")
    }
    if (options.command === "render") {
        try {
            execFileSync("ffmpeg", ["-version"], { stdio: "ignore" })
        } catch {
            fail("motion-ai video render needs ffmpeg. Install it (for example brew install ffmpeg) and run render again.")
        }
    }

    const url = await bundle(options.video, options.out)
    const browser = await playwright.chromium.launch({ args: ["--font-render-hinting=none"] })
    const errors: string[] = []
    try {
        const page = await browser.newPage({ deviceScaleFactor: 1 })
        page.on("pageerror", (e: Error) => errors.push(e.message))
        page.on("console", (m: any) => m.type() === "error" && errors.push(m.text()))

        let config: Config
        let current = 0
        const open = async () => {
            await page.goto(url)
            config = await page.evaluate("window.__video")
            if (!config) fail(`The video did not start:\n  ${[...new Set(errors)].join("\n  ")}`)
            await page.setViewportSize({ width: config.width, height: config.height })
            current = 0
        }

        // Step the clock one frame at a time, so springs see real deltas.
        // Going back reloads the page and steps from the start.
        const seek = async (time: number) => {
            const target = Math.round(time * config.fps)
            if (target < current) await open()
            for (let f = current + 1; f <= target; f++) {
                await page.evaluate(`window.__frame(${(f * 1000) / config.fps})`)
            }
            current = Math.max(current, target)
            await page.evaluate("new Promise((r) => setTimeout(r, 0))")
        }

        await open()
        config = config!

        if (options.command === "stills") {
            const frames = await captureFrames(page, options.times, join(options.out, "stills"), { seek })
            for (const frame of frames) console.log(`${frame.time}s  ${frame.file}`)
        } else if (options.command === "sheet") {
            const [from = 0, to = config.duration, step = 0.1] = options.times
            const times: number[] = []
            for (let t = from; t <= to + 1e-9; t += step) times.push(Math.round(t * 1000) / 1000)
            const dir = join(options.out, `sheet-${from}-${to}`)
            rmSync(dir, { recursive: true, force: true })
            const frames = await captureFrames(page, times, dir, { seek })
            const file = join(options.out, `sheet-${from}-${to}.png`)
            await writeContactSheet(browser, frames, file)
            console.log(file)
        } else {
            const total = Math.round(config.duration * config.fps)
            const times = Array.from({ length: total }, (_, f) => f / config.fps)
            const dir = join(options.out, "frames")
            rmSync(dir, { recursive: true, force: true })
            await captureFrames(page, times, dir, { seek })
            const file = join(options.out, "video.mp4")
            execFileSync("ffmpeg", [
                "-y", "-loglevel", "error",
                "-framerate", String(config.fps),
                "-i", join(dir, `frame-%0${frameDigits(total)}d.png`),
                "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18",
                file,
            ])
            rmSync(dir, { recursive: true, force: true })
            console.log(`${file} (${total} frames, ${config.width}x${config.height} at ${config.fps} fps)`)
        }

        if (errors.length) console.log(`Page errors:\n  ${[...new Set(errors)].join("\n  ")}`)
    } finally {
        await browser.close()
    }
}
