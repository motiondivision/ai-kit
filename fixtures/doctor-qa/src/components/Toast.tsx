import { motion } from "motion/react"

export function Toast({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ top: -64 }}
      animate={{ top: 24 }}
      style={{ position: "fixed", right: 24 }}
      role="status"
    >
      {message}
    </motion.div>
  )
}
