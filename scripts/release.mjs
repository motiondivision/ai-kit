#!/usr/bin/env node

/*
 * Publishes a new motion-ai version to npm.
 *
 *   npm run new              # minor bump, e.g. 14.1.0 -> 14.2.0
 *   npm run new -- patch     # or major, or an exact version like 14.2.1
 *   npm run new -- --dry-run # run every check and pack, publish nothing
 *
 * Bumps the version, validates the plugin, builds, commits, publishes and
 * pushes main. Stops before changing anything if the tree is dirty, main is
 * behind GitHub, or npm isn't logged in.
 */

import { execSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const pkgPath = join(root, "packages", "motion-ai", "package.json")

const args = process.argv.slice(2)
const dryRun = args.includes("--dry-run")
const bump = args.find((arg) => !arg.startsWith("--")) ?? "minor"

function run(command, options = {}) {
    console.log(`\n$ ${command}`)
    return execSync(command, { cwd: root, stdio: "inherit", ...options })
}

function read(command) {
    return execSync(command, { cwd: root, encoding: "utf8" }).trim()
}

function fail(message) {
    console.error(`\n✗ ${message}`)
    process.exit(1)
}

function version() {
    return JSON.parse(readFileSync(pkgPath, "utf8")).version
}

// Preflight: nothing below this block changes anything.
if (read("git rev-parse --abbrev-ref HEAD") !== "main") {
    fail("Switch to main before releasing.")
}

const dirty = read("git status --porcelain")
if (dirty) fail(`Commit or stash these first:\n${dirty}`)

run("git fetch origin main")
if (read("git rev-list --count HEAD..origin/main") !== "0") {
    fail("main is behind origin/main. Run `git pull` first.")
}

if (!dryRun) {
    try {
        read("npm whoami")
    } catch {
        fail("npm isn't logged in. Run `npm login` and try again.")
    }
}

const from = version()
run(`npm version ${bump} -w motion-ai --no-git-tag-version`, { stdio: "ignore" })
const to = version()
console.log(`\nmotion-ai ${from} → ${to}`)

try {
    run("npm run validate")
    run("npm run build")
} catch {
    run("git checkout -- package-lock.json packages/motion-ai/package.json")
    fail(`Build or validation failed. Version reset to ${from}.`)
}

if (dryRun) {
    run("npm pack --dry-run -w motion-ai")
    run("git checkout -- package-lock.json packages/motion-ai/package.json")
    console.log(`\n✓ Dry run passed. Version reset to ${from}.`)
    process.exit(0)
}

try {
    run("npm publish -w motion-ai")
} catch {
    run("git checkout -- package-lock.json packages/motion-ai/package.json")
    fail(`npm publish failed. Version reset to ${from}.`)
}

run("git add package-lock.json packages/motion-ai/package.json")
run(`git commit -m "motion-ai v${to}"`)
run("git push origin main")

console.log(`\n✓ Published motion-ai@${to} and pushed main.`)
