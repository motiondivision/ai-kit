# Making videos with Motion

Use this for "make a video", "launch video", "product demo clip", "render this
animation to MP4" and similar.

You write a React component, and `npx motion-ai video` turns it into an MP4.
It drives Motion on a manual clock with `processFrame()`, one frame at a time,
so every spring, stagger and value lands exactly on the frame. Rendering runs
on the user's machine.

You write the **whole video as one Motion sequence**: one `animate([...])` call
from `useAnimate()`. Every beat is a segment with an absolute start time `at`,
in seconds. A timeline editor can show and edit a sequence later, so keep it
readable: one segment per beat, literal numbers, no helper functions that build
segments.

## Setup

1. Install what the renderer needs, with the project's package manager:

    ```
    npm install motion@latest react react-dom
    npm install -D esbuild playwright
    npx playwright install chromium
    ```

    `motion` must be 14.6 or later. Rendering an MP4 also needs `ffmpeg` on
    the path. If it is missing, ask the user to install it.

2. Write `motion-video/Video.tsx`.
3. Add `motion-video/out/` to `.gitignore`.

## Files and commands

-   `motion-video/Video.tsx`: export `Video` and `duration` (seconds). Optional:
    `width` and `height` (default 1280 and 720) and `fps` (default 30). Use
    1080 by 1920 for a vertical video.
-   `npx motion-ai video sheet <from> <to> [step]`: one image with a labelled
    grid of frames (default step 0.1 s), in `motion-video/out/`. Use this to
    check transitions.
-   `npx motion-ai video stills 0.5 2 4.2`: full-size frames. Use these only
    for detail checks.
-   `npx motion-ai video render`: writes `motion-video/out/video.mp4`. It
    prints page errors.
-   Add `--video <file>` to render another file, and `--out <dir>` to write
    somewhere else.

## Work plan

1. Read the request. Write down the time of every beat. Copy all text from the
   request exactly, as constants.
2. Plan the layout for each state (positions of every item before and after
   each beat) as plain numbers.
3. Build the whole video in one pass.
4. Check. This step is required, every time, before you render:
    1. `sheet 0 <duration> 0.5` (the whole video).
    2. A sheet for **every beat that moves, swaps, inserts, exits or hands
       over** (`sheet <beat> <beat + 0.8> 0.1`). At least two transition
       sheets.
    3. Look at every sheet image and go through the QA list below for each
       one. Write down each problem you find.
    4. Fix every problem, then run the sheets you fixed again. Repeat until a
       sheet shows none of the QA problems. At most 6 sheets in total.
5. `render` once. Tell the user where the MP4 is.

## The sequence

```tsx
import { stagger, useAnimate } from "motion/react"
import { useEffect } from "react"
import { Counter } from "motion-ai/video"

export const duration = 6

export function Video() {
    const [scope, animate] = useAnimate()

    useEffect(() => {
        const video = animate([
            [".logo", { scale: [0, 1] }, { at: 0.2, type: "spring", bounce: 0.45, visualDuration: 0.6 }],
            [".word", { opacity: [0, 1], y: [32, 0] }, { at: 1.0, duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: stagger(0.09) }],
            [".score", { "--value": [0, 980] }, { at: 2.0, duration: 1.2, ease: "easeOut" }],
            [".row-2", { y: [160, 0] }, { at: 2.0, duration: 0.6, ease: [0.65, 0, 0.35, 1] }],
            [".pill", { scale: [1, 0.93, 1] }, { at: 4.5, duration: 0.25 }],
        ])
        return () => video.stop()
    }, [])

    return (
        <div ref={scope} style={{ position: "absolute", inset: 0 }}>
            <div className="logo" style={{ transform: "scale(0)" }} />
            {WORDS.map((w) => <span key={w} className="word" style={{ display: "inline-block", opacity: 0 }}>{w}</span>)}
            <Counter className="score" />
            ...
        </div>
    )
}
```

-   One `useEffect`, one `animate([...])` call, stopped in the cleanup. Nothing
    else animates: no `motion.div` props (`animate`, `initial`, `exit`,
    `transition`, `layout`, `layoutId`), no `AnimatePresence`, `useTransform`,
    `setTimeout`, `requestAnimationFrame`, React state changes or CSS
    `transition` / `@keyframes`.
-   Every segment has an **absolute** `at` in seconds (`at: 2.4`). Do not use
    relative `at` values (`"-0.2"`, `"<"`, labels).
-   Every segment gives **explicit start and end values** (`opacity: [0, 1]`),
    so any frame can be shown by seeking. Keyframes are allowed
    (`scale: [0, 1.1, 1]`, with `times` if needed).
-   Set each element's first state in its `style` too (`opacity: 0`,
    `transform: "scale(0)"`), so frame 0 is right.
-   Target elements by class name inside the scope (`".logo"`, `".row-2"`).
    Give each item that moves on its own its own class (`row-0` ... `row-4`).
    A class shared by several elements plus `delay: stagger(0.08)` is a
    stagger (`stagger(0.08, { from: "last" })` also works).
-   One element can have many segments (enter, move, exit). Later segments
    start from the values you give, so make each segment's start value equal
    the previous segment's end value.
-   Everything is mounted for the whole video. Hide things with opacity, scale
    or clip-path, never by unmounting.
-   Values you can animate (not `zIndex`): `x`, `y`, `scale`, `rotate`,
    `opacity`, `filter`, `clipPath`, colours, `width`/`height`/`left`/`top`/
    `borderRadius`, `pathLength` on SVG paths, and CSS variables (`"--value"`,
    `"--progress"`).
