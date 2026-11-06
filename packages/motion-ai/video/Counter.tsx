import { cancelFrame, frame } from "motion"
import { useEffect, useRef, type CSSProperties } from "react"

const defaultFormat = (value: number) => Math.round(value).toLocaleString("en-US")

/**
 * A number that counts. Animate the element's `--value` CSS variable in the
 * sequence (`[".score", { "--value": [0, 980] }, { at: 2 }]`) and this
 * writes the text each frame. Define `format` outside the component.
 */
export function Counter({
    className,
    format = defaultFormat,
    style,
}: {
    className: string
    format?: (value: number) => string
    style?: CSSProperties
}) {
    const ref = useRef<HTMLSpanElement>(null)

    useEffect(() => {
        let last = ""
        const render = () => {
            const element = ref.current
            if (!element) return
            const text = format(Number(element.style.getPropertyValue("--value")) || 0)
            if (text !== last) element.textContent = last = text
        }
        frame.render(render, true)
        return () => cancelFrame(render)
    }, [format])

    return <span ref={ref} className={className} style={{ fontVariantNumeric: "tabular-nums", ...style }} />
}
