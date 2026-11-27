#!/usr/bin/env node

/*
 * Copies the AI Kit content out of plugins/motion into this package's
 * content/ directory so it ships inside the npm tarball. plugins/motion is
 * the single source of truth — shared with the Cursor marketplace plugin —
 * and content/ is generated, gitignored and rebuilt on every build.
 */

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), "..")
const pluginRoot = join(pkgRoot, "..", "..", "plugins", "motion")
const contentDir = join(pkgRoot, "content")
const serverSkillsDir = join(pkgRoot, "..", "..", "skills")

if (!existsSync(pluginRoot)) {
    console.error(`plugins/motion not found at ${pluginRoot}`)
    process.exit(1)
}

rmSync(contentDir, { recursive: true, force: true })
for (const dir of ["skills", "rules", "agents"]) {
    const src = join(pluginRoot, dir)
    if (existsSync(src)) cpSync(src, join(contentDir, dir), { recursive: true })
}

/*
 * Stubs: one small local skill per skill the Motion MCP server serves, for
 * hosts that do not list MCP skills (Codex, Cursor, Claude Code on Team and
 * Enterprise plans). Each has the server skill's description, so the model
 * picks it for the same requests, and a body that reads the served skill.
 * The text lives on the server, so it stays current without a release.
 */
function descriptionOf(skillMd, where) {
    const line = skillMd.split("\n").find((l) => l.startsWith("description: "))
    if (!line) throw new Error(`${where}: no description`)
    const raw = line.slice("description: ".length).trim()
    return raw.startsWith('"') ? JSON.parse(raw) : raw
}

const served = []
for (const name of readdirSync(serverSkillsDir).sort()) {
    const skillMd = join(serverSkillsDir, name, "SKILL.md")
    if (existsSync(skillMd)) {
        served.push({ name, description: descriptionOf(readFileSync(skillMd, "utf8"), name) })
    }
}
served.push(...JSON.parse(readFileSync(join(pluginRoot, "server-skills.json"), "utf8")).skills)

for (const { name, description } of served) {
    const dir = join(contentDir, "stubs", `motion-${name}`)
    mkdirSync(dir, { recursive: true })
    writeFileSync(
        join(dir, "SKILL.md"),
        `---\nname: motion-${name}\ndescription: ${JSON.stringify(description)}\n---\n\n` +
            `# Motion: ${name}\n\n` +
            `This skill is served by the \`motion\` MCP server, so it is always current.\n\n` +
            `Read \`skill://motion/${name}/SKILL.md\` from the \`motion\` MCP server with\n` +
            `resources/read (in Claude Code, with ReadMcpResourceTool) and follow it.\n` +
            `Read every file it names the same way.\n\n` +
            `If there is no \`motion\` MCP server, tell the user it is not connected and\n` +
            `point them at https://motion.dev/docs/ai-kit. Running \`npx motion-ai\`\n` +
            `again sets it up.\n`
    )
}
console.log(`Synced plugins/motion content and ${served.length} stubs into ${contentDir}`)
