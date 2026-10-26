import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { createRequire } from "node:module"
import { join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

export const INSPECTOR_PATH = fileURLToPath(
    new URL("../inspector/motion-inspector.js", import.meta.url)
)

export const FILMSTRIP_USAGE = `Usage:  npx motion-ai filmstrip <url> [options]

Renders every Motion animation on a page frame by frame, so an agent can see
it. Writes frame PNGs, a contact sheet (filmstrip.png) and timeline.json.

Without --click or --hover it captures the animations that run as the page
loads. With one, it waits for the page to settle, then captures the
animations that interaction starts.

  --click <selector>    Click this element and capture what it animates
  --hover <selector>    Hover this element and capture what it animates
  --frames <n>          Frames to capture, start and end included (default 8)
  --duration <seconds>  Timeline length to capture (default: until the last
                        animation ends, at most 10s)
  --selector <css>      Crop frames to the area this element covers
  --out <dir>           Output folder (default motion-filmstrip)
  --width <px>          Viewport width (default 1280)
  --height <px>         Viewport height (default 800)

Needs Playwright with Chromium: npm i -D playwright && npx playwright install chromium`

interface Options {
    url: string
    click?: string
    hover?: string
    frames: number
    duration?: number
    selector?: string
    out: string
    width: number
    height: number
}

interface Box {
    x: number
    y: number
    width: number
    height: number
}

const FLAGS = [
    "click",
    "hover",
    "frames",
    "duration",
    "selector",
    "out",
    "width",
    "height",
]

function parse(args: string[]): Options {
    const flags: Record<string, string> = {}
    let url: string | undefined
    for (let i = 0; i < args.length; i++) {
        const arg = args[i]
        if (arg.startsWith("--")) {
            // --name value or --name=value
            const [name, inline] = arg.slice(2).split(/=(.*)/s)
            if (!FLAGS.includes(name)) throw new Error(`Unknown option --${name}`)
            const value = inline ?? args[++i]
            if (value === undefined) throw new Error(`--${name} needs a value`)
            flags[name] = value
        } else {
            url ??= arg
        }
    }
    if (!url) throw new Error("Pass the URL of the page to capture")

    const number = (name: string, fallback?: number) => {
        if (flags[name] === undefined) return fallback
        const value = Number(flags[name])
        if (!(value > 0)) throw new Error(`--${name} must be a positive number`)
        return value
    }

    return {
        url,
        click: flags.click,
        hover: flags.hover,
        frames: Math.max(2, Math.round(number("frames", 8)!)),
        duration: number("duration"),
        selector: flags.selector,
        out: resolve(flags.out ?? "motion-filmstrip"),
        width: number("width", 1280)!,
        height: number("height", 800)!,
    }
}

/**
 * Playwright is optional: use the project's own copy, falling back to one
 * next to motion-ai or on NODE_PATH.
 */
function loadPlaywright() {
    for (const from of [join(process.cwd(), "package.json"), import.meta.url]) {
        for (const name of ["playwright", "@playwright/test", "playwright-core"]) {
            try {
                return createRequire(from)(name)
            } catch {}
        }
    }
    return null
}

const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms))

/**
 * Wait until the number of listed animations stops changing, as an
 * interaction can start its animations over several frames (keyframes that
 * need measuring, layout animations, React rendering).
 */
async function waitForAnimations(page: any, quiet = 300, timeout = 3000) {
    const end = Date.now() + timeout
    let count = -1
    let since = Date.now()
    while (Date.now() < end) {
        const now: number = await page.evaluate("MotionInspector.list().length")
        if (now !== count) {
            count = now
            since = Date.now()
        } else if (count > 0 && Date.now() - since >= quiet) {
            break
        }
        await sleep(50)
    }
    return count
}

/**
 * Wait until nothing on the page is animating, so an interaction starts
 * from rest.
 */
async function waitForRest(page: any, timeout = 5000) {
    const end = Date.now() + timeout
    while (Date.now() < end) {
        const running: number = await page.evaluate(
            `MotionInspector.list().filter((a) => a.state === "running" && a.repeat !== "infinite").length`
        )
        if (!running) return
        await sleep(100)
    }
}

const union = (a: Box | null, b: Box): Box => {
    if (!a) return b
    const x = Math.min(a.x, b.x)
    const y = Math.min(a.y, b.y)
    return {
        x,
        y,
        width: Math.max(a.x + a.width, b.x + b.width) - x,
        height: Math.max(a.y + a.height, b.y + b.height) - y,
    }
}

