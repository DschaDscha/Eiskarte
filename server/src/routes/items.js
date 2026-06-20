import express from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { db } from "../db.js";
import { requireAuth } from "../middleware/basicAuth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, "..", "..", "uploads");
fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|png|webp|gif|heic|heif)$/.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Nur Bilddateien sind erlaubt."));
    }
  },
});

const router = express.Router();

const ALLOWED_IMAGE_TYPES = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

async function downloadImage(imageUrl) {
  let response;
  try {
    response = await fetch(imageUrl);
  } catch {
    throw new Error("Bild konnte nicht heruntergeladen werden.");
  }
  if (!response.ok) {
    throw new Error("Bild konnte nicht heruntergeladen werden.");
  }
  const contentType = response.headers.get("content-type")?.split(";")[0]?.trim();
  const ext = ALLOWED_IMAGE_TYPES[contentType];
  if (!ext) {
    throw new Error("Nur Bilddateien sind erlaubt.");
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > 8 * 1024 * 1024) {
    throw new Error("Bild ist zu groß (max. 8 MB).");
  }
  const filename = `${crypto.randomUUID()}${ext}`;
  await fs.promises.writeFile(path.join(uploadsDir, filename), buffer);
  return filename;
}

const reservedSubquery = `(
  SELECT COALESCE(SUM(oi.quantity), 0)
  FROM order_items oi
  JOIN orders o ON o.id = oi.order_id
  WHERE oi.item_id = items.id AND o.status = 'open'
)`;

function withAvailability(row) {
  return {
    ...row,
    available: Math.max(0, row.stock - row.reserved),
  };
}

router.get("/", (req, res) => {
  const rows = db
    .prepare(
      `SELECT id, name, description, image_path, stock, ${reservedSubquery} AS reserved, created_at
       FROM items ORDER BY created_at DESC`
    )
    .all();
  res.json(rows.map(withAvailability));
});

router.post("/", requireAuth, upload.single("image"), async (req, res) => {
  const { name, description = "", stock = 0, imageUrl } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Name ist erforderlich." });
  }
  const stockNum = Number.parseInt(stock, 10);
  if (Number.isNaN(stockNum) || stockNum < 0) {
    return res.status(400).json({ error: "Bestand muss eine positive Zahl sein." });
  }
  let imagePath = req.file ? `/uploads/${req.file.filename}` : null;
  if (!imagePath && imageUrl) {
    try {
      imagePath = `/uploads/${await downloadImage(imageUrl)}`;
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }
  const result = db
    .prepare(
      `INSERT INTO items (name, description, image_path, stock) VALUES (?, ?, ?, ?)`
    )
    .run(name.trim(), description.trim(), imagePath, stockNum);
  const row = db
    .prepare(
      `SELECT id, name, description, image_path, stock, ${reservedSubquery} AS reserved, created_at
       FROM items WHERE id = ?`
    )
    .get(result.lastInsertRowid);
  res.status(201).json(withAvailability(row));
});

router.put("/:id", requireAuth, upload.single("image"), async (req, res) => {
  const item = db.prepare("SELECT * FROM items WHERE id = ?").get(req.params.id);
  if (!item) return res.status(404).json({ error: "Artikel nicht gefunden." });

  const name = req.body.name !== undefined ? req.body.name.trim() : item.name;
  const description =
    req.body.description !== undefined ? req.body.description.trim() : item.description;
  let stock = item.stock;
  if (req.body.stock !== undefined) {
    const stockNum = Number.parseInt(req.body.stock, 10);
    if (Number.isNaN(stockNum) || stockNum < 0) {
      return res.status(400).json({ error: "Bestand muss eine positive Zahl sein." });
    }
    stock = stockNum;
  }

  let imagePath = item.image_path;
  if (req.file) {
    imagePath = `/uploads/${req.file.filename}`;
  } else if (req.body.imageUrl) {
    try {
      imagePath = `/uploads/${await downloadImage(req.body.imageUrl)}`;
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }
  if (imagePath !== item.image_path && item.image_path) {
    const oldFile = path.join(uploadsDir, path.basename(item.image_path));
    fs.unlink(oldFile, () => {});
  }

  db.prepare(
    `UPDATE items SET name = ?, description = ?, image_path = ?, stock = ? WHERE id = ?`
  ).run(name, description, imagePath, stock, item.id);

  const row = db
    .prepare(
      `SELECT id, name, description, image_path, stock, ${reservedSubquery} AS reserved, created_at
       FROM items WHERE id = ?`
    )
    .get(item.id);
  res.json(withAvailability(row));
});

router.delete("/:id", requireAuth, (req, res) => {
  const item = db.prepare("SELECT * FROM items WHERE id = ?").get(req.params.id);
  if (!item) return res.status(404).json({ error: "Artikel nicht gefunden." });
  db.prepare("DELETE FROM items WHERE id = ?").run(item.id);
  if (item.image_path) {
    const file = path.join(uploadsDir, path.basename(item.image_path));
    fs.unlink(file, () => {});
  }
  res.status(204).end();
});

export default router;
