import assert from "node:assert/strict"
import { execFile } from "node:child_process"
import { mkdtempSync, readFileSync, readdirSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { after, before, describe, test } from "node:test"
import { fileURLToPath } from "node:url"
import { promisify } from "node:util"
import { serve } from "./server.mjs"

const cli = fileURLToPath(new URL("../dist/cli.js", import.meta.url))
const run = (...args) => promisify(execFile)("node", [cli, "filmstrip", ...args])

let server

describe("motion-ai filmstrip", () => {
    before(async () => {
        server = await serve()
    })

    after(() => server?.close())

    test("captures a page's entrance animations from their first frame", async () => {
        const out = mkdtempSync(join(tmpdir(), "filmstrip-"))
        await run(`${server.url}/entrance.html`, "--frames", "3", "--out", out)

        assert.deepEqual(readdirSync(out).sort(), [
            "filmstrip.png",
            "frame-00.png",
            "frame-01.png",
            "frame-02.png",
            "timeline.json",
        ])

        const timeline = JSON.parse(readFileSync(join(out, "timeline.json"), "utf8"))
        assert.equal(timeline.action, "load")
        assert.equal(timeline.duration, 0.5)
        assert.deepEqual(
            timeline.frames.map((frame) => frame.time),
            [0, 0.25, 0.5]
        )
        assert.ok(timeline.animations.some((a) => a.property === "opacity"))

        // Each frame shows the box somewhere else
        const frames = [0, 1, 2].map((i) =>
            readFileSync(join(out, `frame-0${i}.png`)).toString("base64")
        )
        assert.equal(new Set(frames).size, 3)
    })

    test("captures what an interaction animates, cropped to an element", async () => {
        const out = mkdtempSync(join(tmpdir(), "filmstrip-"))
        const { stdout } = await run(
            `${server.url}/react.html`,
            "--click",
            "#move",
            "--selector",
            "#slider",
            "--frames",
            "5",
            "--out",
            out
        )
        assert.match(stdout, /Captured 5 frames/)

        const timeline = JSON.parse(readFileSync(join(out, "timeline.json"), "utf8"))
        assert.deepEqual(timeline.action, { click: "#move" })
        const layout = timeline.animations.find((a) => a.kind === "layout")
        assert.ok(layout, "layout animation captured")
        assert.equal(layout.target, "div#slider.box")

        // Cropped to the 500px the slider travels, not the whole viewport
        const png = readFileSync(join(out, "frame-00.png"))
        assert.equal(png.readUInt32BE(16), 500)
        assert.equal(png.readUInt32BE(20), 100)
    })

    test("fails clearly on a page without Motion animations", async () => {
        await assert.rejects(
            run(`${server.url}/vanilla.html`, "--out", mkdtempSync(join(tmpdir(), "filmstrip-"))),
            (error) => /No Motion animations started/.test(error.stderr)
        )
    })
})
