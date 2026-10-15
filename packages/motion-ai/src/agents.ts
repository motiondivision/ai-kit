export interface Agent {
    id: string
    label: string
    /** Dotfolder under the install base, e.g. ".claude" */
    dir: string
    /** Dotfolder for skills when it differs from the agent config folder. */
    skillsDir?: string
    /** add-mcp agent identifier, if add-mcp can configure this agent's MCP. */
    addMcpClient?: string
}

/** The agents shown in the picker. Custom folders are added at runtime. */
export const AGENTS: Agent[] = [
    { id: "claude", label: "Claude Code", dir: ".claude", addMcpClient: "claude-code" },
    { id: "codex", label: "Codex", dir: ".codex", skillsDir: ".agents", addMcpClient: "codex" },
    { id: "cursor", label: "Cursor", dir: ".cursor", addMcpClient: "cursor" },
    { id: "amp", label: "Amp", dir: ".amp" }, // add-mcp has no Amp client — MCP set up manually
    { id: "opencode", label: "OpenCode", dir: ".opencode", addMcpClient: "opencode" },
    { id: "gemini", label: "Gemini CLI", dir: ".gemini", addMcpClient: "gemini-cli" },
    { id: "copilot", label: "Copilot", dir: ".copilot", addMcpClient: "github-copilot-cli" },
]

export function skillsDirFor(folder: string): string {
    return AGENTS.find((agent) => agent.dir === folder)?.skillsDir ?? folder
}

/**
 * Normalise a user-typed folder name to a single dotfolder segment.
 * "junie" and ".junie" both -> ".junie". Returns null for invalid input.
 */
export function normalizeFolder(input: string): string | null {
    let t = input.trim().replace(/^\.+/, "")
    if (!t || t.includes("/") || t.includes("\\")) return null
    return "." + t
}
