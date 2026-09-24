# CSS or Motion

Pick the simplest tool that does the job well. For many effects that is CSS. Motion is the better tool when an animation must follow state that CSS cannot see: elements that leave the DOM, changes in layout, gestures, springs that can be interrupted, and scroll position.

| Effect | Use | Reason |
| --- | --- | --- |
| Hover, focus and press states | CSS `transition` | The browser does it with no JavaScript |
| Colour, shadow or opacity change when a class changes | CSS `transition` | Same as above |
| Fade or slide in when an element mounts | CSS `@starting-style` or `@keyframes` | Works in all current major browsers |
| Spinners, skeleton shimmer, simple infinite loops | CSS `@keyframes` | No state to track |
| Element leaves the DOM with an animation | Motion `AnimatePresence` with `exit` | React and Vue remove the element at once, so CSS has no time to animate it |
| Size or position changes from layout (list reorder, grid change, card expands) | Motion `layout` | CSS cannot animate between two layouts |
| One element moves between two places (tab indicator, card to modal) | Motion `layoutId` | Shared-element animation across components |
| Height to or from `auto` | Motion `animate={{ height: "auto" }}` | CSS needs `interpolate-size`, so check browser support before you use it |
| Drag, swipe, drag to reorder | Motion `drag`, `Reorder` | Pointer tracking, constraints and release velocity |
| Toggles that users hit many times, gestures that release with speed | Motion springs | Springs keep their velocity when interrupted |
| Staggered lists | CSS `transition-delay` for short fixed lists, Motion `stagger()` for dynamic lists or exits | |
| Scroll progress, parallax | CSS scroll-driven animations if every target browser supports them, otherwise Motion `scroll` or `useScroll` | Motion also works when the value drives JavaScript |
| Entrance when scrolled into view | Motion `whileInView` or `inView`, or CSS with an `IntersectionObserver` | Either is fine |

If the project does not have Motion installed and only needs effects from the CSS rows, do not add it.
