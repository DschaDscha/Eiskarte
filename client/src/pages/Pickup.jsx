import { useEffect, useState } from "react";
import { api } from "../api.js";

export default function Pickup() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showDone, setShowDone] = useState(false);

  function loadOrders() {
    setLoading(true);
    api
      .getOrders()
      .then(setOrders)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadOrders();
  }, []);

  async function toggleComplete(order) {
    try {
      if (order.status === "open") {
        await api.completeOrder(order.id);
      } else {
        await api.reopenOrder(order.id);
      }
      loadOrders();
    } catch (err) {
      setError(err.message);
    }
  }

  const visibleOrders = orders.filter((o) => (showDone ? true : o.status === "open"));
  const openCount = orders.filter((o) => o.status === "open").length;

  return (
    <div className="pickup">
      <div className="pickup__header">
        <h2>Offene Bestellungen ({openCount})</h2>
        <label className="pickup__toggle">
          <input
            type="checkbox"
            checked={showDone}
            onChange={(e) => setShowDone(e.target.checked)}
          />
          Erledigte anzeigen
        </label>
      </div>

      {error && <p className="status-text status-text--error">{error}</p>}
      {loading ? (
        <p className="status-text">Lädt…</p>
      ) : visibleOrders.length === 0 ? (
        <p className="status-text">Keine Bestellungen vorhanden. 🍦</p>
      ) : (
        <ul className="pickup__list">
          {visibleOrders.map((order) => (
            <li
              key={order.id}
              className={`pickup-card ${order.status === "done" ? "pickup-card--done" : ""}`}
            >
              <div className="pickup-card__header">
                <h3>👤 {order.customer_name}</h3>
                <span className="pickup-card__time">
                  {new Date(order.created_at).toLocaleTimeString("de-DE", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <ul className="pickup-card__items">
                {order.items.map((it) => (
                  <li key={it.id} className="pickup-card__item">
                    <div className="pickup-card__item-image">
                      {it.item_image_path ? (
                        <img src={it.item_image_path} alt={it.item_name} />
                      ) : (
                        <span>🍨</span>
                      )}
                    </div>
                    <div className="pickup-card__item-info">
                      <strong>{it.item_name}</strong>
                      {it.item_description && <p>{it.item_description}</p>}
                    </div>
                    <span className="pickup-card__item-qty">×{it.quantity}</span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className={order.status === "open" ? "btn-primary" : "btn-secondary"}
                onClick={() => toggleComplete(order)}
              >
                {order.status === "open" ? "✅ Als erledigt markieren" : "↩️ Wieder öffnen"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
