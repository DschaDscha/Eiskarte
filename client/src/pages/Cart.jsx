import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext.jsx";
import { api } from "../api.js";

export default function Cart() {
  const { lines, setQuantity, clearCart, totalCount } = useCart();
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Bitte gib deinen Namen ein.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await api.createOrder(
        name.trim(),
        lines.map((l) => ({ itemId: l.itemId, quantity: l.quantity }))
      );
      clearCart();
      setSuccess(true);
      setTimeout(() => navigate("/"), 1800);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="status-text status-text--success">
        🎉 Bestellung aufgegeben! Bis gleich am Eisstand.
      </div>
    );
  }

  if (totalCount === 0) {
    return <p className="status-text">Dein Warenkorb ist leer. Schau dir die Eiskarte an! 🍦</p>;
  }

  return (
    <div className="cart">
      <ul className="cart__list">
        {lines.map((line) => (
          <li key={line.itemId} className="cart__item">
            <div className="cart__item-image">
              {line.imagePath ? (
                <img src={line.imagePath} alt={line.name} />
              ) : (
                <span>🍨</span>
              )}
            </div>
            <div className="cart__item-info">
              <strong>{line.name}</strong>
              <span>{line.quantity}×</span>
            </div>
            <div className="qty-control qty-control--small">
              <button
                type="button"
                onClick={() =>
                  setQuantity(
                    { id: line.itemId, available: line.available },
                    line.quantity - 1
                  )
                }
              >
                −
              </button>
              <span className="qty-control__value">{line.quantity}</span>
              <button
                type="button"
                onClick={() =>
                  setQuantity(
                    { id: line.itemId, available: line.available },
                    line.quantity + 1
                  )
                }
                disabled={line.quantity >= line.available}
              >
                +
              </button>
            </div>
          </li>
        ))}
      </ul>

      <form className="cart__form" onSubmit={handleSubmit}>
        <label htmlFor="customer-name">Dein Name</label>
        <input
          id="customer-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="z. B. Mia"
          maxLength={60}
        />
        {error && <p className="status-text status-text--error">{error}</p>}
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? "Wird gesendet…" : `Bestellung aufgeben (${totalCount})`}
        </button>
      </form>
    </div>
  );
}
