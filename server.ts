/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import http from "http";
import https from "https";
import path from "path";
import { createServer as createViteServer } from "vite";

const PORT = Number(process.env.PORT || 3000);
const BACKEND_URL = new URL(process.env.BACKEND_URL || "http://localhost:8080");

function proxyApiRequest(req: express.Request, res: express.Response) {
  const targetUrl = new URL(req.originalUrl, BACKEND_URL);
  const transport = targetUrl.protocol === "https:" ? https : http;

  const headers = { ...req.headers };
  delete headers.host;

  const proxyReq = transport.request(
    targetUrl,
    {
      method: req.method,
      headers,
    },
    (proxyRes) => {
      res.status(proxyRes.statusCode || 502);
      for (const [name, value] of Object.entries(proxyRes.headers)) {
        if (value !== undefined) {
          res.setHeader(name, value);
        }
      }
      proxyRes.pipe(res);
    }
  );

  proxyReq.on("error", (error) => {
    console.error(`Could not reach Spring Boot backend at ${BACKEND_URL.origin}`, error);
    if (!res.headersSent) {
      res.status(502).json({
        error: "Spring Boot backend is unavailable. Start the Java backend so MySQL-backed API requests can be served.",
      });
    }
  });

  req.pipe(proxyReq);
}

async function startServer() {
  const app = express();

  app.use("/api", proxyApiRequest);

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Web server running on http://localhost:${PORT}`);
    console.log(`API requests are proxied to the MySQL-backed Spring Boot backend at ${BACKEND_URL.origin}`);
  });
}

startServer();
