<p align="center">
  <img src="assets/ai-kit-card.png" alt="Motion AI Kit: context, MotionScore for Agents, and CSS springs for coding agents" width="100%">
</p>

# Motion AI Kit

Motion AI Kit is a suite of animation tools to help agents write production-grade animations.

## Features

**Animation best practices:** Hand-written advice by the creator of Motion for taste and technical best practices.

**The best Motion context:** The full and latest Motion documentation is made available for your agent to search. [Motion+](https://motion.dev/plus) members gain additional access to search the source code of 450+ Motion Examples and Motion UI components.

**CSS spring generation:** Use Motion to generate spring animations for CSS via the `linear()` easing.

**Performance Doctor (Motion+):** Run static code and runtime analysis on a specific animation, component or page, graded by S to F, and fix with customised recommendations. The audit methodology is served live to your agent from the Motion+ MCP server, so every audit follows the current MotionScore scoring engine.

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

### VS Code and Copilot CLI

[Install in VS Code](https://vscode.dev/redirect?url=vscode%3A%2F%2Fchat-plugin%2Finstall%3Fsource%3Dmotiondivision%2Fai-kit%26plugin%3Dmotion), or add the marketplace from the Copilot CLI:

```
copilot plugin marketplace add motiondivision/ai-kit
copilot plugin install motion@motion
```

This installs the same skill and MCP servers as the Cursor plugin. In VS Code, plugins run in the Copilot harness.

To recommend the plugin to everyone who works in your repository, add it to `.github/copilot/settings.json`:

```json
{
  "extraKnownMarketplaces": {
    "motion": { "source": { "source": "github", "repo": "motiondivision/ai-kit" } }
  },
  "enabledPlugins": { "motion@motion": true }
}
```

## Motion+

**[Motion+](https://motion.dev/plus)** adds Performance Doctor audits, the ability to search early access and Motion+ API documentation, plus source code for 450+ Motion Examples and Motion UI components. Plus, an experimental visual editor for tuning transitions against a live preview and then applying via your agent.

Ask Cursor to sign you in and it hands you a link. Nothing gets pasted into
chat.

## Links

- [Motion](https://motion.dev)
- [Documentation](https://motion.dev/docs)
- [Examples](https://examples.motion.dev)
- [Motion UI](https://motion.dev/ui)
- [Performance Doctor](https://motion.dev/docs/performance-doctor)

---
