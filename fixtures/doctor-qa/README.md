# Performance Doctor QA fixture

A small React app with five planted animation performance problems, so a
Performance Doctor audit finds the same findings on every host.

| File | Problem | Grade | Fix reaches |
| --- | --- | --- | --- |
| `src/components/Parallax.tsx` | Reads layout, then writes a transform, per card in a scroll handler | F | A |
| `src/components/Drawer.tsx` | Animates `width` | D | S |
| `src/components/Toast.tsx` | Animates `top` | D | S |
| `src/components/ProductCard.tsx` | Animates `box-shadow` on hover | C | S |
| `src/components/Hero.tsx` | Animates `filter: blur()` | C | S |

`Menu.tsx`, `Tabs.tsx` and `Button.tsx` already pass at S.

Use it with a prompt such as "Audit src for animation performance". Reset it
between runs with `git checkout -- fixtures/doctor-qa`.
