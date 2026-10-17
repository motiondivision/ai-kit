import { cpSync, existsSync, mkdirSync, readdirSync } from "node:fs"
import { homedir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { upsertServer } from "add-mcp"
import { AGENTS, skillsDirFor } from "./agents.js"

export type Scope = "project" | "global"

/**
 * Motion's hosted MCP servers. The open server works signed out. The "motion"
 * name is deliberate: upserting it replaces the legacy token-based stdio entry
 * on upgrade.
 *
 * The Motion+ server 401s until the user signs in, so it is only added with
 * --plus, the command motion.dev shows after a purchase. Added for everyone,
 * agents that start every server on each run (Codex) hit that 401 on every
 * run for people without Motion+.
 */
export const MCP_SERVER = { name: "motion", url: "https://mcp.motion.dev" } as const
export const PLUS_MCP_SERVER = {
    name: "motion-plus",
    url: "https://mcp.motion.dev/plus",
} as const

export type McpServer = typeof MCP_SERVER | typeof PLUS_MCP_SERVER

export function mcpServers(plus: boolean): McpServer[] {
    return plus ? [MCP_SERVER, PLUS_MCP_SERVER] : [MCP_SERVER]
}

/** Bundled AI Kit content, synced from plugins/motion at build time. */
const CONTENT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "content")

export function baseDir(scope: Scope): string {
    return scope === "project" ? process.cwd() : homedir()
}

/** Copy every bundled skill into <base>/<folder>/skills/ for each target folder. */
export function writeSkills(base: string, folders: string[]): string[] {
    const skillsDir = join(CONTENT_DIR, "skills")
    const skills = readdirSync(skillsDir)
    for (const folder of folders) {
        const targetFolder = skillsDirFor(folder)
        for (const skill of skills) {
            const dest = join(base, targetFolder, "skills", skill)
            mkdirSync(dirname(dest), { recursive: true })
            cpSync(join(skillsDir, skill), dest, { recursive: true })
        }
    }
    return skills
}

/**
 * Formats with a native home beyond skills: Cursor auto-attaches rules and
 * reads project agents, and Claude Code's .claude/agents uses the same
 * frontmatter shape. Everyone else reaches the same content via the skill.
 */
export function writeAgentExtras(base: string, folders: string[]): string[] {
    const written: string[] = []
    const extras = [
        { folder: ".cursor", dir: "rules" },
        { folder: ".cursor", dir: "agents" },
        { folder: ".claude", dir: "agents" },
    ]
    for (const extra of extras) {
        if (!folders.includes(extra.folder)) continue
        const src = join(CONTENT_DIR, extra.dir)
        if (!existsSync(src)) continue
        cpSync(src, join(base, extra.folder, extra.dir), { recursive: true })
        written.push(`${extra.folder}/${extra.dir}/`)
    }
    return written
}

export interface McpResult {
    /** Agent labels whose MCP was configured. */
    configured: string[]
    /** Folders we couldn't auto-configure (Amp, custom) — user adds MCP manually. */
    manual: string[]
    /** Failure message from the last agent that errored, if any. */
    error?: string
}

/**
 * Configure the hosted servers for the selected agents via add-mcp's
 * programmatic API, which owns each client's config path and schema quirks
 * (Claude Code's mandatory `type`, VS Code's `servers` key, Codex's TOML).
 */
export async function configureMcp(
    scope: Scope,
    folders: string[],
    servers: McpServer[]
): Promise<McpResult> {
    const result: McpResult = { configured: [], manual: [] }
    for (const folder of folders) {
        const agent = AGENTS.find((a) => a.dir === folder)
        if (!agent?.addMcpClient) {
            result.manual.push(folder)
            continue
        }
        try {
            for (const server of servers) {
                await upsertServer(
                    agent.addMcpClient,
                    server.name,
                    { type: "http", url: server.url },
                    { local: scope === "project" }
                )
            }
            result.configured.push(agent.label)
        } catch (e) {
            result.error = (e as Error).message
            result.manual.push(folder)
        }
    }
    return result
}

/** The JSON most agents accept for a manual add. Stdio-only hosts bridge with mcp-remote. */
export function manualSnippet(servers: McpServer[]): string {
    const entries = Object.fromEntries(
        servers.map((server) => [server.name, { type: "http", url: server.url }])
    )
    return JSON.stringify({ mcpServers: entries }, null, 2)
}
