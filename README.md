<p align="center">
  <img src="plugins/motion/assets/ai-kit-card.png" alt="Motion AI Kit: context, MotionScore for Agents, and CSS springs for coding agents" width="100%">
</p>

# Motion AI Kit

Motion AI Kit is a suite of animation tools to help agents write production-grade animations.

## Features

**Animation best practices:** Hand-written advice by the creator of Motion for taste and technical best practices.

**The best Motion context:** The full and latest Motion documentation is made available for your agent to search. [Motion+](https://motion.dev/plus) members gain additional access to search the source code of 450+ Motion Examples and Motion UI components.

**CSS spring generation:** Use Motion to generate spring animations for CSS via the `linear()` easing.

**Video rendering:** Your agent writes a video as one Motion sequence and renders it to MP4 on your machine with `npx motion-ai video`, frame by frame, so springs and staggers land exactly on each frame.

**MotionScore performance audits (Motion+):** Run static code and runtime analysis on a specific animation, component or page, graded by S to F, and fix with customised recommendations. The audit methodology is served live to your agent from the Motion+ MCP server, so every audit follows the current MotionScore scoring engine.

```
> /motion src/components for animation performance
```

```
Rank: B     S ████████████████░░░░░░░  9 · 45%
            A █████████░░░░░░░░░░░░░░  5 · 25%
            C ██████░░░░░░░░░░░░░░░░░  4 · 20%
            D ██░░░░░░░░░░░░░░░░░░░░░  2 · 10%

src/Sheet.tsx:34 — Tier D
What:     `height` transition on `.sheet-panel`
Why:      height triggers layout, then paint, then composite, every frame
Upgrade:  Motion's `layout` prop (B) or a `scaleY` transform (S)
```

## Install

In Cursor, open **Customize** from the sidebar, search the marketplace for **Motion**, and install. That's it. Write `/motion` and ask to search docs and generate springs; sign in with Motion+ to run audits and fetch source code.

### Every other agent

```
npx motion-ai
```

Installs the Motion skills and configures the free hosted MCP server for Claude Code, Codex, Amp, OpenCode, Gemini CLI, Copilot or any custom agent folder. For Codex, skills install to `.agents/skills/` and MCP configuration to `.codex/config.toml`. No API key needed.

Motion+ members also add the Motion+ MCP server, then sign in to it from their agent:

```
npx motion-ai --plus
```

## Motion+

**[Motion+](https://motion.dev/plus)** adds MotionScore performance audits, the ability to search early access and Motion+ API documentation, plus source code for 450+ Motion Examples and Motion UI components. Plus, an experimental visual editor for tuning transitions against a live preview and then applying via your agent.

Ask Cursor to sign you in and it hands you a link. Nothing gets pasted into
chat.

## Links

- [Motion](https://motion.dev)
- [Documentation](https://motion.dev/docs)
- [Examples](https://examples.motion.dev)
- [Motion UI](https://motion.dev/ui)
- [MotionScore](https://motion.dev/docs/motionscore)

---