function contactSheet(frames: { file: string; time: number }[]) {
    const cells = frames
        .map(
            ({ file, time }) =>
                `<figure><img src="data:image/png;base64,${readFileSync(file).toString("base64")}"><figcaption>${time.toFixed(3)}s</figcaption></figure>`
        )
        .join("")
    const columns = Math.min(frames.length, 4)
    return `<!doctype html><style>
body{margin:0;padding:12px;background:#fff;font:12px ui-monospace,monospace;color:#333}
main{display:grid;grid-template-columns:repeat(${columns},1fr);gap:12px}
figure{margin:0}img{width:100%;display:block;border:1px solid #ddd}
figcaption{padding-top:4px}
</style><main>${cells}</main>`
}

export async function filmstrip(args: string[]): Promise<void> {
    if (args.includes("--help") || args.includes("-h")) {
        console.log(FILMSTRIP_USAGE)
        return
    }

    let options: Options
    try {
        options = parse(args)
    } catch (error) {
        console.error(`${(error as Error).message}\n\n${FILMSTRIP_USAGE}`)
        process.exit(1)
    }
    const playwright = loadPlaywright()
    if (!playwright) {
        console.error(
            "motion-ai filmstrip needs Playwright.\n\n  npm i -D playwright && npx playwright install chromium"
        )
        process.exit(1)
    }

    const action = options.click ?? options.hover
    const browser = await playwright.chromium.launch()
    try {
        const page = await browser.newPage({
            viewport: { width: options.width, height: options.height },
        })
        await page.addInitScript({ path: INSPECTOR_PATH })
        // Freeze the page's entrance animations from their first frame
        if (!action) await page.addInitScript("MotionInspector.pause()")

        await page.goto(options.url, { waitUntil: "load" })

        if (options.click || options.hover) {
            const selector = (options.click ?? options.hover)!
            await page.waitForSelector(selector)
            await waitForRest(page)
            await page.evaluate("MotionInspector.mark(); MotionInspector.pause()")
            if (options.click) await page.click(selector)
            else await page.hover(selector)
        }

        await waitForAnimations(page)
        const duration: number =
            options.duration ??
            Math.min(await page.evaluate("MotionInspector.duration()"), 10)
        const animations = await page.evaluate("MotionInspector.list()")

        const errors: string[] = await page.evaluate("MotionInspector.errors")
        if (errors.length) {
            console.error(`The inspector couldn't read some animations:\n  ${errors.join("\n  ")}`)
        }

        if (!animations.length) {
            console.error(
                "No Motion animations started within 3s. The page needs motion, framer-motion or motion/mini 14.0 or later."
            )
            process.exit(1)
        }

        const times = Array.from(
            { length: options.frames },
            (_, i) => (duration * i) / (options.frames - 1)
        )

        // Crop to everywhere the selected element goes
        let clip: Box | null = null
        if (options.selector) {
            for (const time of times) {
                await page.evaluate(`MotionInspector.seek(${time})`)
                const box = await page.locator(options.selector).first().boundingBox()
                if (box) clip = union(clip, box)
            }
        }

        mkdirSync(options.out, { recursive: true })
        const frames: { file: string; time: number }[] = []
        for (const [i, time] of times.entries()) {
            await page.evaluate(`MotionInspector.seek(${time})`)
            const file = join(options.out, `frame-${String(i).padStart(2, "0")}.png`)
            await page.screenshot({ path: file, ...(clip && { clip }) })
            frames.push({ file, time })
        }

        const sheet = await browser.newPage({ viewport: { width: 1200, height: 400 } })
        await sheet.setContent(contactSheet(frames))
        const sheetFile = join(options.out, "filmstrip.png")
        await sheet.screenshot({ path: sheetFile, fullPage: true })

        writeFileSync(
            join(options.out, "timeline.json"),
            JSON.stringify(
                {
                    url: options.url,
                    action: options.click
                        ? { click: options.click }
                        : options.hover
                        ? { hover: options.hover }
                        : "load",
                    duration,
                    frames: frames.map(({ file, time }) => ({ time, file })),
                    animations,
                },
                null,
                2
            )
        )

        console.log(
            `Captured ${frames.length} frames of ${animations.length} animation(s) over ${duration.toFixed(3)}s.\n\n  ${sheetFile}\n  ${join(options.out, "timeline.json")}`
        )
    } finally {
        await browser.close()
    }
}
