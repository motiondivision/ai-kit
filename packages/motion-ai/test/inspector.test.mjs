import assert from "node:assert/strict"
import { after, before, beforeEach, describe, test } from "node:test"
import { fileURLToPath } from "node:url"
import { createRequire } from "node:module"
import { serve } from "./server.mjs"

// Playwright is resolved like the CLI resolves it, so a global install works
const { chromium } = createRequire(import.meta.url)("playwright")

const inspector = fileURLToPath(
    new URL("../inspector/motion-inspector.js", import.meta.url)
)

let server, browser, page

const close = (actual, expected, tolerance, message) =>
    assert.ok(
        Math.abs(actual - expected) <= tolerance,
        `${message}: expected ${expected} ± ${tolerance}, got ${actual}`
    )

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

describe("motion inspector", () => {
    before(async () => {
        server = await serve()
        browser = await chromium.launch()
    })

    after(async () => {
        await browser?.close()
        await server?.close()
    })

    beforeEach(async () => {
        await page?.close()
        page = await browser.newPage()
        await page.addInitScript({ path: inspector })
        await page.goto(`${server.url}/vanilla.html`)
    })

    test("lists Motion's browser and JS animations with their targets and timing", async () => {
        await page.evaluate(() => window.start())
        await wait(50)
        const list = await page.evaluate(() => MotionInspector.list())

        const opacity = list.find((a) => a.property === "opacity")
        assert.ok(opacity, "opacity animation listed")
        assert.equal(opacity.target, "div#box.box")
        assert.deepEqual(opacity.keyframes, [0, 1])
        assert.equal(opacity.duration, 1)
        assert.equal(opacity.engine, "waapi")

        const x = list.find((a) => a.property === "x")
        assert.ok(x, "x animation listed")
        assert.equal(x.target, "div#box.box")

        const progress = list.find((a) => a.target === null)
        assert.ok(progress, "motion value animation listed")
        assert.equal(progress.engine, "js")
        assert.equal(progress.duration, 2)

        // Every entry is plain data an agent can read
        assert.doesNotThrow(() => JSON.stringify(list))
    })

    test("pauses every animation and seeks them on one timeline", async () => {
        await page.evaluate(() => window.start())
        await wait(50)
        await page.evaluate(() => MotionInspector.pause())
        await page.evaluate(() => MotionInspector.seek(0.5))

        close(await page.evaluate(() => opacityOf("#box")), 0.5, 0.02, "opacity")
        close(await page.evaluate(() => translateXOf("#box")), 50, 1, "x")
        close(await page.evaluate(() => progress.get()), 25, 0.5, "progress")

        // And back again
        await page.evaluate(() => MotionInspector.seek(0.25))
        close(await page.evaluate(() => opacityOf("#box")), 0.25, 0.02, "opacity")
        close(await page.evaluate(() => progress.get()), 12.5, 0.5, "progress")

        // Paused means paused: the page doesn't move on its own
        await wait(300)
        close(await page.evaluate(() => opacityOf("#box")), 0.25, 0.02, "opacity")
    })

    test("freezes animations that start while paused, then plays them", async () => {
        await page.evaluate(() => MotionInspector.pause())
        await page.evaluate(() => window.start())
        await wait(300)
        close(await page.evaluate(() => opacityOf("#box")), 0, 0.02, "frozen")

        await page.evaluate(() => MotionInspector.seek(0.9))
        close(await page.evaluate(() => opacityOf("#box")), 0.9, 0.02, "seeked")

        await page.evaluate(() => MotionInspector.play())
        await wait(1500)
        close(await page.evaluate(() => opacityOf("#box")), 1, 0, "finished")
        close(await page.evaluate(() => progress.get()), 100, 0, "finished")
    })

    test("places a delayed animation on the timeline from its start", async () => {
        await page.evaluate(() => MotionInspector.pause())
        await page.evaluate(() => window.startDelayed())
        await wait(50)
        close(await page.evaluate(() => MotionInspector.duration()), 1.5, 0.05, "duration")

        await page.evaluate(() => MotionInspector.seek(0.25))
        close(await page.evaluate(() => opacityOf("#other")), 0, 0.02, "in delay")
        await page.evaluate(() => MotionInspector.seek(1))
        close(await page.evaluate(() => opacityOf("#other")), 0.5, 0.02, "after delay")
    })

    test("shows an interrupted animation until the one that replaced it starts", async () => {
        await page.evaluate(() => MotionInspector.pause())
        await page.evaluate(() => {
            const linear = { duration: 1, ease: "linear" }
            window.mv = Motion.motionValue(0)
            Motion.animate("#box", { opacity: [0, 1] }, linear)
            Motion.animate(mv, [0, 100], linear)
        })
        await wait(250)
        await page.evaluate(() => {
            const linear = { duration: 1, ease: "linear" }
            Motion.animate("#box", { opacity: [1, 0.5] }, linear)
            Motion.animate(mv, [100, 50], linear)
        })
        await wait(50)

        const list = await page.evaluate(() => MotionInspector.list())
        const second = list.filter((a) => a.property === "opacity")[1]
        assert.ok(second.start >= 0.2, `second starts later, at ${second.start}`)

        await page.evaluate(() => MotionInspector.seek(0.1))
        close(await page.evaluate(() => opacityOf("#box")), 0.1, 0.02, "first opacity")
        close(await page.evaluate(() => mv.get()), 10, 0.5, "first value")

        await page.evaluate((t) => MotionInspector.seek(t), second.start + 0.5)
        close(await page.evaluate(() => opacityOf("#box")), 0.75, 0.02, "second opacity")
        close(await page.evaluate(() => mv.get()), 75, 0.5, "second value")
    })

    test("mark() starts a new timeline and forgets earlier animations", async () => {
        await page.evaluate(() => window.start())
        await wait(1200)
        await page.evaluate(() => MotionInspector.mark())
        assert.equal((await page.evaluate(() => MotionInspector.list())).length, 0)

        await page.evaluate(() => MotionInspector.pause())
        await page.click("#go")
        await wait(50)
        const list = await page.evaluate(() => MotionInspector.list())
        assert.equal(list.length, 1)
        assert.equal(list[0].property, "opacity")
        close(list[0].start, 0, 0.001, "start")

        await page.evaluate(() => MotionInspector.seek(0.5))
        close(await page.evaluate(() => opacityOf("#box")), 0.6, 0.02, "opacity")
    })

    test("play() puts back finished animations it seeked, delayed ones included", async () => {
        await page.evaluate(() => {
            const options = { delay: 0.5, duration: 0.5, ease: "linear" }
            window.mv = Motion.motionValue(0)
            Motion.animate(mv, [0, 100], options)
            Motion.animate("#box", { x: [0, 100] }, options)
        })
        await wait(1200)
        await page.evaluate(() => MotionInspector.seek(0.75))
        close(await page.evaluate(() => mv.get()), 50, 1, "seeked value")
        close(await page.evaluate(() => translateXOf("#box")), 50, 1, "seeked x")

        await page.evaluate(() => MotionInspector.play())
        await wait(100)
        close(await page.evaluate(() => mv.get()), 100, 0, "restored value")
        close(await page.evaluate(() => translateXOf("#box")), 100, 0, "restored x")
    })

    test("play() puts back the animation that replaced another", async () => {
        await page.evaluate(() => {
            window.mv = Motion.motionValue(0)
            Motion.animate(mv, [0, 100], { duration: 0.3, ease: "linear" })
        })
        await wait(400)
        await page.evaluate(() => {
            Motion.animate(mv, [100, 200], { duration: 0.3, ease: "linear" })
        })
        await wait(400)
        await page.evaluate(() => MotionInspector.seek(0.1))
        close(await page.evaluate(() => mv.get()), 33.3, 1, "first animation")

        await page.evaluate(() => MotionInspector.play())
        await wait(100)
        close(await page.evaluate(() => mv.get()), 200, 0, "restored")
    })

    test("an animation seeked past its end completes on play() rather than replaying", async () => {
        await page.evaluate(() => MotionInspector.pause())
        await page.evaluate(() => {
            window.completed = 0
            Motion.animate(
                "#box",
                { opacity: [0, 1] },
                { duration: 1, ease: "linear", onComplete: () => completed++ }
            )
        })
        await wait(50)
        await page.evaluate(() => MotionInspector.seek(1.5))
        await page.evaluate(() => MotionInspector.play())
        await wait(150)
        close(await page.evaluate(() => opacityOf("#box")), 1, 0, "still at its end")
        await wait(1200)
        assert.equal(await page.evaluate(() => completed), 1)
    })

    test("pause() after mark() still pauses animations that started before it", async () => {
        await page.evaluate(() => {
            Motion.animate(
                "#other",
                { opacity: [0, 1] },
                { duration: 1, repeat: Infinity, ease: "linear" }
            )
        })
        await wait(100)
        await page.evaluate(() => {
            MotionInspector.mark()
            MotionInspector.pause()
        })
        // A WAAPI animation pauses on its next frame
        await wait(50)
        const before = await page.evaluate(() => opacityOf("#other"))
        await wait(300)
        close(await page.evaluate(() => opacityOf("#other")), before, 0.01, "held")
    })

    test("the timeline includes repeat delays", async () => {
        await page.evaluate(() => MotionInspector.pause())
        await page.evaluate(() => {
            Motion.animate(
                "#box",
                { opacity: [0, 1] },
                { duration: 0.5, repeat: 2, repeatDelay: 0.5 }
            )
        })
        await wait(50)
        close(await page.evaluate(() => MotionInspector.duration()), 2.5, 0.01, "duration")
    })

    test("play() puts back a stopped animation that only calls onUpdate", async () => {
        await page.evaluate(() => {
            window.latest = 0
            window.stopped = Motion.animate(0, 100, {
                duration: 1,
                ease: "linear",
                onUpdate: (v) => (latest = v),
            })
        })
        await wait(500)
        const before = await page.evaluate(() => {
            stopped.stop()
            return latest
        })
        await page.evaluate(() => MotionInspector.seek(0.1))
        close(await page.evaluate(() => latest), 10, 1, "seeked")
        await page.evaluate(() => MotionInspector.play())
        await wait(100)
        close(await page.evaluate(() => latest), before, 0.5, "restored")
    })

    test("calls a hook that was already installed", async () => {
        const other = await browser.newPage()
        await other.addInitScript(() => {
            window.seen = 0
            globalThis.__MOTION_INSPECT__ = () => window.seen++
        })
        await other.addInitScript({ path: inspector })
        await other.goto(`${server.url}/vanilla.html`)
        await other.evaluate(() => window.start())
        await wait(50)
        assert.ok((await other.evaluate(() => window.seen)) >= 2)
        assert.ok((await other.evaluate(() => MotionInspector.list().length)) >= 2)
        await other.close()
    })
})

