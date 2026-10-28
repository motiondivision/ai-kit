import { useEffect } from "react"

export const duration = 0.2
export const width = 320
export const height = 180

export function Video() {
    useEffect(() => {
        setTimeout(() => {
            throw new Error("Video broke")
        })
    }, [])
    return <div style={{ position: "absolute", inset: 0, background: "#fff" }} />
}
