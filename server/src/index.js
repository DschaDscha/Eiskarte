import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import itemsRouter from "./routes/items.js";
import ordersRouter from "./routes/orders.js";
import { requireAuth } from "./middleware/basicAuth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

app.use("/api/items", itemsRouter);
app.use("/api/orders", ordersRouter);

const clientDist = path.join(__dirname, "..", "..", "client", "dist");
app.get(["/admin", "/abholung"], requireAuth);
app.use(express.static(clientDist));
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(400).json({ error: err.message || "Unbekannter Fehler" });
});

app.listen(PORT, () => {
  console.log(`Eiskarte-Server läuft auf Port ${PORT}`);
});
