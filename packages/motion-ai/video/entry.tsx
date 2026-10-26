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

const root = createRoot(container)
flushSync(() => root.render(<Video />))

;(window as any).__frame = (ms: number) => processFrame(ms)
;(window as any).__video = { duration, width, height, fps }
