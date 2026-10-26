import { readFile } from "node:fs/promises"
import { createServer } from "node:http"
import { createRequire } from "node:module"
import { dirname, extname, join } from "node:path"
import { fileURLToPath } from "node:url"

const require = createRequire(import.meta.url)
const fixtures = fileURLToPath(new URL("./fixtures/", import.meta.url))
const dist = (pkg, file) =>
    join(dirname(require.resolve(pkg + "/package.json")), file)

// Production builds, as an agent would meet them on a real site
const scripts = {
    "/motion.js": dist("motion", "dist/motion.js"),
    "/framer-motion.js": dist("framer-motion", "dist/framer-motion.js"),
    "/react.js": dist("react", "umd/react.production.min.js"),
    "/react-dom.js": dist("react-dom", "umd/react-dom.production.min.js"),
}

const types = { ".html": "text/html", ".js": "text/javascript" }

/**
 * Serves the fixtures, plus Motion's and React's UMD builds.
 */
export async function serve() {
    const server = createServer(async (req, res) => {
        const path = new URL(req.url, "http://localhost").pathname
        const file = scripts[path] || join(fixtures, path)
        try {
            const body = await readFile(file)
            res.writeHead(200, { "content-type": types[extname(file)] || "" })
            res.end(body)
        } catch {
            res.writeHead(404).end()
        }
    })
    await new Promise((resolve) => server.listen(0, resolve))
    return {
        url: `http://localhost:${server.address().port}`,
        close: () => new Promise((resolve) => server.close(resolve)),
    }
}
