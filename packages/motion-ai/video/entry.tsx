// Mounts the video on Motion's manual clock. `motion-ai video` calls __frame(ms)
// once per frame, which runs one Motion frame at exactly that time.
import { flushSync } from "react-dom"
import { createRoot } from "react-dom/client"
import { MotionGlobalConfig, processFrame } from "motion"
import * as source from "@motion-ai/video-source"

if (typeof processFrame !== "function") {
    throw new Error("Motion video needs motion 14.6 or later: npm install motion@latest")
}

const { Video, duration, width = 1280, height = 720, fps = 30 } = source as any
if (typeof Video !== "function" || typeof duration !== "number") {
    throw new Error("The video file must export Video (a component) and duration (seconds)")
}

MotionGlobalConfig.useManualTiming = true
processFrame(0)

const container = document.getElementById("root")!
container.style.width = width + "px"
container.style.height = height + "px"

const mount = () => {
    const root = createRoot(container)
    flushSync(() => root.render(<Video />))
    return root
}

/** Fonts and images the video uses, loaded and decoded. */
const assets = () =>
    Promise.all([
        document.fonts.ready,
        ...Array.from(document.images, (image) => image.decode().catch(() => {})),
    ])

// Mount once to request every font and image, then mount again once they
// have loaded, so layout measured on mount sees the right fonts, and wait
// for the images again so the first frame shows them. Time stays at 0
// throughout.
const boot = async () => {
    await assets()
    mount().unmount()
    container.textContent = ""
    await assets()
    // Errors before this point came from the warm-up mount, as assets loaded
    console.debug("motion-ai:mount")
    mount()
    // Fonts stay loaded across mounts, but each new image decodes again
    await assets()
    ;(window as any).__frame = (ms: number) => processFrame(ms)
    ;(window as any).__video = { duration, width, height, fps }
}

// The renderer reads the size, resizes the window and reloads, so the video
// never mounts at the wrong size
if (innerWidth === width && innerHeight === height) boot()
else (window as any).__video = { duration, width, height, fps, resize: true }
