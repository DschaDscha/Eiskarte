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

router.post("/", requireAuth, upload.single("image"), (req, res) => {
  const { name, description = "", stock = 0 } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Name ist erforderlich." });
  }
  const stockNum = Number.parseInt(stock, 10);
  if (Number.isNaN(stockNum) || stockNum < 0) {
    return res.status(400).json({ error: "Bestand muss eine positive Zahl sein." });
  }
  const imagePath = req.file ? `/uploads/${req.file.filename}` : null;
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

router.put("/:id", requireAuth, upload.single("image"), (req, res) => {
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
    if (item.image_path) {
      const oldFile = path.join(uploadsDir, path.basename(item.image_path));
      fs.unlink(oldFile, () => {});
    }
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
