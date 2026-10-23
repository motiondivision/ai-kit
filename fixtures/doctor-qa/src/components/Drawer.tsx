import { motion } from "motion/react"

export function Drawer({ open }: { open: boolean }) {
  return (
    <motion.aside
      animate={{ width: open ? 320 : 0 }}
      transition={{ type: "spring", visualDuration: 0.3, bounce: 0 }}
      style={{ position: "fixed", top: 0, bottom: 0, left: 0, overflow: "hidden" }}
    >
      <nav>Basket</nav>
    </motion.aside>
  )
}
