import React, { useEffect, useState } from "react";
import { projectsAPI } from "../api/endpoints";

const btnPrimary = {
  padding: "8px 16px",
  background: "#059669",
  color: "#fff",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
  fontWeight: "500",
};

const btnEdit = {
  padding: "6px 12px",
  background: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
};

const btnDelete = {
  padding: "6px 12px",
  background: "#dc2626",
  color: "white",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
};

const overlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  background: "rgba(0,0,0,0.5)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 9999,
};

const modalStyle = {
  background: "white",
  padding: "20px",
  borderRadius: "10px",
  width: "320px",
};

const Products = () => {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isEdit, setIsEdit] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    is_active: false,
  });

  const inputStyle = {
    padding: "10px",
    borderRadius: "6px",
    border: "1px solid #ccc",
    outline: "none",
    fontSize: "14px",
    width: "100%",
  };

  const fetchProducts = async () => {
    try {
      setError(null);
      const res = await projectsAPI.list();
      setProducts(res || []);
    } catch (err) {
      setError("Failed to load products");
    }
  };

  const fetchProductDetails = async (project_id) => {
    if (!project_id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await projectsAPI.get(project_id);
      setSelectedProduct(res);
    } catch (err) {
      setError("Failed to load product details");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const payload = {
        ...form,
        price: Number(form.price),
      };

      if (isEdit) {
        await projectsAPI.update(selectedProduct.project_id, payload);
      } else {
        await projectsAPI.create(payload);
      }

      setShowModal(false);
      setForm({ name: "", description: "", price: "", is_active: false });
      setIsEdit(false);
      fetchProducts();
    } catch {
      setError("Operation failed");
    }
  };

  const handleDelete = async () => {
    try {
      await projectsAPI.delete(selectedProduct.project_id);
      setDeleteConfirm(false);
      setSelectedProduct(null);
      fetchProducts();
    } catch {
      setError("Delete failed");
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ fontSize: "24px", fontWeight: "bold" }}>Projects</h2>

        <button
          onClick={() => {
            setIsEdit(false);
            setForm({ name: "", description: "", price: "", is_active: false });
            setShowModal(true);
          }}
          style={btnPrimary}
        >
          + Add Project
        </button>
      </div>

      <div style={{ display: "flex", gap: "20px", marginTop: "20px" }}>
        <div style={{ width: "40%" }}>
          {error && <p style={{ color: "red" }}>{error}</p>}

          {products.map((p) => (
            <div
              key={p.project_id}
              onClick={() => fetchProductDetails(p.project_id)}
              style={{
                border: "1px solid #ccc",
                padding: "10px",
                marginBottom: "10px",
                cursor: "pointer",
                borderRadius: "6px",
                background:
                  selectedProduct?.project_id === p.project_id
                    ? "#f0f8ff"
                    : "white",
              }}
            >
              <h4 >{p.name}</h4>
              <p>₹ {p.price}</p>
            </div>
          ))}
        </div>

        <div style={{ width: "60%" }}>
          {loading && <p>Loading...</p>}

          {!loading && selectedProduct && (
            <div
              style={{
                border: "1px solid #e5e7eb",
                padding: "20px",
                borderRadius: "12px",
                background: "#fff",
                boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <h2 fontSize="40px">{selectedProduct.name}</h2>
                <span
                  style={{
                    padding: "4px 10px",
                    borderRadius: "20px",
                    fontSize: "12px",
                    background: selectedProduct.is_active ? "#d1fae5" : "#fee2e2",
                    color: selectedProduct.is_active ? "#065f46" : "#991b1b",
                  }}
                >
                  {selectedProduct.is_active ? "Active" : "Inactive"}
                </span>
              </div>

              <p>{selectedProduct.description}</p>

              <div style={{ fontSize: "22px", fontWeight: "600" }}>
                ₹ {selectedProduct.price}
              </div>

              <div style={{ height: "1px", background: "#eee" }} />

              <p><strong>ID:</strong> {selectedProduct.project_id}</p>
              <p><strong>Created:</strong> {new Date(selectedProduct.created_at).toLocaleString()}</p>
              <p><strong>Updated:</strong> {new Date(selectedProduct.updated_at).toLocaleString()}</p>

              <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                <button
                  onClick={() => {
                    setIsEdit(true);
                    setForm({
                      name: selectedProduct.name,
                      description: selectedProduct.description,
                      price: selectedProduct.price,
                      is_active: selectedProduct.is_active,
                    });
                    setShowModal(true);
                  }}
                  style={btnEdit}
                >
                  Edit
                </button>

                <button
                  onClick={() => setDeleteConfirm(true)}
                  style={btnDelete}
                >
                  Delete
                </button>
              </div>
            </div>
          )}

          {!loading && !selectedProduct && <p>Select a project</p>}
        </div>
      </div>

      {deleteConfirm && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h3>Delete Product</h3>
            <p>Are you sure?</p>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button onClick={() => setDeleteConfirm(false)}>Cancel</button>
              <button onClick={handleDelete} style={btnDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div style={overlayStyle}>
          <div style={{ ...modalStyle, width: "380px" }}>
            <h3>{isEdit ? "Edit Product" : "Add Product"}</h3>

            <input
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              style={inputStyle}
            />

            <textarea
              placeholder="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              style={{ ...inputStyle, minHeight: "70px" }}
            />

            <input
              type="number"
              placeholder="Price"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              style={inputStyle}
            />

            <label style={{ display: "flex", gap: "8px" }}>
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              />
              Active
            </label>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button onClick={() => setShowModal(false)}>Cancel</button>
              <button onClick={handleSubmit} style={btnPrimary}>
                {isEdit ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;