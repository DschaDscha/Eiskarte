async function request(path, options = {}) {
  const res = await fetch(`/api${path}`, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Anfrage fehlgeschlagen (${res.status})`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  getItems: () => request("/items"),
  createItem: (formData) =>
    request("/items", { method: "POST", body: formData }),
  updateItem: (id, formData) =>
    request(`/items/${id}`, { method: "PUT", body: formData }),
  deleteItem: (id) => request(`/items/${id}`, { method: "DELETE" }),

  getOrders: (status) => request(`/orders${status ? `?status=${status}` : ""}`),
  createOrder: (customerName, items) =>
    request("/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customer_name: customerName, items }),
    }),
  completeOrder: (id) => request(`/orders/${id}/complete`, { method: "PATCH" }),
  reopenOrder: (id) => request(`/orders/${id}/reopen`, { method: "PATCH" }),
};
