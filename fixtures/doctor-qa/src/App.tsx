import { useState } from "react"
import { Button } from "./components/Button"
import { Drawer } from "./components/Drawer"
import { Hero } from "./components/Hero"
import { Menu } from "./components/Menu"
import { Parallax } from "./components/Parallax"
import { ProductCard } from "./components/ProductCard"
import { Tabs } from "./components/Tabs"
import { Toast } from "./components/Toast"

export function App() {
  const [open, setOpen] = useState(false)
  const [toast, setToast] = useState(false)
  return (
    <main>
      <Hero />
      <Menu />
      <Tabs />
      <Button onClick={() => setOpen(!open)}>Basket</Button>
      <Button onClick={() => setToast(true)}>Add to basket</Button>
      <Drawer open={open} />
      {toast && <Toast message="Added to your basket" />}
      <ProductCard title="Lamp" price="£40" />
      <Parallax />
    </main>
  )
}
