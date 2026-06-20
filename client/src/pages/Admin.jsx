import { useEffect, useState } from "react";
import { api } from "../api.js";

const emptyForm = { name: "", description: "", stock: "0" };

export default function Admin() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  function loadItems() {
    setLoading(true);
    api
      .getItems()
      .then(setItems)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadItems();
  }, []);

  function resetForm() {
    setForm(emptyForm);
    setImageFile(null);
    setSelectedImageUrl(null);
    setSearchResults([]);
    setSearchQuery("");
    setSearchError("");
    setEditingId(null);
  }

  function startEdit(item) {
    setEditingId(item.id);
    setForm({ name: item.name, description: item.description, stock: String(item.stock) });
    setImageFile(null);
    setSelectedImageUrl(null);
    setSearchResults([]);
    setSearchQuery(item.description || item.name);
    setSearchError("");
  }

  async function handleSearchImages() {
    const query = searchQuery.trim() || form.description.trim() || form.name.trim();
    if (!query) {
      setSearchError("Bitte erst eine Beschreibung oder einen Namen eingeben.");
      return;
    }
    setSearching(true);
    setSearchError("");
    try {
      const results = await api.searchImages(query);
      setSearchResults(results);
    } catch (err) {
      setSearchError(err.message);
    } finally {
      setSearching(false);
    }
  }

  function selectSearchResult(result) {
    setSelectedImageUrl(result.fullImage);
    setImageFile(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Name ist erforderlich.");
      return;
    }
    setSaving(true);
    setError("");
    const fd = new FormData();
    fd.append("name", form.name);
    fd.append("description", form.description);
    fd.append("stock", form.stock);
    if (imageFile) {
      fd.append("image", imageFile);
    } else if (selectedImageUrl) {
      fd.append("imageUrl", selectedImageUrl);
    }

    try {
      if (editingId) {
        await api.updateItem(editingId, fd);
      } else {
        await api.createItem(fd);
      }
      resetForm();
      loadItems();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item) {
    if (!confirm(`"${item.name}" wirklich löschen?`)) return;
    try {
      await api.deleteItem(item.id);
      loadItems();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="admin">
      <form className="admin__form" onSubmit={handleSubmit}>
        <h2>{editingId ? "Eissorte bearbeiten" : "Neue Eissorte"}</h2>
        <label>
          Name
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="z. B. Erdbeer-Sahne"
          />
        </label>
        <label>
          Beschreibung
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="z. B. Cremiges Erdbeereis mit frischer Sahne"
            rows={2}
          />
        </label>
        <label>
          Bestand (Anzahl verfügbar)
          <input
            type="number"
            min="0"
            value={form.stock}
            onChange={(e) => setForm({ ...form, stock: e.target.value })}
          />
        </label>
        <label>
          Foto
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              setImageFile(e.target.files?.[0] ?? null);
              setSelectedImageUrl(null);
            }}
          />
        </label>

        {selectedImageUrl && (
          <div className="admin__image-preview">
            <img src={selectedImageUrl} alt="Ausgewähltes Bild" />
            <button type="button" onClick={() => setSelectedImageUrl(null)}>
              Auswahl entfernen
            </button>
          </div>
        )}

        <div className="admin__image-search">
          <label>
            Oder Bild online suchen
            <div className="admin__image-search-row">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="z. B. Erdbeereis"
              />
              <button type="button" onClick={handleSearchImages} disabled={searching}>
                {searching ? "Suche…" : "Suchen"}
              </button>
            </div>
          </label>
          {searchError && <p className="status-text status-text--error">{searchError}</p>}
          {searchResults.length > 0 && (
            <div className="admin__image-results">
              {searchResults.map((result, i) => (
                <button
                  type="button"
                  key={i}
                  className="admin__image-result"
                  onClick={() => selectSearchResult(result)}
                  title={result.title}
                >
                  <img src={result.thumbnail} alt={result.title} />
                </button>
              ))}
            </div>
          )}
        </div>

        {error && <p className="status-text status-text--error">{error}</p>}
        <div className="admin__form-actions">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Speichern…" : editingId ? "Änderungen speichern" : "Hinzufügen"}
          </button>
          {editingId && (
            <button type="button" className="btn-secondary" onClick={resetForm}>
              Abbrechen
            </button>
          )}
        </div>
      </form>

      <h2 className="admin__list-title">Aktuelle Eiskarte</h2>
      {loading ? (
        <p className="status-text">Lädt…</p>
      ) : (
        <ul className="admin__list">
          {items.map((item) => (
            <li key={item.id} className="admin__list-item">
              <div className="admin__list-image">
                {item.image_path ? (
                  <img src={item.image_path} alt={item.name} />
                ) : (
                  <span>🍨</span>
                )}
              </div>
              <div className="admin__list-info">
                <strong>{item.name}</strong>
                <span>{item.description}</span>
                <span className="admin__list-stock">Bestand: {item.stock}</span>
              </div>
              <div className="admin__list-actions">
                <button type="button" onClick={() => startEdit(item)}>
                  ✏️
                </button>
                <button type="button" onClick={() => handleDelete(item)}>
                  🗑️
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
