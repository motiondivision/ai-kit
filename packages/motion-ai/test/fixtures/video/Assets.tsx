import { useEffect, useRef } from "react"
import dot from "./dot.png"
import "./assets.css"

export const duration = 0.2
export const width = 320
export const height = 180

// Fails if the stylesheet isn't applied when the video mounts. The test
// checks the first frame shows the image.
export function Video() {
    const styled = useRef<HTMLDivElement>(null)
    useEffect(() => {
        if (getComputedStyle(styled.current!).color !== "rgb(255, 0, 0)") {
            setTimeout(() => {
                throw new Error("stylesheet not applied")
            })
        }
    }, [])
    return (
        <div style={{ position: "absolute", inset: 0, background: "#fff" }}>
            <img src={dot} style={{ display: "block", width: 64, height: 64 }} />
            <div ref={styled} className="styled">Styled</div>
        </div>
    )
}
