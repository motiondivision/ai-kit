import { motion } from "motion/react"
import type { ReactNode } from "react"

export function Button({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <motion.button whileTap={{ scale: 0.96 }} onClick={onClick}>
      {children}
    </motion.button>
  )
}
