const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const UPLOAD_DIR = path.join(ROOT, "uploads");
const DATA_DIR = path.join(ROOT, "data");
const DB_FILE = path.join(DATA_DIR, "videos.json");

for (const dir of [UPLOAD_DIR, DATA_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, "[]", "utf8");

app.use(express.json({ limit: "1mb" }));
app.use("/uploads", express.static(UPLOAD_DIR));
app.use(express.static(path.join(ROOT, "public")));

function readVideos() {
  try { return JSON.parse(fs.readFileSync(DB_FILE, "utf8")); }
  catch { return []; }
}
function saveVideos(videos) {
  fs.writeFileSync(DB_FILE, JSON.stringify(videos, null, 2), "utf8");
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".mp4";
    const safe = Date.now() + "-" + Math.random().toString(36).slice(2, 9) + ext;
    cb(null, safe);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("video/")) return cb(new Error("Тек видео файл жүктеуге болады."));
    cb(null, true);
  }
});

app.get("/api/videos", (_req, res) => {
  res.json(readVideos().sort((a,b) => b.createdAt - a.createdAt));
});

app.post("/api/videos", upload.single("video"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Видео файлын таңда." });
  const title = String(req.body.title || "Атаусыз видео").trim().slice(0, 100);
  const category = String(req.body.category || "Басқа").trim().slice(0, 40);
  const isShort = req.body.isShort === "true";
  const video = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    title, category, isShort,
    url: "/uploads/" + req.file.filename,
    originalName: req.file.originalname,
    likes: 0, createdAt: Date.now()
  };
  const videos = readVideos();
  videos.push(video);
  saveVideos(videos);
  res.status(201).json(video);
});

app.post("/api/videos/:id/like", (req, res) => {
  const videos = readVideos();
  const video = videos.find(v => v.id === req.params.id);
  if (!video) return res.status(404).json({ error: "Видео табылмады." });
  video.likes = (video.likes || 0) + 1;
  saveVideos(videos);
  res.json({ likes: video.likes });
});

app.get("*", (_req, res) => res.sendFile(path.join(ROOT, "public", "index.html")));

app.use((err, _req, res, _next) => {
  res.status(400).json({ error: err.message || "Қате орын алды." });
});

app.listen(PORT, () => console.log(`QazaqTube іске қосылды: http://localhost:${PORT}`));
