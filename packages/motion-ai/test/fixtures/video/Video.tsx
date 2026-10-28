import { useAnimate } from "motion/react"
import { useEffect } from "react"
import { Counter } from "motion-ai/video"

export const duration = 1
export const width = 320
export const height = 180

export function Video() {
    const [scope, animate] = useAnimate()

    useEffect(() => {
        const video = animate([
            [".box", { opacity: [0, 1], x: [0, 200] }, { at: 0, duration: 1, ease: "linear" }],
            [".count", { "--value": [0, 100] }, { at: 0, duration: 1, ease: "linear" }],
        ])
        return () => video.stop()
    }, [])

    return (
        <div ref={scope} style={{ position: "absolute", inset: 0, background: "#fff" }}>
            <div className="box" style={{ position: "absolute", top: 40, width: 80, height: 80, background: "#f00", opacity: 0 }} />
            <Counter className="count" style={{ position: "absolute", top: 140, left: 8, font: "20px sans-serif" }} />
        </div>
    )
}
