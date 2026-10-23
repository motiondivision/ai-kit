import { motion } from "motion/react"

export function Menu() {
  return (
    <motion.ul initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <li>Shop</li>
      <li>About</li>
    </motion.ul>
  )
}
