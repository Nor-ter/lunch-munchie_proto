import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import apiRoutes from "./routes.js";
import { loadFeatures } from "./loadFeatures.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  app.use(express.json());
  const server = createServer(app);

  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));
  // 팀 드라이브에서 수집한 실사진 — 드라이브 핫링크는 스로틀링되므로 우리 서버가 직접 서빙한다.
  app.use("/photos", express.static(path.resolve(__dirname, "data", "photos"), { maxAge: "7d", immutable: true }));
  app.use("/api", apiRoutes);

  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"), (err) => {
      if (err && !res.headersSent) {
        res.status(404).send("Not found");
      }
    });
  });

  const port = process.env.PORT || 3000;

  // 피처 스토어 적재 (콜드스타트 해소). 실패해도 카테고리 룰로 동작하므로 서버 기동을 막지 않는다.
  loadFeatures()
    .then(({ count, source }) =>
      console.log(count ? `피처 스토어 ${count}곳 로드 (${source})` : "피처 스토어 없음 — 카테고리 룰 폴백")
    )
    .catch(() => console.log("피처 스토어 로드 실패 — 카테고리 룰 폴백"));

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
