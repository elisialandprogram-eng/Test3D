import express from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(__dirname, "..", "..", "eternal-kingdoms");

process.env.BASE_PATH = "/";
process.env.PORT = process.env.PORT ?? "8080";
process.env.NODE_ENV = "development";

const app = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

const vite = await createViteServer({
  configFile: path.resolve(frontendRoot, "vite.config.ts"),
  root: frontendRoot,
  server: {
    middlewareMode: true,
    hmr: false,
  },
  appType: "custom",
});

app.use(vite.middlewares);

app.use(async (req, res, next) => {
  try {
    const url = req.originalUrl;
    let template = fs.readFileSync(
      path.resolve(frontendRoot, "index.html"),
      "utf-8",
    );
    template = await vite.transformIndexHtml(url, template);
    res.status(200).set({ "Content-Type": "text/html" }).end(template);
  } catch (e) {
    vite.ssrFixStacktrace(e as Error);
    next(e);
  }
});

const port = Number(process.env.PORT ?? "8080");
app.listen(port, "0.0.0.0", () => {
  logger.info(`Dev server with Vite middleware running on port ${port}`);
});