describe("motion inspector with motion/react", () => {
    before(async () => {
        server = await serve()
        browser = await chromium.launch()
    })

    after(async () => {
        await browser?.close()
        await server?.close()
    })

    beforeEach(async () => {
        await page?.close()
        page = await browser.newPage()
        await page.addInitScript({ path: inspector })
        await page.goto(`${server.url}/react.html`)
        await page.waitForSelector("#slider")
    })

    test("seeks a layout animation", async () => {
        await page.evaluate(() => MotionInspector.pause())
        await page.click("#move")
        await wait(100)

        const list = await page.evaluate(() => MotionInspector.list())
        const layout = list.find((a) => a.kind === "layout")
        assert.ok(layout, "layout animation listed")
        assert.equal(layout.target, "div#slider.box")

        await page.evaluate((t) => MotionInspector.seek(t), layout.start + 0.5)
        close(await page.evaluate(() => leftOf("#slider")), 200, 2, "halfway")

        await page.evaluate((t) => MotionInspector.seek(t), layout.start + 0.25)
        close(await page.evaluate(() => leftOf("#slider")), 100, 2, "a quarter")

        await page.evaluate(() => MotionInspector.play())
        await wait(1200)
        close(await page.evaluate(() => leftOf("#slider")), 400, 0, "finished")
    })

    test("play() puts a finished layout animation back at its end", async () => {
        await page.click("#move")
        await wait(1200)
        // Seeking one that has finished isn't supported, but it must recover
        await page.evaluate(() => MotionInspector.seek(0.3))
        await page.evaluate(() => MotionInspector.play())
        await wait(100)
        close(await page.evaluate(() => leftOf("#slider")), 400, 0, "restored")
    })

    test("lists accelerated independent transforms as browser animations", async () => {
        await page.click("#shift")
        await wait(100)
        // The last: the first ran as the element mounted
        const x = (await page.evaluate(() => MotionInspector.list())).findLast(
            (a) => a.target === "div#shifter.box" && a.property === "x"
        )
        assert.ok(x, "x animation listed")
        assert.equal(x.engine, "waapi")
    })

    test("seeks an exit animation, and AnimatePresence removes it after play()", async () => {
        await page.evaluate(() => MotionInspector.pause())
        await page.click("#hide")
        await wait(100)

        const exit = (await page.evaluate(() => MotionInspector.list())).find(
            (a) => a.target === "div#toast.box"
        )
        assert.ok(exit, "exit animation listed")
        assert.equal(exit.property, "opacity")

        await page.evaluate((t) => MotionInspector.seek(t), exit.start + 0.5)
        close(await page.evaluate(() => opacityOf("#toast")), 0.5, 0.02, "halfway")

        await page.evaluate(() => MotionInspector.play())
        await page.waitForSelector("#toast", { state: "detached", timeout: 2000 })
    })
})

