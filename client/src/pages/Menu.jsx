import { useEffect, useState } from "react";
import { api } from "../api.js";
import { useCart } from "../context/CartContext.jsx";

export default function Menu() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { getQuantity, setQuantity } = useCart();

  useEffect(() => {
    api
      .getItems()
      .then(setItems)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="status-text">Eiskarte wird geladen…</p>;
  if (error) return <p className="status-text status-text--error">{error}</p>;
  if (items.length === 0)
    return <p className="status-text">Noch keine Eissorten in der Karte. 🍦</p>;

  return (
    <div className="menu-grid">
      {items.map((item) => {
        const qty = getQuantity(item.id);
        const soldOut = item.available <= 0;
        return (
          <div key={item.id} className={`menu-card ${soldOut ? "menu-card--soldout" : ""}`}>
            <div className="menu-card__image">
              {item.image_path ? (
                <img src={item.image_path} alt={item.name} />
              ) : (
                <span className="menu-card__placeholder">🍨</span>
              )}
              {soldOut && <span className="menu-card__badge">Ausverkauft</span>}
            </div>
            <div className="menu-card__body">
              <h3>{item.name}</h3>
              {item.description && <p className="menu-card__desc">{item.description}</p>}
              <p className="menu-card__stock">
                {soldOut ? "Nicht verfügbar" : `${item.available} verfügbar`}
              </p>
            </div>
            <div className="qty-control">
              <button
                type="button"
                onClick={() => setQuantity(item, qty - 1)}
                disabled={qty <= 0}
                aria-label={`${item.name} entfernen`}
              >
                −
              </button>
              <span className="qty-control__value">{qty}</span>
              <button
                type="button"
                onClick={() => setQuantity(item, qty + 1)}
                disabled={qty >= item.available}
                aria-label={`${item.name} hinzufügen`}
              >
                +
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
