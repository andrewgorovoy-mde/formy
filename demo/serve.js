#!/usr/bin/env node
// Zero-dependency static file server for demo/scholarship-site.html, so the
// full loop (creator publishes -> embeds on a page -> agent applies) can run
// entirely locally without any external tooling.

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const PORT = Number(process.env.DEMO_PORT) || 4000;
const ROOT = __dirname;

const server = http.createServer((req, res) => {
  const urlPath = req.url === "/" ? "/scholarship-site.html" : req.url;
  const filePath = path.join(ROOT, path.normalize(urlPath).replace(/^(\.\.[/\\])+/, ""));

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not found");
      return;
    }
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Demo scholarship site running at http://localhost:${PORT}/`);
});
