import { motion } from "motion/react"
import { useState } from "react"

const TABS = ["Details", "Reviews"]

export function Tabs() {
  const [index, setIndex] = useState(0)
  return (
    <div style={{ position: "relative", display: "flex" }}>
      {TABS.map((tab, i) => (
        <button key={tab} onClick={() => setIndex(i)} style={{ width: 120 }}>
          {tab}
        </button>
      ))}
      <motion.span
        animate={{ x: index * 120 }}
        style={{ position: "absolute", bottom: 0, left: 0, width: 120, height: 2, background: "black" }}
      />
    </div>
  )
}
