---
name: upgrade
description: "Upgrade Motion or migrate to it: framer-motion to motion, one Motion version to the next, or GSAP to Motion. Use when the user asks to upgrade, migrate or move between animation library versions."
---

# Upgrade Motion

"Upgrade Motion", "migrate from framer-motion", "upgrade to Motion 12" and
similar all resolve through documentation search. There is no separate tool.

1. **Read the installed version first.** Check `package.json` for `motion`,
   `framer-motion` or `motion-v` before searching. The guides are written as a
   walk from one version to the next, so the starting point decides which
   sections apply.
2. Call `search-motion-docs` for `upgrade` on the project's platform. For
   React that resolves to `react/react-upgrade-guide`, which includes the
   `## Framer Motion` section and its own version history. For vanilla JS it
   is `js/upgrade-guide`. Coming from GSAP, search `migrate from gsap`.
3. **Read the whole page and follow it in order. Do not summarise it.** Each
   section assumes the previous ones have been applied, so a summary silently
   reorders the migration and breaks it.
4. Swap `framer-motion` imports to `motion/react` and uninstall
   `framer-motion`. They must never both be installed.
