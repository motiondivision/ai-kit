# Animation inspector

An agent can't watch an animation: a screenshot catches one moment at a
random point, and a video is too much to read. The inspector stops every
Motion animation on a page, so you can step through it one frame at a time
and look at each.

Use it to check an animation you've written or changed does what was asked,
to debug one the user says "looks wrong", or to show the user what an
animation does.

It works with any page running `motion`, `framer-motion` or `motion/mini`
14.0 or later, including production builds. Nothing is added to the app.

## Filmstrip: the quick way

With a dev server running:

```
npx motion-ai filmstrip http://localhost:3000 --click "#open-menu"
```

Then read the contact sheet it writes, `motion-filmstrip/filmstrip.png`: the
frames side by side, labelled with their time. `timeline.json` next to it
lists every animation that ran, with its element, property, keyframes,
type, ease, duration, delay and where it sits on the timeline.

-   **What to capture.** With `--click <selector>` or `--hover <selector>`,
    it waits for the page to settle, then captures what that interaction
    animates. Without either, it captures the animations that run as the
    page loads.
-   **Frame count.** `--frames 8` by default, spread evenly from start to
    end. Use more to inspect easing or overshoot, fewer for a quick check.
-   **Cropping.** `--selector <css>` crops every frame to the area that
    element moves through, so small animations stay readable.
-   **Length.** By default it captures until the last animation ends,
    capped at 10 seconds. An animation that repeats forever counts one
    iteration. `--duration <seconds>` overrides it.
-   **Viewport.** `--width` and `--height` set it, 1280 by 800 by default.

It needs Playwright with Chromium (`npm i -D playwright && npx playwright
install chromium`). If it isn't installed, ask the user before installing.

## In your own browser tool

If you already drive a browser (Playwright, Puppeteer, a browser MCP),
inject the inspector before the page's scripts run.
`npx motion-ai inspector` prints its source:

-   Playwright: `page.addInitScript({ content: source })`
-   Puppeteer: `page.evaluateOnNewDocument(source)`
-   Otherwise, evaluate it before reloading if the tool runs scripts on
    every new document, or as the first `<script>` in `<head>`.

Injecting it after the page has loaded misses the animations that already
started, and it only sees animations that start after it's in place.

Then call it with the tool's evaluate:

| Call | What it does |
| ---- | ------------ |
| `MotionInspector.pause()` | Pauses every animation, and freezes every animation that starts until `play()` at its first frame |
| `MotionInspector.list()` | Every animation on the timeline, as JSON |
| `MotionInspector.duration()` | The timeline's length, in seconds |
| `await MotionInspector.seek(t)` | Shows the page `t` seconds into the timeline. Resolves once the page has painted it, so screenshot straight after |
| `MotionInspector.play()` | Hands the page back: running animations carry on from the last time seeked (and finish if that was their end), finished ones go back to their end state |
| `MotionInspector.mark()` | Starts a new timeline from the next animation, and forgets the ones listed so far. `pause()` still pauses any of them that are running |
| `MotionInspector.errors` | Errors the inspector hit reading Motion's animations. If `list()` is empty and this isn't, the page's Motion version may not be supported |

The timeline starts at the first animation since the page loaded or
`mark()` was called. Times are in seconds, like Motion's own options.

A filmstrip of an interaction:

1. Wait for the page to settle, then `MotionInspector.mark()` and
   `MotionInspector.pause()`.
2. Do the interaction (click, hover, type).
3. Wait a moment for it to start its animations, then read `list()` and
   `duration()`.
4. For each time you want, `await MotionInspector.seek(t)`, then
   screenshot.
5. `MotionInspector.play()` to hand the page back.

## Reading what you find

-   **Check the frames against the request.** "Fade in and slide up"
    should show opacity rising and the element moving up in the same frames.
    Look at the first and last frames for jumps: an element that's already
    half visible at 0s, or snaps at the end, has the wrong `initial` or
    keyframes.
-   **Easing shows in the spacing.** With evenly spaced frames, an ease-out
    covers most of the distance in the first frames; a spring with bounce
    passes its target, then comes back.
-   **Use `timeline.json` for exact values**, rather than estimating from
    pixels: the keyframes, duration and delay each animation actually ran
    with, after Motion resolved them.
-   **Nothing listed** means no Motion animation started: the interaction
    didn't run, the element animates with CSS instead, or the page uses a
    Motion version before 14.0.
-   `engine` is `waapi` for animations the browser runs (opacity, transform
    and similar, including independent transforms like `x` once Motion
    hands them to the browser), `js` for those Motion runs each frame. It's
    a quick check, not an audit: see
    [Performance Doctor](../performance-audit/index.md) for that.

## Limits

-   Animations that start when another finishes (an `await` between two
    `animate()` calls, `AnimatePresence` with `mode="wait"`, `onAnimationComplete`)
    don't start while the page is paused. Capture them with a second
    filmstrip after the first animation, or call `play()` and wait, then
    `mark()` and pause again.
-   Scroll-linked animations follow the scroll position, not the timeline.
    Scroll the page instead to see them.
-   CSS transitions and CSS animations aren't Motion animations, so they
    aren't listed, paused or seeked.
-   Seeking a layout animation after it has finished isn't supported, as the
    layout it animated from is gone. Pause before the interaction.
-   Seeking back into a layout animation that a second layout animation
    interrupted shows the wrong frame. The end state is still right.
-   Seeking calls the page's `onUpdate` callbacks with the seeked values,
    and `play()` calls them again as it puts values back. `onComplete` only
    runs when an animation actually finishes.
-   It reads some of Motion's internals, so it's tested against Motion 14.
    A future Motion version could change them; `MotionInspector.errors`
    says when it couldn't read an animation.
