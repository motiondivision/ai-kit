import { useEffect, useRef } from "react"

const CARDS = ["Spring", "Summer", "Autumn", "Winter"]

export function Parallax() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onScroll = () => {
      const cards = ref.current?.querySelectorAll<HTMLElement>(".card") ?? []
      cards.forEach((card) => {
        const top = card.getBoundingClientRect().top
        card.style.transform = `translateY(${top / 10}px)`
      })
    }
    window.addEventListener("scroll", onScroll)
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <div ref={ref}>
      {CARDS.map((name) => (
        <div key={name} className="card">
          {name}
        </div>
      ))}
    </div>
  )
}
