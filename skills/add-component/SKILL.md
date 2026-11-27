---
name: add-component
description: "Add a ready-made animated component or section from Motion's library: carousel, accordion, tabs, marquee, ticker, pricing, hero, testimonials, navigation and more. Use when the user asks to add, insert, make or build one of these. For modals and dialogs use the modal skill instead."
---

# Insert panel: adding a Motion component

When the user asks to add, insert, make or build something animated, open
Motion's insert panel rather than choosing for them. The panel shows Motion's
library of Motion UI components and sections and examples, with live previews
and MotionScore grades, opened on what they asked for. The user picks one, and
the pick arrives as a new message that names what to add and where its source
is.

## Which tool

Use the insert tool you have. **Prefer the Motion+ one when it is there.**

-   `insert-motion-plus-component` (Motion+ members): every item is open, and
    each pick reads paste-ready source.
-   `insert-motion-component` (everyone else): free examples are open.
    Motion+ items show as locked, with a link to https://motion.dev/plus.

```
insert-motion-plus-component({ platform, query })
insert-motion-component({ platform, query })
```

-   **platform** (required): exactly one of `"js"`, `"react"`, `"vue"`, from
    the project's package.json.
-   **query**: the subject of the request. Leave it out when the user named
    nothing.

| Request                                       | query         |
| --------------------------------------------- | ------------- |
| "/motion make accordion", "build an accordion" | `"accordion"` |
| "add a pricing section"                        | `"pricing"`   |
| "/motion insert", "/motion add"                | leave it out  |

Search the thing, not the word "animation": `carousel`, `drag`, `hero`.

## After the call

-   **In a host that shows the panel** (Claude, ChatGPT, Cursor 2.6 and
    later, VS Code), say one line, such as "Pick one from the panel," and stop.
    Do not choose for the user or start building before the pick arrives.
-   **When the pick arrives**, read the resource it names and build from it,
    following "Implement" in the `docs` skill (`skill://motion/docs/SKILL.md`). For Motion UI,
    paste and adapt every file.
-   **In a host without MCP Apps** (most terminals), nothing renders. The text
    of the result lists the matches as resource_links, like a search. With a
    query, offer the best few matches by name and ask which to add, or build
    from the best match when the request was specific. Without a query, ask
    what to build, then call the tool again with it.
-   **A locked pick** (Motion server, no Motion+): follow "When source is
    unavailable" in the `docs` skill (`skill://motion/docs/SKILL.md`). Do not reconstruct it
    from its description.

## When not to use it

-   Questions about an API or an option ("what does `layout` do"): use
    `search-motion-docs`.
-   Animating something that already exists in the project ("fade this modal
    in"): use the `animate` skill (`skill://motion/animate/SKILL.md`).
-   The user named an exact Motion+ example or section and wants its source:
    `search-motion-source` gets it without a pick.
