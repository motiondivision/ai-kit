import { useState } from "react"

export const duration = 0.2
export const width = 1920
export const height = 1080

// Measures the viewport once, as layout code often does on mount
export function Video() {
    const [measured] = useState(() => [window.innerWidth, window.innerHeight])
    if (measured[0] !== width || measured[1] !== height) {
        setTimeout(() => {
            throw new Error(`Mounted at ${measured[0]}x${measured[1]}, not ${width}x${height}`)
        })
    }
    return <div style={{ position: "absolute", inset: 0, background: "#fff" }} />
}
