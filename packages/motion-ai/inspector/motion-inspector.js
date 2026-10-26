/**
 * Motion inspector: lists, pauses and seeks every Motion animation on a page.
 *
 * Inject it before the page's own scripts run (Playwright's addInitScript,
 * Puppeteer's evaluateOnNewDocument, a <script> at the top of <head>). It
 * listens on globalThis.__MOTION_INSPECT__, a hook Motion 14 and later calls
 * whenever an animation starts, so it works with an unmodified production
 * build of motion, framer-motion or motion/mini and adds nothing to the app.
 *
 * Every animation is placed on one timeline, in seconds, starting at the
 * first animation since the page loaded or mark() was last called:
 *
 *     MotionInspector.pause()      // freeze running and new animations
 *     await page.click("#open")    // interact
 *     MotionInspector.list()       // what started, where, for how long
 *     await MotionInspector.seek(0.2)  // render the page at 0.2s
 *     MotionInspector.play()       // let everything carry on
 */
;(() => {
    if (globalThis.MotionInspector) return

    const MAX_ENTRIES = 500
    let entries = []
    let nextId = 1
    let origin = null
    let paused = false
    // Animations the inspector paused, or put on hold, and what to restore
    const held = new Map()

    const toSeconds = (ms) => (typeof ms === "number" ? ms / 1000 : 0)

    /**
     * Internal options carry durations in ms. Springs only know theirs once
     * the animation's generator has run, so ask the animation itself.
     */
    const durationOf = (animation) => {
        try {
            return animation.duration || 0
        } catch {
            return 0
        }
    }

    /**
     * Motion swaps a type name for its generator, whose name a production
     * build minifies, so tell them apart by their options.
     */
    const typeOf = ({
        type,
        stiffness,
        damping,
        mass,
        bounce,
        visualDuration,
        power,
        timeConstant,
    }) =>
        typeof type === "string"
            ? type
            : power !== undefined || timeConstant !== undefined
              ? "inertia"
              : [stiffness, damping, mass, bounce, visualDuration].some(
                      (option) => option !== undefined,
                  )
                ? "spring"
                : "tween"

    const describe = (element) => {
        if (!element || element.nodeType !== 1) return null
        let selector = element.tagName.toLowerCase()
        if (element.id) selector += "#" + element.id
        for (const name of element.classList) selector += "." + name
        return selector
    }

    const elementOf = (options) =>
        options.element instanceof Element
            ? options.element
            : options.motionValue?.owner?.current instanceof Element
              ? options.motionValue.owner.current
              : null

    /**
     * Animations on the same value replace each other, so seeking shows one
     * of them at a time. A motion value is the value; WAAPI animations
     * without one (motion/mini, view transitions) are keyed by element and
     * property.
     */
    const elementKeys = new WeakMap()
    const keyOf = (record, options, element) => {
        if (record.kind === "layout-animation-start") return record.node
        if (options.motionValue) return options.motionValue
        const effect = record.animation?.animation?.effect
        const target = element || effect?.target
        if (!target) return record.animation
        let keys = elementKeys.get(target)
        if (!keys) elementKeys.set(target, (keys = new Map()))
        const name = options.name || ""
        const pseudo = options.pseudoElement || effect?.pseudoElement || ""
        const id = name + ":" + pseudo
        if (!keys.has(id)) keys.set(id, {})
        return keys.get(id)
    }

    const isNative = (animation) =>
        typeof Animation !== "undefined" &&
        animation?.animation instanceof Animation

    const record = (info) => {
        const { animation } = info

        // A layout animation is also reported as the animation it runs on
        const existing = entries.find((entry) => entry.animation === animation)
        if (info.kind === "layout-animation-start") {
            if (existing) {
                existing.kind = "layout"
                existing.key = info.node
                existing.element = info.node?.instance ?? existing.element
                existing.layoutId = info.node?.options?.layoutId
            }
            return
        }
        if (existing) return

        const options = info.options || {}
        const element = elementOf(options)
        const start = info.timestamp
        if (origin === null) origin = start
        const type = typeOf(options)

        const entry = {
            id: nextId++,
            animation,
            kind: "value",
            engine: isNative(animation) ? "waapi" : "js",
            element: element || animation?.animation?.effect?.target || null,
            property: options.name,
            keyframes: options.keyframes,
            type,
            ease:
                type !== "tween"
                    ? null
                    : typeof options.ease === "function"
                      ? "function"
                      : options.ease,
            delay: toSeconds(options.delay),
            repeat: options.repeat || 0,
            start,
            key: keyOf(info, options, element),
        }
        entries.push(entry)
        if (entries.length > MAX_ENTRIES) entries.shift()

        /**
         * Hold it once whatever started it has finished setting it up, as
         * setting a WAAPI animation's start time would play it again.
         */
        if (paused) queueMicrotask(() => paused && hold(entry))
    }

    const previous = globalThis.__MOTION_INSPECT__
    globalThis.__MOTION_INSPECT__ = (info) => {
        if (previous) previous(info)
        record(info)
    }

    /**
     * Pause an animation and note how to put it back. Animations keep their
     * own time, so playing them later carries on from where they were held.
     */
    function hold(entry) {
        if (held.has(entry)) return
        const { animation } = entry
        const state = animation.state
        held.set(entry, { state, time: animation.time })
        if (state === "running") animation.pause()
    }

    /**
     * A paused JS animation still writes its held value every frame, and a
     * paused WAAPI animation still applies its fill, so an animation that
     * hasn't started yet at the seeked time is taken out of the way: its
     * frame driver is stopped, or its WAAPI animation is cancelled.
     */
    function deactivate(entry) {
        const { animation } = entry
        if (entry.engine === "waapi") {
            animation.animation.cancel()
        } else {
            animation.driver?.stop()
        }
        entry.inactive = true
    }

    const localTime = (entry, t) => t - toSeconds(entry.start - origin)

    const timeline = () =>
        entries.map((entry) => {
            const duration = durationOf(entry.animation)
            const start = toSeconds(entry.start - origin)
            const repeat = entry.repeat === Infinity ? 0 : entry.repeat
            return {
                entry,
                start,
                end: start + entry.delay + duration * (repeat + 1),
                duration,
            }
        })

    const nextFrame = () =>
        new Promise((resolve) => requestAnimationFrame(() => resolve()))

    const json = (value) => {
        if (value === undefined || value === null) return value ?? null
        if (Array.isArray(value)) return value.map(json)
        return typeof value === "object" || typeof value === "function"
            ? String(value)
            : value
    }

    const api = {
        version: 1,

        /**
         * Every animation on the timeline, as plain data. start and end are
         * seconds on the timeline, duration and delay in seconds.
         */
        list() {
            return timeline().map(({ entry, start, end, duration }) => ({
                id: entry.id,
                kind: entry.kind,
                engine: entry.engine,
                target: describe(entry.element),
                property: entry.property ?? null,
                layoutId: entry.layoutId ?? null,
                keyframes: json(entry.keyframes),
                type: entry.type ?? null,
                ease: json(entry.ease),
                duration,
                delay: entry.delay,
                repeat: entry.repeat === Infinity ? "infinite" : entry.repeat,
                start,
                end,
                state: entry.animation.state,
                time: entry.animation.time,
            }))
        },

        /**
         * The timeline's length in seconds: when its last finite animation
         * ends.
         */
        duration() {
            return timeline().reduce((max, { end }) => Math.max(max, end), 0)
        },

        /**
         * Pause every animation, and every animation that starts until
         * play(), at its first frame.
         */
        pause() {
            paused = true
            for (const entry of entries) hold(entry)
        },

        /**
         * Show the page as it was, or would be, `t` seconds into the
         * timeline. Pauses first. Resolves after the page has rendered it.
         */
        async seek(t) {
            api.pause()

            // On each value, show the latest animation started by t
            const winners = new Map()
            for (const entry of entries) {
                const current = winners.get(entry.key)
                if (
                    !current ||
                    (entry.start <= origin + t * 1000 &&
                        entry.start >= current.start)
                ) {
                    winners.set(entry.key, entry)
                }
            }

            for (const entry of entries) {
                if (winners.get(entry.key) !== entry) deactivate(entry)
            }
            for (const entry of winners.values()) {
                const { animation } = entry
                if (animation.state === "running") animation.pause()
                entry.inactive = false
                animation.time = Math.max(0, localTime(entry, t))
            }

            // Motion renders on its next frame, the browser paints on the one after
            await nextFrame()
            await nextFrame()
        },

        /**
         * Hand every animation back: those that were running carry on from
         * where they are now, those that had finished or stopped go back to
         * how they left the page.
         */
        play() {
            paused = false
            for (const [entry, saved] of held) {
                const { animation } = entry
                if (saved.state === "running" || saved.state === "paused") {
                    if (entry.inactive) {
                        animation.time = saved.time
                    }
                    if (saved.state === "running") animation.play()
                } else if (entry.engine === "waapi") {
                    // Finished and stopped WAAPI animations committed their
                    // style and were cancelled
                    animation.animation.cancel()
                } else if (entry.inactive === false) {
                    animation.time = saved.time
                }
                entry.inactive = false
            }
            held.clear()
        },

        /**
         * Start a new timeline from the next animation, forgetting the
         * animations listed so far.
         */
        mark() {
            api.play()
            entries = []
            origin = null
        },
    }

    globalThis.MotionInspector = api
})()
