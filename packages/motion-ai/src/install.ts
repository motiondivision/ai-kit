import { cpSync, existsSync, mkdirSync, readdirSync } from "node:fs"
import { homedir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { upsertServer } from "add-mcp"
import { AGENTS, skillsDirFor } from "./agents.js"

export type Scope = "project" | "global"

/**
 * Motion's hosted MCP servers. The open server works signed out; the Motion+
 * server 401s until the user signs in from their agent, which every supported
 * client turns into its own OAuth prompt. The "motion" name is deliberate:
 * upserting it replaces the legacy token-based stdio entry on upgrade.
 */
export const MCP_SERVERS = [
    { name: "motion", url: "https://mcp.motion.dev" },
    { name: "motion-plus", url: "https://mcp.motion.dev/plus" },
] as const

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
 * Configure both hosted servers for the selected agents via add-mcp's
 * programmatic API, which owns each client's config path and schema quirks
 * (Claude Code's mandatory `type`, VS Code's `servers` key, Codex's TOML).
 */
export async function configureMcp(scope: Scope, folders: string[]): Promise<McpResult> {
    const result: McpResult = { configured: [], manual: [] }
    for (const folder of folders) {
        const agent = AGENTS.find((a) => a.dir === folder)
        if (!agent?.addMcpClient) {
            result.manual.push(folder)
            continue
        }
        try {
            for (const server of MCP_SERVERS) {
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
export function manualSnippet(): string {
    const entries = Object.fromEntries(
        MCP_SERVERS.map((server) => [server.name, { type: "http", url: server.url }])
    )
    return JSON.stringify({ mcpServers: entries }, null, 2)
}
