import { mkdirSync, readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { join } from "node:path"

/**
 * Frame capture shared by the commands that render a page frame by frame.
 * They differ only in how they move the page to a time: the filmstrip seeks
 * Motion's animations with the inspector, the video command steps Motion's
 * manual clock with processFrame().
 */

export interface Box {
    x: number
    y: number
    width: number
    height: number
}

export interface Frame {
    file: string
    time: number
}

/**
 * Playwright is optional: use the project's own copy, falling back to one
 * next to motion-ai or on NODE_PATH.
 */
export function loadPlaywright() {
    for (const from of [join(process.cwd(), "package.json"), import.meta.url]) {
        for (const name of ["playwright", "@playwright/test", "playwright-core"]) {
            try {
                return createRequire(from)(name)
            } catch {}
        }
    }
    return null
}

/**
 * Digits in frame file names: at least two, more for long captures, so the
 * files sort in order and ffmpeg can read them as a sequence.
 */
export const frameDigits = (count: number) => Math.max(2, String(count - 1).length)

/**
 * Move the page to each time, in seconds, and screenshot it.
 */
export async function captureFrames(
    page: any,
    times: number[],
    out: string,
    { seek, clip }: { seek: (time: number) => Promise<unknown>; clip?: Box | null }
): Promise<Frame[]> {
    mkdirSync(out, { recursive: true })
    const frames: Frame[] = []
    const digits = frameDigits(times.length)
    for (const [i, time] of times.entries()) {
        await seek(time)
        const file = join(out, `frame-${String(i).padStart(digits, "0")}.png`)
        await page.screenshot({ path: file, ...(clip && { clip }) })
        frames.push({ file, time })
    }
    return frames
}

function contactSheet(frames: Frame[]) {
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

/**
 * Lay the frames side by side, labelled with their time, in one image an
 * agent can read at once.
 */
export async function writeContactSheet(browser: any, frames: Frame[], file: string) {
    const sheet = await browser.newPage({ viewport: { width: 1200, height: 400 } })
    await sheet.setContent(contactSheet(frames))
    await sheet.screenshot({ path: file, fullPage: true })
    await sheet.close()
}
