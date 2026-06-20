import express from "express";
import { requireAuth } from "../middleware/basicAuth.js";

const router = express.Router();

router.get("/", requireAuth, async (req, res) => {
  const query = (req.query.q || "").trim();
  if (!query) {
    return res.status(400).json({ error: "Suchbegriff fehlt." });
  }

  const apiKey = process.env.GOOGLE_API_KEY;
  const cseId = process.env.GOOGLE_CSE_ID;
  if (!apiKey || !cseId) {
    return res.status(503).json({
      error:
        "Google-Bildersuche ist nicht konfiguriert (GOOGLE_API_KEY / GOOGLE_CSE_ID fehlen).",
    });
  }

  const url = new URL("https://www.googleapis.com/customsearch/v1");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("cx", cseId);
  url.searchParams.set("q", query);
  url.searchParams.set("searchType", "image");
  url.searchParams.set("num", "9");
  url.searchParams.set("safe", "active");

  try {
    const response = await fetch(url);
    if (!response.ok) {
      const body = await response.text();
      console.error("Google-Bildersuche fehlgeschlagen:", response.status, body);
      return res.status(502).json({ error: "Bildersuche ist fehlgeschlagen." });
    }
    const data = await response.json();
    const results = (data.items || []).map((item) => ({
      thumbnail: item.image?.thumbnailLink || item.link,
      fullImage: item.link,
      title: item.title,
      sourcePage: item.image?.contextLink,
    }));
    res.json(results);
  } catch (err) {
    console.error("Google-Bildersuche fehlgeschlagen:", err);
    res.status(502).json({ error: "Bildersuche ist fehlgeschlagen." });
  }
});

export default router;
