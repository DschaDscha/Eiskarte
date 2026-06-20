import express from "express";
import { db } from "../db.js";

const router = express.Router();

function getOrderWithItems(orderId) {
  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(orderId);
  if (!order) return null;
  const items = db
    .prepare("SELECT * FROM order_items WHERE order_id = ?")
    .all(orderId);
  return { ...order, items };
}

router.get("/", (req, res) => {
  const { status } = req.query;
  const orders = status
    ? db.prepare("SELECT * FROM orders WHERE status = ? ORDER BY created_at ASC").all(status)
    : db.prepare("SELECT * FROM orders ORDER BY created_at ASC").all();

  const result = orders.map((order) => ({
    ...order,
    items: db.prepare("SELECT * FROM order_items WHERE order_id = ?").all(order.id),
  }));
  res.json(result);
});

const createOrder = db.transaction((customerName, items) => {
  for (const { itemId, quantity } of items) {
    const item = db.prepare("SELECT * FROM items WHERE id = ?").get(itemId);
    if (!item) {
      throw new Error(`Artikel ${itemId} existiert nicht.`);
    }
    const reserved = db
      .prepare(
        `SELECT COALESCE(SUM(oi.quantity), 0) AS reserved
         FROM order_items oi JOIN orders o ON o.id = oi.order_id
         WHERE oi.item_id = ? AND o.status = 'open'`
      )
      .get(itemId).reserved;
    const available = item.stock - reserved;
    if (quantity > available) {
      throw new Error(`Von "${item.name}" sind nur noch ${Math.max(0, available)} verfügbar.`);
    }
  }

  const orderResult = db
    .prepare("INSERT INTO orders (customer_name, status) VALUES (?, 'open')")
    .run(customerName);
  const orderId = orderResult.lastInsertRowid;

  const insertOrderItem = db.prepare(
    `INSERT INTO order_items (order_id, item_id, quantity, item_name, item_description, item_image_path)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  for (const { itemId, quantity } of items) {
    const item = db.prepare("SELECT * FROM items WHERE id = ?").get(itemId);
    insertOrderItem.run(orderId, itemId, quantity, item.name, item.description, item.image_path);
  }

  return orderId;
});

router.post("/", (req, res) => {
  const { customer_name, items } = req.body;
  if (!customer_name || !customer_name.trim()) {
    return res.status(400).json({ error: "Name ist erforderlich." });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Der Warenkorb ist leer." });
  }
  for (const it of items) {
    if (!it.itemId || !Number.isInteger(it.quantity) || it.quantity <= 0) {
      return res.status(400).json({ error: "Ungültige Warenkorb-Position." });
    }
  }

  try {
    const orderId = createOrder(customer_name.trim(), items);
    res.status(201).json(getOrderWithItems(orderId));
  } catch (err) {
    res.status(409).json({ error: err.message });
  }
});

const completeOrder = db.transaction((orderId) => {
  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(orderId);
  if (!order) throw new Error("NOT_FOUND");
  if (order.status === "done") return;

  const items = db.prepare("SELECT * FROM order_items WHERE order_id = ?").all(orderId);
  for (const oi of items) {
    db.prepare("UPDATE items SET stock = MAX(0, stock - ?) WHERE id = ?").run(
      oi.quantity,
      oi.item_id
    );
  }
  db.prepare(
    "UPDATE orders SET status = 'done', completed_at = datetime('now') WHERE id = ?"
  ).run(orderId);
});

router.patch("/:id/complete", (req, res) => {
  try {
    completeOrder(req.params.id);
  } catch (err) {
    if (err.message === "NOT_FOUND") {
      return res.status(404).json({ error: "Bestellung nicht gefunden." });
    }
    return res.status(500).json({ error: "Fehler beim Abschließen der Bestellung." });
  }
  res.json(getOrderWithItems(req.params.id));
});

const reopenOrder = db.transaction((orderId) => {
  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(orderId);
  if (!order) throw new Error("NOT_FOUND");
  if (order.status === "open") return;

  const items = db.prepare("SELECT * FROM order_items WHERE order_id = ?").all(orderId);
  for (const oi of items) {
    db.prepare("UPDATE items SET stock = stock + ? WHERE id = ?").run(oi.quantity, oi.item_id);
  }
  db.prepare("UPDATE orders SET status = 'open', completed_at = NULL WHERE id = ?").run(orderId);
});

router.patch("/:id/reopen", (req, res) => {
  try {
    reopenOrder(req.params.id);
  } catch (err) {
    if (err.message === "NOT_FOUND") {
      return res.status(404).json({ error: "Bestellung nicht gefunden." });
    }
    return res.status(500).json({ error: "Fehler beim Wiedereröffnen der Bestellung." });
  }
  res.json(getOrderWithItems(req.params.id));
});

export default router;
