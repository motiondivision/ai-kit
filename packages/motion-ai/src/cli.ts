#!/usr/bin/env node
import {
    cancel,
    confirm,
    intro,
    isCancel,
    multiselect,
    note,
    outro,
    select,
    spinner,
    text,
} from "@clack/prompts"
import { createRequire } from "node:module"
import { homedir } from "node:os"
import { AGENTS, normalizeFolder, skillsDirFor } from "./agents.js"
import {
    baseDir,
    configureMcp,
    manualSnippet,
    mcpServers,
    writeAgentExtras,
    writeSkills,
    type Scope,
} from "./install.js"

const VERSION: string = createRequire(import.meta.url)("../package.json").version

function bail(message = "Cancelled."): never {
    cancel(message)
    process.exit(0)
}

async function main(): Promise<void> {
    const args = process.argv.slice(2)
    if (args.includes("--version") || args.includes("-v")) return console.log(VERSION)
    if (args.includes("--help") || args.includes("-h")) {
        console.log(
            `motion-ai ${VERSION}\n\nInstall the Motion AI Kit (skills + hosted MCP server) into your AI agents.\n\nUsage:  npx motion-ai           skills + the free Motion MCP server\n        npx motion-ai --plus    also add the Motion+ MCP server (Motion+ members)\n\nNo API key needed. After adding the Motion+ server, sign in to motion-plus\nfrom your agent's MCP menu.`
        )
        return
    }
    const plus = args.includes("--plus")
    const servers = mcpServers(plus)

    if (!process.stdin.isTTY) {
        console.error("motion-ai is interactive — run it in a terminal.")
        process.exit(1)
    }

    intro("Motion AI Kit")

    // ── 1. Install scope ──
    const scope = (await select({
        message: "Install scope",
        options: [
            { value: "project", label: "Project", hint: process.cwd() },
            { value: "global", label: "Global", hint: homedir() },
        ],
    })) as Scope | symbol
    if (isCancel(scope)) bail()

    // ── 2. Agents ──
    const picked = await multiselect({
        message: "Agents  (space to toggle — multiple supported)",
        required: true,
        options: [
            ...AGENTS.map((a) => ({ value: a.dir, label: a.label, hint: a.dir })),
            { value: "__custom__", label: "Custom folder…", hint: "e.g. .junie" },
        ],
    })
    if (isCancel(picked)) bail()

    const selected = picked as string[]
    let folders = selected.filter((v) => v !== "__custom__")
    if (selected.includes("__custom__")) {
        const c = await text({
            message: "Custom folder name(s), comma-separated",
            placeholder: "junie, roo",
        })
        if (isCancel(c)) bail()
        for (const part of (c as string).split(",")) {
            const f = normalizeFolder(part)
            if (f) folders.push(f)
        }
    }
    folders = [...new Set(folders)]
    if (folders.length === 0) bail("No agents selected.")

    // ── Confirmation ──
    const base = baseDir(scope as Scope)
    note(
        [
            `Scope    ${scope as string}  →  ${base}`,
            `Agents   ${folders.join("  ")}`,
            `Skills   install the Motion AI Kit skills`,
            `MCP      ${servers.map((s) => s.name).join(" + ")} (hosted — no API key)`,
        ].join("\n"),
        "Review"
    )
    const go = await confirm({ message: "Install now?" })
    if (isCancel(go) || !go) bail()

    // ── Install ──
    const sp = spinner()
    sp.start("Installing skills")
    const skills = writeSkills(base, folders)
    const extras = writeAgentExtras(base, folders)
    sp.stop(`Installed ${skills.length} skill(s)`)

    const sp2 = spinner()
    sp2.start("Configuring MCP servers")
    const mcp = await configureMcp(scope as Scope, folders, servers)
    sp2.stop(
        mcp.configured.length
            ? `MCP configured for ${mcp.configured.length} agent(s)`
            : "MCP"
    )

    const lines = folders.map((f) => `✓ skills → ${skillsDirFor(f)}/skills/`)
    for (const extra of extras) lines.push(`✓ ${extra}`)
    for (const label of mcp.configured) lines.push(`✓ MCP → ${label}`)
    note(lines.join("\n"), "Installed")

    if (mcp.manual.length) {
        const head = mcp.error
            ? `MCP setup failed for ${mcp.manual.join(", ")} (${mcp.error.split("\n")[0]}). Add the servers manually:`
            : `${mcp.manual.join(", ")} — add the MCP servers manually (the exact format varies by tool; stdio-only hosts can bridge with \`npx -y mcp-remote <url>\`):`
        note(`${head}\n\n${manualSnippet(servers)}`, "Add MCP manually")
    }

    outro(
        plus
            ? "Done. Run /motion in your agent, then sign in to motion-plus from its MCP menu."
            : "Done. Run /motion in your agent. Motion+ members: run npx motion-ai --plus to add the Motion+ server."
    )
}

main().catch((e) => {
    console.error(e)
    process.exit(1)
})
