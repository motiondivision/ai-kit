---
name: motion
description: "Motion's entry point for animation work. Use when invoked as /motion, or when the user names Motion, motion/react, motion-v or framer-motion and no more specific Motion skill fits."
argument-hint: "[what to do, e.g. 'build a modal', 'performance audit src/Modal.tsx', 'animate this list', 'spring bounce 0.3', 'upgrade']"
---

# Motion

Motion's skills are served by the `motion` MCP server, so they are always
current. This skill only finds the right one.

1. **If a Motion skill from the server fits the request, use it.** Hosts that
   list MCP skills show them as `motion:<name>`, for example `motion:modal`
   or `motion:performance-audit`. Load it and follow it.
2. **Otherwise read the catalogue.** Read the resource `motion://skills` from
   the `motion` MCP server (in Claude Code, with ReadMcpResourceTool). It
   lists every skill with a description and a `skill://` URI. Pick the one
   that fits, read its `SKILL.md` the same way, and follow it. Read each file
   it names the same way too.
3. **If nothing fits**, follow `skill://motion/animate/SKILL.md`, Motion's
   general animation guidance.

Do not work from memory when a skill covers the request. The served skills
track Motion's current API and Motion+ content.

## If the Motion MCP server is unavailable

If there is no `motion` MCP server, or it does not answer, tell the user it is
not connected and point them at https://motion.dev/docs/ai-kit. Running
`npx motion-ai` again sets it up. Then help as well as you can without it.
