import React, { useEffect, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { LeadsAPI, projectsAPI } from "../../api/endpoints";
import { toast } from "sonner";

const schema = z.object({
  name: z.string().min(1),
  phone: z.string().optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  company: z.string().optional().or(z.literal("")),
  source: z.string().optional().or(z.literal("")),
  project_id: z.string().min(1, "Project is required"),
  purpose: z.string().optional().or(z.literal("")),
  status: z.enum(["WIP", "CLOSED", "LOST"]).default("WIP"),
  temperature: z.enum(["COLD", "WARM", "HOT"]).default("COLD"),
  expected_value: z.coerce.number().min(0).default(0),
  pipeline_stage: z
    .enum([
      "NEW",
      "CONTACTED",
      "DEMO",
      "PROPOSAL",
      "NEGOTIATION",
      "WON",
      "LOST",
    ])
    .optional(),
});


export default function CreateLeadModal({ open, onClose, onCreated, initial }) {
  const [products, setProducts] = useState([]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      company: "",
      source: "",
      purpose: "",
      status: "WIP",
      temperature: "COLD",
      expected_value: 0,
      pipeline_stage: "NEW",
      project_id: "",
    },
  });

  // ✅ Fetch products
  useEffect(() => {
    if (!open) return;

    const fetchProducts = async () => {
      try {
        const res = await projectsAPI.list();
        setProducts(res || []);
      } catch (err) {
        console.error("Failed to load products", err);
        setProducts([]);
      }
    };

    fetchProducts();
  }, [open]);

  // ✅ Reset form when modal opens
  useEffect(() => {
    if (!open) return;

    const init = initial || {};
    reset({
      name: "",
      phone: "",
      email: "",
      company: "",
      source: "",
      purpose: "",
      status: "WIP",
      temperature: "COLD",
      expected_value: 0,
      pipeline_stage: init.pipeline_stage || "NEW",
      project_id: "",
    });
  }, [open, reset, initial]);

  // ✅ Submit
  const onSubmit = async (values) => {
    try {
      const payload = {
        ...values,
        phone: values.phone || null,
        email: values.email || null,
      };

      await LeadsAPI.create(payload);

      toast.success("Lead created successfully");
      reset();
      onClose();
      onCreated?.();
    } catch (e) {
      const detail = e?.response?.data?.detail;

      if (e?.response?.status === 409 && detail?.duplicates) {
        toast.error("Possible duplicate lead", {
          description: "Phone/email already exists in CRM.",
        });
      } else {
        toast.error("Create failed", {
          description:
            detail?.[0]?.msg ||
            detail?.message ||
            detail ||
            "Unknown error",
        });
      }
    }
  };

  return (
    <Transition appear show={open}>
      <Dialog open={open} onClose={onClose} className="relative z-50">
        <Transition.Child
          enter="transition ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30" />
        </Transition.Child>

        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Transition.Child
            enter="transition ease-out duration-200"
            enterFrom="opacity-0 translate-y-2 scale-95"
            enterTo="opacity-100 translate-y-0 scale-100"
            leave="transition ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Dialog.Panel className="w-full max-w-3xl rounded-3xl bg-white border border-slate-200 shadow-xl overflow-hidden">
  
  {/* Header */}
  <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-blue-50">
    <div>
      <Dialog.Title className="text-xl font-semibold text-slate-800">
        Create Lead
      </Dialog.Title>

      <p className="text-sm text-slate-500 mt-1">
        Add a new lead to your CRM pipeline
      </p>
    </div>
  </div>

  {/* Form */}
  <form
    className="p-6 grid grid-cols-1 md:grid-cols-2 gap-3"
    onSubmit={handleSubmit(onSubmit)}
  >
    <Field label="Name" error={errors.name?.message}>
      <input
        className="mt-1 w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        {...register("name")}
      />
    </Field>

    <Field label="Phone" error={errors.phone?.message}>
      <input
        className="mt-1 w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        {...register("phone")}
      />
    </Field>

    <Field label="Email" error={errors.email?.message}>
      <input
        className="mt-1 w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        {...register("email")}
      />
    </Field>

    <Field label="Company" error={errors.company?.message}>
      <input
        className="mt-1 w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        {...register("company")}
      />
    </Field>

    <Field label="Source">
      <input
        className="mt-1 w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        {...register("source")}
        placeholder="facebook / referral / walk-in"
      />
    </Field>

    <Field label="Expected Value">
      <input
        type="number"
        className="mt-1 w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        {...register("expected_value")}
      />
    </Field>

    <Field label="Project" error={errors.project_id?.message}>
      <select
        className="mt-1 w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        disabled={!products.length}
        {...register("project_id")}
        defaultValue=""
      >
        <option value="">Select Project</option>

        {products.map((p) => (
          <option key={p.project_id} value={p.project_id}>
            {p.name} (₹ {p.price})
          </option>
        ))}
      </select>

      {products.length === 0 && (
        <div className="text-xs text-amber-600 mt-1">
          No projects available
        </div>
      )}
    </Field>

    <Field label="Status">
      <select
        className="mt-1 w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        {...register("status")}
      >
        <option value="WIP">WIP</option>
        <option value="CLOSED">CLOSED</option>
        <option value="LOST">LOST</option>
      </select>
    </Field>

    <Field label="Temperature">
      <select
        className="mt-1 w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        {...register("temperature")}
      >
        <option value="COLD">COLD</option>
        <option value="WARM">WARM</option>
        <option value="HOT">HOT</option>
      </select>
    </Field>

    <Field label="Pipeline Stage">
      <select
        className="mt-1 w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        {...register("pipeline_stage")}
      >
        <option value="NEW">NEW</option>
        <option value="CONTACTED">CONTACTED</option>
        <option value="DEMO">DEMO</option>
        <option value="PROPOSAL">PROPOSAL</option>
        <option value="NEGOTIATION">NEGOTIATION</option>
        <option value="WON">WON</option>
        <option value="LOST">LOST</option>
      </select>
    </Field>

    <div className="md:col-span-2">
      <label className="text-sm font-semibold text-slate-700">
        Purpose / Requirement
      </label>

      <textarea
        rows="4"
        className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        {...register("purpose")}
      />
    </div>

    {/* Footer */}
    <div className="md:col-span-2 flex justify-end gap-3 pt-2">
      <button
        type="button"
        onClick={onClose}
        className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
      >
        Cancel
      </button>

      <button
        type="submit"
        disabled={isSubmitting}
        className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 shadow-sm transition disabled:opacity-60"
      >
        {isSubmitting ? "Creating..." : "Create Lead"}
      </button>
    </div>
  </form>
</Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}

// ✅ Field Component
function Field({ label, error, children }) {
  return (
    <div>
      <label className="text-sm font-medium">{label}</label>
      <div className="mt-1">{children}</div>
      {error && <div className="text-xs text-rose-600 mt-1">{error}</div>}
    </div>
  );
}