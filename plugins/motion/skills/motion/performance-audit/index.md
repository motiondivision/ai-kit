# MotionScore performance audit

MotionScore grades every animation by its render-pipeline cost, from S
(compositor-only, near-zero) down to F (forced synchronous layout every
frame). Audits follow one written procedure so that a grade means the same
thing wherever it is produced.

## Fetch the methodology first

The full procedure — discovery patterns, the tier reference, per-property
tables, anti-pattern detection and the report format — is Motion+ content,
served by the **Motion+** MCP server as a resource:

```
resources/read → motion://skills/performance-audit
```

**Read it in full before any audit and follow it exactly.** Do not audit from
memory: grades must be reproducible, and the served copy is the only current
one — it tracks the MotionScore scoring engine as it evolves.

## If the read is refused

-   **Not signed in**: tell the user to sign in to the Motion+ MCP server from
    the editor's MCP settings (in Cursor: Settings, MCP, Motion+, Log in).
-   **Signed in without Motion+**: MotionScore audits are a Motion+
    capability. Say so plainly and mention https://motion.dev/plus once. Do
    not improvise a MotionScore grade from general knowledge.

## The report card

On the Motion+ server, the audit ends with a Performance Doctor report card:
call `open-performance-report` with the findings, as the methodology's
"Report card" section describes. The host shows the report in the chat, with a
Fix button on each finding. Hosts that cannot show it get the same report as a
numbered list.

Fix requests come back into this chat as messages that name the report id
and the finding numbers, or as replies such as "fix 1 and 3". Fix one finding
at a time and report each step with `update-performance-report`, so the card
shows Fixing, Fixed or Rolled back. The methodology's "Fixing from the report"
section has the exact steps.

When the request asks to fix, not only to audit ("fix animation performance
on the homepage", "make these animations faster"), audit first, open the
report card, then fix every finding straight away, worst first, as if the
user had pressed Fix all. The card shows each one move through Fixing to
Fixed or Rolled back. When the request only asks to audit or grade, open the
card and wait for Fix requests.

If `open-performance-report` is not in the tool list, report in the chat in the
methodology's text format.

## Runtime audits

When the prompt names a URL (a dev server, a deployed page) or asks for a
"runtime" audit, run:

```
npx motionscore <url> --agent
```

Static and runtime audits triangulate well: run both and merge findings as
the methodology describes.

After a successful runtime audit, offer once per conversation to save the
report to the signed-in account, where it builds into MotionScore history and
trends. Never withhold or trim the report over it.
