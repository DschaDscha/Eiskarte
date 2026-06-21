import { useEffect, useState } from "react";
import { api } from "../api.js";

function aggregateByItem(orders) {
  const totals = new Map();
  for (const order of orders) {
    for (const it of order.items) {
      const key = it.item_id ?? `name:${it.item_name}`;
      const existing = totals.get(key);
      if (existing) {
        existing.quantity += it.quantity;
      } else {
        totals.set(key, {
          name: it.item_name,
          image: it.item_image_path,
          quantity: it.quantity,
        });
      }
    }
  }
  return [...totals.values()].sort((a, b) => b.quantity - a.quantity);
}

export default function Entnahme() {
  const [totals, setTotals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function load() {
    setLoading(true);
    api
      .getOrders("open")
      .then((orders) => setTotals(aggregateByItem(orders)))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="entnahme">
      <div className="pickup__header">
        <h2>Entnahme aus dem Kühlschrank</h2>
        <button type="button" className="btn-secondary" onClick={load}>
          🔄 Aktualisieren
        </button>
      </div>

      {error && <p className="status-text status-text--error">{error}</p>}
      {loading ? (
        <p className="status-text">Lädt…</p>
      ) : totals.length === 0 ? (
        <p className="status-text">Keine offenen Bestellungen. 🍦</p>
      ) : (
        <ul className="entnahme__list">
          {totals.map((t) => (
            <li key={t.name} className="entnahme-card">
              <div className="entnahme-card__image">
                {t.image ? <img src={t.image} alt={t.name} /> : <span>🍨</span>}
              </div>
              <strong className="entnahme-card__name">{t.name}</strong>
              <span className="entnahme-card__qty">×{t.quantity}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
