import React, { useEffect, useState } from "react";
import { projectsAPI } from "../api/endpoints";

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
    is_active: true,
  });

  const fetchProducts = async () => {
    try {
      setError(null);
      const res = await projectsAPI.list();
      setProducts(res || []);
    } catch {
      setError("Failed to load products");
    }
  };

  const fetchProductDetails = async (project_id) => {
    if (!project_id) return;

    setLoading(true);

    try {
      const res = await projectsAPI.get(project_id);
      setSelectedProduct(res);
    } catch {
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

      let updatedProjectId = selectedProduct?.project_id;

      if (isEdit) {
        await projectsAPI.update(selectedProduct.project_id, payload);
      } else {
        const created = await projectsAPI.create(payload);
        updatedProjectId = created?.project_id;
      }

      // refresh list
      const updatedProducts = await projectsAPI.list();
      setProducts(updatedProducts || []);

      // refresh selected project details
      if (updatedProjectId) {
        const updatedProject = await projectsAPI.get(updatedProjectId);
        setSelectedProduct(updatedProject);
      }

      setShowModal(false);
      setIsEdit(false);

      setForm({
        name: "",
        description: "",
        price: "",
        is_active: true,
      });
    } catch {
      setError("Operation failed");
    }
  };

  const handleDelete = async () => {
    try {
      await projectsAPI.delete(selectedProduct.project_id);

      const updatedProducts = await projectsAPI.list();

      setProducts(updatedProducts || []);
      setDeleteConfirm(false);
      setSelectedProduct(null);
    } catch {
      setError("Delete failed");
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Projects</h1>

          <p className="text-sm text-slate-500 mt-1">
            Manage your products and pricing
          </p>
        </div>

        <button
          onClick={() => {
            setIsEdit(false);

            setForm({
              name: "",
              description: "",
              price: "",
              is_active: true,
            });

            setShowModal(true);
          }}
          className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition"
        >
          + Add Project
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {error}
        </div>
      )}

      {/* Layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {products.map((p) => (
          <div
            key={p.project_id}
            className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-200"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-slate-800 truncate">
                  {p.name}
                </h3>

                <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                  {p.description || "No description available"}
                </p>
              </div>

              <span
                className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium ${
                  p.is_active
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-rose-100 text-rose-700"
                }`}
              >
                {p.is_active ? "Active" : "Inactive"}
              </span>
            </div>

            {/* Price */}
            <div className="mt-4">
              <div className="text-[11px] uppercase tracking-wide text-slate-400">
                Price
              </div>

              <div className="text-xl font-bold text-indigo-600 mt-1">
                ₹ {p.price}
              </div>
            </div>

            {/* Details */}
            <div className="mt-4 space-y-2 text-xs">
              

              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Created at</span>

                <span className="font-medium text-slate-700">
                  {new Date(p.created_at).toLocaleDateString("en-GB")}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => {
                  setSelectedProduct(p);

                  setIsEdit(true);

                  setForm({
                    name: p.name,
                    description: p.description,
                    price: p.price,
                    is_active: p.is_active,
                  });

                  setShowModal(true);
                }}
                className="flex-1 px-3 py-2 rounded-xl bg-[#f1efff] text-sky-700 text-sm font-medium hover:bg-sky-200 transition"
              >
                Edit
              </button>

              <button
                onClick={() => {
                  setSelectedProduct(p);
                  setDeleteConfirm(true);
                }}
                className="flex-1 px-3 py-2 rounded-xl bg-rose-100 text-rose-700 text-sm font-medium hover:bg-rose-200 transition"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-semibold text-slate-800">
              {isEdit ? "Edit Project" : "Add Project"}
            </h3>

            <div className="space-y-4 mt-5">
              <input
                placeholder="Project Name"
                value={form.name}
                onChange={(e) =>
                  setForm({
                    ...form,
                    name: e.target.value,
                  })
                }
                className="w-full h-11 rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />

              <textarea
                rows={4}
                placeholder="Description"
                value={form.description}
                onChange={(e) =>
                  setForm({
                    ...form,
                    description: e.target.value,
                  })
                }
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />

              <input
                type="number"
                placeholder="Price"
                value={form.price}
                onChange={(e) =>
                  setForm({
                    ...form,
                    price: e.target.value,
                  })
                }
                className="w-full h-11 rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />

              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      is_active: e.target.checked,
                    })
                  }
                />
                Active Project
              </label>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-sm hover:bg-slate-50 transition"
              >
                Cancel
              </button>

              <button
                onClick={handleSubmit}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm hover:bg-indigo-700 transition"
              >
                {isEdit ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
{deleteConfirm && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
    <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
      <h3 className="text-lg font-semibold text-slate-800">
        Delete Project
      </h3>

      <p className="text-sm text-slate-500 mt-2">
        Are you sure you want to delete this project?
      </p>

      <div className="flex justify-end gap-3 mt-6">
        <button
          onClick={() => setDeleteConfirm(false)}
          className="px-4 py-2 rounded-xl border border-slate-200 text-sm hover:bg-slate-50 transition"
        >
          Cancel
        </button>

        <button
          onClick={handleDelete}
          className="px-4 py-2 rounded-xl bg-rose-600 text-white text-sm hover:bg-rose-700 transition"
        >
          Delete
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  );
};

export default Products;
