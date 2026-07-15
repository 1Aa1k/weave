// Custom server entrypoint. The `next dev` CLI keeps itself alive via stdin
// and exits when run detached (no TTY); owning the http server ourselves
// pins the event loop instead. Run: node server.js [port]
const { createServer } = require("node:http");
const next = require("next");

const port = Number(process.argv[2] ?? process.env.PORT ?? 5317);
const dev = process.env.NODE_ENV !== "production";

const app = next({ dev, dir: __dirname });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => handle(req, res)).listen(port, () => {
    console.log(`weave ${dev ? "dev" : "prod"} server on http://localhost:${port}`);
  });
});
