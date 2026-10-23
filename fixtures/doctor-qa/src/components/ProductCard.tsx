import { motion } from "motion/react"

export function ProductCard({ title, price }: { title: string; price: string }) {
  return (
    <motion.article
      initial={{ boxShadow: "0 2px 8px #0001" }}
      whileHover={{ boxShadow: "0 16px 40px #0003" }}
      style={{ padding: 24, borderRadius: 12 }}
    >
      <h3>{title}</h3>
      <p>{price}</p>
    </motion.article>
  )
}
