import { motion } from "motion/react"

export function Hero() {
  return (
    <motion.img
      src="/hero.jpg"
      alt="A sunlit living room"
      initial={{ filter: "blur(12px)" }}
      animate={{ filter: "blur(0px)" }}
      transition={{ duration: 0.8 }}
      style={{ width: "100%", height: 480, objectFit: "cover" }}
    />
  )
}
