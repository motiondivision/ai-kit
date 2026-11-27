import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs"
import { homedir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { listInstalledServers, removeServer, upsertServer, type AgentType } from "add-mcp"
import { AGENTS, skillsDirFor } from "./agents.js"

export type Scope = "project" | "global"

/**
 * Motion's hosted MCP server. Everyone gets one server, named "motion".
 *
 * The open server works signed out. The Motion+ server carries everything the
 * open one does plus the Motion+ tools and skills, so --plus (the command
 * motion.dev shows after a purchase) writes the Motion+ URL under the same
 * "motion" name instead of adding a second server. One server means one set
 * of tools, and skills named motion:<skill> on every install.
 *
 * The Motion+ server 401s until the user signs in, which is why it is not the
 * default: agents that start every server on each run (Codex) would hit that
 * 401 on every run for people without Motion+.
 *
 * "motion" also replaces the legacy token-based stdio entry on upgrade.
 */
export const MCP_SERVER = { name: "motion", url: "https://mcp.motion.dev" } as const
export const PLUS_MCP_SERVER = { name: "motion", url: "https://mcp.motion.dev/plus" } as const

/** The second server older installs added. --plus removes it. */
export const LEGACY_SERVER_NAMES = ["motion-plus"] as const

export type McpServer = typeof MCP_SERVER | typeof PLUS_MCP_SERVER

export function mcpServers(plus: boolean): McpServer[] {
    return [plus ? PLUS_MCP_SERVER : MCP_SERVER]
}

/** Bundled AI Kit content, synced from plugins/motion at build time. */
const CONTENT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "content")

export function baseDir(scope: Scope): string {
    return scope === "project" ? process.cwd() : homedir()
}

/**
 * Copy the bundled skills into <base>/<folder>/skills/ for each target
 * folder: the `motion` router always, and the stubs for the folders in
 * `stubFolders`. The skills themselves are served by the MCP server.
 *
 * Each skill folder is replaced, not merged, so files from an older AI Kit
 * (which bundled the whole skill) do not linger next to the router.
 */
export function writeSkills(base: string, folders: string[], stubFolders: string[] = []): string[] {
    const written = new Set<string>()
    for (const folder of folders) {
        const targetFolder = skillsDirFor(folder)
        const sources = [join(CONTENT_DIR, "skills")]
        if (stubFolders.includes(folder)) sources.push(join(CONTENT_DIR, "stubs"))
        for (const source of sources) {
            if (!existsSync(source)) continue
            for (const skill of readdirSync(source)) {
                const dest = join(base, targetFolder, "skills", skill)
                rmSync(dest, { recursive: true, force: true })
                mkdirSync(dirname(dest), { recursive: true })
                cpSync(join(source, skill), dest, { recursive: true })
                written.add(skill)
            }
        }
    }
    return [...written]
}

/**
 * Folders whose agent may not list MCP skills, so they get the local stubs.
 * Claude Code lists them on its personal plans; on Team and Enterprise plans
 * they are off unless an administrator turns them on, which the installer
 * cannot see, so it asks.
 */
export function stubFoldersFor(folders: string[], claudeListsMcpSkills: boolean): string[] {
    return folders.filter((folder) => folder !== ".claude" || !claudeListsMcpSkills)
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
    /** Agent labels that now have the Motion+ server. */
    plus: string[]
    /** Folders we couldn't auto-configure (Amp, custom) — user adds MCP manually. */
    manual: string[]
    /** Failure message from the last agent that errored, if any. */
    error?: string
}

/**
 * Configure the hosted server for the selected agents via add-mcp's
 * programmatic API, which owns each client's config path and schema quirks
 * (Claude Code's mandatory `type`, VS Code's `servers` key, Codex's TOML).
 * The legacy "motion-plus" entry is removed first, so an upgrade from two
 * servers leaves one.
 */
export async function configureMcp(
    scope: Scope,
    folders: string[],
    servers: McpServer[]
): Promise<McpResult> {
    const result: McpResult = { configured: [], plus: [], manual: [] }
    const options = { local: scope === "project" }
    for (const folder of folders) {
        const agent = AGENTS.find((a) => a.dir === folder)
        if (!agent?.addMcpClient) {
            result.manual.push(folder)
            continue
        }
        try {
            /* A Motion+ member who re-runs plain `npx motion-ai` keeps the
             * Motion+ server: an update must never downgrade them. */
            const plus =
                servers.includes(PLUS_MCP_SERVER) ||
                (await hasPlusServer(agent.addMcpClient, scope))
            if (plus) {
                for (const name of LEGACY_SERVER_NAMES) {
                    removeServer(agent.addMcpClient, name, options)
                }
            }
            const server = plus ? PLUS_MCP_SERVER : MCP_SERVER
            upsertServer(agent.addMcpClient, server.name, { type: "http", url: server.url }, options)
            result.configured.push(agent.label)
            if (plus) result.plus.push(agent.label)
        } catch (e) {
            result.error = (e as Error).message
            result.manual.push(folder)
        }
    }
    return result
}

/** Whether this agent already has a Motion+ server, under either name. */
async function hasPlusServer(client: string, scope: Scope): Promise<boolean> {
    try {
        const [installed] = await listInstalledServers({
            global: scope === "global",
            agents: [client as AgentType],
            cwd: process.cwd(),
        })
        return (installed?.servers ?? []).some(
            (server) =>
                (server.serverName === "motion" ||
                    (LEGACY_SERVER_NAMES as readonly string[]).includes(server.serverName)) &&
                JSON.stringify(server.config).includes(PLUS_MCP_SERVER.url)
        )
    } catch {
        return false
    }
}

/** The JSON most agents accept for a manual add. Stdio-only hosts bridge with mcp-remote. */
export function manualSnippet(servers: McpServer[]): string {
    const entries = Object.fromEntries(
        servers.map((server) => [server.name, { type: "http", url: server.url }])
    )
    return JSON.stringify({ mcpServers: entries }, null, 2)
}