-   Count-ups: animate a CSS variable on a `<Counter className="..." />`
    from `"motion-ai/video"` (the renderer provides it)
    (`[".price", { "--value": [12, 10] }, { at: 2 }]`). `Counter` takes an
    optional `format={(v) => "$" + Math.round(v)}`. Define the format function
    outside the component (a stable reference).
-   Values that follow another value (a tooltip that follows a dot): animate
    both with the same times and easing, or animate one CSS variable on a
    parent and use `calc()` in the children's styles.

## Timing

-   Each beat starts at its requested time, within 0.1 s. Do not stage a beat
    in steps (for example, values first and sort later) unless asked.
-   Easing:
    -   Enter and settle: `"easeOut"` or `[0.16, 1, 0.3, 1]` (strong ease out).
    -   Moves, reorders, morphs: 0.5 to 0.7 s, `[0.65, 0, 0.35, 1]` or
        `"easeInOut"`.
    -   "Soft overshoot" or "spring": `{ type: "spring", bounce: 0.3 to 0.5,
        visualDuration: 0.5 to 0.7 }`. It must be visible: about 5 to 10% past
        the target. A spring's `visualDuration` is how long it takes to look
        settled; the settle tail continues briefly after.
    -   "Pops in": a spring with `bounce` about 0.5, or scale `[0, 1.1, 1]`
        over 0.4 s.
    -   Press: scale `[1, 0.93, 1]` over 0.25 s, after the pop has settled.
    -   Exits: `"easeIn"`, a little faster than the entry (0.3 to 0.4 s).
-   Staggers: the whole stagger takes 0.4 to 0.8 s. Letter stagger about 0.025 s
    per letter.
-   Counting numbers use the same times and easing as the thing they describe,
    and never show a value before it is visible.

## Layers (the cause of most bad frames)

-   Anything that moves over something else is **opaque**. Never fade a card
    while it overlaps another card. Dim with a black overlay (`opacity` on the
    overlay) or `filter: "brightness(...)"`.
-   Set `zIndex` for every moving thing, both ways: new item > item that
    matters (climber, expanding card) > rising > still > falling > leaving.
    `zIndex` cannot be animated in a sequence (it jumps at the start), so set
    it in `style` and plan one order that works for every move. If two items
    must swap who is on top, split one of them into two copies and cross over
    with `opacity` at a moment when they do not overlap.
-   Labels belong to the element they describe and move with it. Never hide
    labels during a move. Give a label that sits on the page a page-colour
    background, so a crossing label covers the one behind it.
-   A reorder: position items absolutely, compute each item's old slot and new
    slot, and move `y` (or `x`) between them in segments with the same `at`,
    duration and ease. A row that jumps several places lifts aside (x offset,
    shadow, highlight) while it passes. Items that pass behind dim.
-   Insert into a list in order: the others make room first, then the new item
    fades and scales into the gap (about 0.25 s later). The item that leaves
    moves with the push and fades, under the others. No hard mask edges.
-   A stack (deck): the visible strip of a back card shows whole elements (its
    title row), never a cut-off line or an empty slab. Dim a card only after
    the new card has covered it.
-   A card that grows into a new view: animate its `left`, `top`, `width`,
    `height` and `borderRadius` from rect A to rect B in one segment. Move each
    child (title, image, price) from its old place to its new place with its
    own `x`, `y` and `fontSize` or `scale` in segments with the same times, so
    nothing stretches. Other content leaves before the card reaches it.

## Look

-   Safe margin 64 px. Headline 64 to 96 px. Body at least 20 px. List rows 64
    to 80 px tall.
-   A different colour for each category (bars, avatars, icons). One accent
    colour for emphasis. Cards a step lighter than the page, with a 1 px
    border, so stacks read.
-   A subtle background (soft gradient or glow), not flat black. Real-looking
    content: names, numbers, SVG icons. No empty placeholder blocks.
-   If the scene starts static, add a 0.3 to 0.6 s intro.
-   No dead beats: in a handoff, the next element starts entering 0.1 to 0.2 s
    before the last one has fully gone, so the frame is never near-empty
    mid-video.
-   A gradient across several split words is one gradient: size it to the
    whole line and offset it per word, so it does not restart on each word.
    Accents (underlines, glows) use the same palette as the hero colour, not a
    flat default.
-   Fonts: use system fonts (`Inter, system-ui, sans-serif`) unless the project
    already ships a font file. The renderer has no network.

## QA list (check each sheet)

Most bad videos fail on these first five. Check them on every transition sheet,
frame by frame:

-   Text crossing text: during a handoff, one line or label moving over another
    while both are visible. The outgoing text must be gone (or fully covered by
    an opaque layer) before the incoming text reaches it.
-   Anything semi-transparent over text: cards, toasts or panels must be fully
    opaque where they overlap other content.
-   Stray marks: dots, glyphs, bullets or half-drawn shapes at frame 0 or before
    an element's beat (for example an SVG path start cap, a list bullet, an
    empty marker).
-   Wrong or repeated content: every item has its own icon and text that match
    its name. Nothing duplicated or peeking out behind another item.
-   A plain or empty frame: a heading or context where the request implies one,
    a styled background, real-looking detail. It should look like a shipped
    product video, not a wireframe.

Then the rest:

-   Text showing through a card, or two texts on top of each other?
-   Right item on top during every move, both ways?
-   Every beat on time? Anything late, staged or snapping?
-   Anything stretched or squashed mid-move?
-   Text cut by an edge? Copy word for word as requested?
-   Any label hidden mid-move, any near-empty frame between beats, any hard
    mask edge?
-   Overshoot visible where asked for, and not cartoonish?
