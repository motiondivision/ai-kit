# Changelog

## [7.0.1] 2026-10-15

### Changed

- Updated guidance on independent transforms, now that they're hardware accelerated.

## [7.0.0] 2026-07-28

### Added

- Transition editor as MCP App.
- Documentation search now open to everyone.

### Changed

- Moved to remote MCP server for instant upgrades.

### Added

- Transition editor: Delay control, matching the VS Code extension.

### Removed

- Installer: Windsurf removed from the agent picker.

## [6.2.0] 2026-07-23

### Added

- MCP: `search-motion-codex` now returns Motion UI components and sections (Motion+ / React) as full multi-file paste-ready source — same delivery model as examples, baked into the package.

## [6.1.0] 2026-05-28

### Changed

- Skills: Add MotionScore runtime performance profiling to `/motion`.

## [6.0.0] 2026-05-27

### Changed

- Skills: Unified all skills into one `/motion` skill.

## [5.4.4] 2026-05-26

### Added

- MCP: Hardened response to missing `sharp` dependency.

## [5.4.3] 2026-04-08

### Added

- Skills: Installer better supports OpenCode.

## [5.4.2] 2026-03-06

### Added

- Skills: Installer now supports VS Code.

## [5.4.1] 2026-03-06

### Updated

- MCP: Now loads codex with documentation if purchased AI Kit.

## [5.4.0] 2026-03-06

### Added

- Skills: `/motion` skill. Includes design guidelines, performance tips, and API gotchas. Can reference the Motion Studio MCP for docs search.
- Skills: `/css-spring` skill. Generates CSS spring easing functions via the Motion Studio MCP.
- Skills: `/see-transition` skill. Visualise easing curves and springs via the Motion Studio MCP.
- Skills: Added new `motion-ai-kit` installer with interactive skill picker.

## [5.3.0] 2026-02-12

### Added

- Extension: Added support for spring editing.
- Extension: Visual refresh.
- Skills: Added Motion Performance Audit skill.

## [5.2.0] 2026-01-13

### Changed

- Extension: Added support for editing and saving `delay` and `duration`.

## [5.1.0] 2026-01-12

### Changed

- MCP: Added documentation lookup to Codex.

## [5.0.1] 2025-12-16

### Changed

- MCP: Improving Codex tool prompts.

## [5.0.0] 2025-12-12

### Changed

- MCP: Installation requires setting access token via `env.TOKEN` instead of URL query string.

### Added

- MCP: Includes Motion docs and CSS generation tools for unauthenticated users.
- MCP: Codex can now also query your saved transitions.

## [4.3.0] 2025-12-10

### Added

- Extension: Save and manage transitions.

## [4.2.1] 2025-12-09

### Added

- Extension: Support multiline selection for batch bezier edits.

## [4.2.0] 2025-12-09

### Added

- Extension: Support for editing general `cubicBezier()` easing functions alongside CSS and Motion syntax.

## [4.1.1] 2025-12-08

### Added

- SDK `BezierCurveEditor`: New configuration props added.

## [4.1.0] 2025-12-05

### Added

- SDK: Added `BezierCurveEditor` component.

## [4.0.5] 2025-12-03

### Changed

- Extension: Replaced internal `BezierCurveEditor` with SDK component.
- SDK `BezierCurveEditor`: Improved drawing calculations.

## [4.0.4] 2025-12-03

### Fixed

- Extension: Fixed packaged webviews.
- Extension: Fixing image URLs in README.

## [4.0.1] 2025-12-02

### Fixed

- Extension: Restore README.

## [4.0.0] 2025-12-02

### Changed

- Unified Motion Studio SDK, MCP and Extension versioning.
- Extension: Replaced internal `EasingCurve` component with SDK.

### Added

- Extension: Packaged and minified for smaller filesize.

### Fixed

- SDK `EasingCurve`: Ensure final curve point is drawn correctly.

## [3.0.2] 2025-11-27

### Added

- SDK `EasingCurve`: `transition` prop allows animation between easing curves.

## [3.0.1] 2025-11-27

### Added

- SDK `EasingCurve`: Now accepts easing functions.

## [3.0.0] 2025-11-27

### Added

- SDK `EasingCurve`: React component for drawing a provided easing curve.
- SDK `TransitionState`: State for editing Motion transitions.
- SDK `toCSSTransition`: Convert `TransitionState` to a CSS `transition` string.
- SDK `toMotionTransition`: Convert `TransitionState` to a Motion `Transition` string.
- SDK `fromShareURL`: Create a `TransitionState` from the current URL.
- SDK `toShareQueryString`: Create a serialised `TransitionState` safe for adding to the URL.

## [1.0.0] 2025-11-26

### Added

- Motion+ AI Patterns: Use your LLM to query Motion Examples to kickstart its code generation.

## [0.0.9] 2025-11-10

### Removed

- Extension: Removing automatic MCP registration to support more editors.

## [0.0.8] 2025-11-09

### Changed

- Extension: Updating to Motion Studio branding.

## [0.0.7] 2025-09-10

### Added

- Extension: Allowing bezier editor SVG to overflow.

## [0.0.6] 2025-08-10

### Added

- Extension: Updating copy to remove reference to spring.

## [0.0.5] 2025-07-21

### Added

- Extension: Fixing build for views.

## [0.0.4] 2025-07-09

### Added

- Extension: Add bezier curve editor.

## [0.0.3] 2025-07-03

### Added

- Extension: Update name.

## [0.0.2] 2025-07-01

### Added

- Extension: Improve README.

## [0.0.1] 2025-07-01

### Added

- Extension: Initial release.
