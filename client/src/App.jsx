import { Routes, Route, NavLink } from "react-router-dom";
import Menu from "./pages/Menu.jsx";
import Cart from "./pages/Cart.jsx";
import Admin from "./pages/Admin.jsx";
import Pickup from "./pages/Pickup.jsx";
import Entnahme from "./pages/Entnahme.jsx";
import { useCart } from "./context/CartContext.jsx";

export default function App() {
  const { totalCount } = useCart();

  return (
    <div className="app-shell">
      <header className="app-header">
        <span className="app-header__logo">🍦 Eiskarte</span>
      </header>

      <main className="app-main">
        <Routes>
          <Route path="/" element={<Menu />} />
          <Route path="/warenkorb" element={<Cart />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/abholung" element={<Pickup />} />
          <Route path="/entnahme" element={<Entnahme />} />
        </Routes>
      </main>

      <nav className="bottom-nav">
        <NavLink to="/" className="bottom-nav__item" end>
          <span className="bottom-nav__icon">🍨</span>
          <span>Karte</span>
        </NavLink>
        <NavLink to="/warenkorb" className="bottom-nav__item">
          <span className="bottom-nav__icon">
            🧺
            {totalCount > 0 && <span className="bottom-nav__badge">{totalCount}</span>}
          </span>
          <span>Warenkorb</span>
        </NavLink>
        <NavLink to="/abholung" className="bottom-nav__item">
          <span className="bottom-nav__icon">📋</span>
          <span>Abholung</span>
        </NavLink>
        <NavLink to="/entnahme" className="bottom-nav__item">
          <span className="bottom-nav__icon">🧊</span>
          <span>Entnahme</span>
        </NavLink>
        <NavLink to="/admin" className="bottom-nav__item">
          <span className="bottom-nav__icon">⚙️</span>
          <span>Admin</span>
        </NavLink>
      </nav>
    </div>
  );
}
