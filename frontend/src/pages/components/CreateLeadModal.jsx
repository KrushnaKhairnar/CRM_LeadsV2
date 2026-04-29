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
  status: z.enum(["OPEN", "WIP", "CLOSED", "LOST"]).default("OPEN"),
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

// export default function CreateLeadModal({ open, onClose, onCreated, initial }) {
//   const [products, setProducts] = useState([]);
//   const [selectedProject, setSelectedProject] = useState("");

//   const {
//     register,
//     handleSubmit,
//     reset,
//     formState: { errors, isSubmitting },
//   } = useForm({
//     resolver: zodResolver(schema),
//     defaultValues: {
//       name: "",
//       status: "OPEN",
//       temperature: "COLD",
//       expected_value: 0,
//       pipeline_stage: "NEW",
//     },
//   });

//   useEffect(() => {
//     const fetchProducts = async () => {
//       try {
//         const res = await projectsAPI.list();
//         setProducts(res || []);
//       } catch (err) {
//         console.error("Failed to load products", err);
//       }
//     };
//     fetchProducts();
//   }, []);

//   useEffect(() => {
//     if (open) {
//       const init = initial || {};
//       reset({
//         name: "",
//         phone: "",
//         email: "",
//         company: "",
//         source: "",
//         purpose: "",
//         status: "OPEN",
//         temperature: "COLD",
//         expected_value: 0,
//         pipeline_stage: init.pipeline_stage || "NEW",
//       });
//       setSelectedProject("");
//     }
//   }, [open]);

//   const onSubmit = async (values) => {
//     try {
//       const payload = {
//         ...values,
//         phone: values.phone || null,
//         email: values.email || null,
//         project_id: selectedProject || null,
//       };

//       await LeadsAPI.create(payload);
//       reset();
//       onClose();
//       onCreated?.();
//     } catch (e) {
//       const detail = e?.response?.data?.detail;
//       if (e?.response?.status === 409 && detail?.duplicates) {
//         toast.error("Possible duplicate lead", {
//           description: "Phone/email already exists in CRM.",
//         });
//       } else {
//         toast.error("Create failed", {
//           description: detail?.message || detail || "Unknown error",
//         });
//       }
//     }
//   };

//   return (
//     <Transition appear show={open}>
//       <Dialog open={open} onClose={onClose} className="relative z-50">
//         <Transition.Child
//           enter="transition ease-out duration-200"
//           enterFrom="opacity-0"
//           enterTo="opacity-100"
//           leave="transition ease-in duration-150"
//           leaveFrom="opacity-100"
//           leaveTo="opacity-0"
//         >
//           <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
//         </Transition.Child>

//         <div className="fixed inset-0 flex items-center justify-center p-4">
//           <Transition.Child
//             enter="transition ease-out duration-200"
//             enterFrom="opacity-0 translate-y-2 scale-95"
//             enterTo="opacity-100 translate-y-0 scale-100"
//             leave="transition ease-in duration-150"
//             leaveFrom="opacity-100 translate-y-0 scale-100"
//             leaveTo="opacity-0 translate-y-2 scale-95"
//           >
//             <Dialog.Panel className="w-full max-w-2xl bg-white rounded-2xl shadow-card border p-5">
//               <Dialog.Title className="text-lg font-semibold">
//                 Create Lead
//               </Dialog.Title>

//               <form
//                 className="mt-4 grid md:grid-cols-2 gap-3"
//                 onSubmit={handleSubmit(onSubmit)}
//               >
//                 <Field label="Name" error={errors.name?.message}>
//                   <input className="w-full" {...register("name")} />
//                 </Field>

//                 <Field label="Phone" error={errors.phone?.message}>
//                   <input className="w-full" {...register("phone")} />
//                 </Field>

//                 <Field label="Email" error={errors.email?.message}>
//                   <input className="w-full" {...register("email")} />
//                 </Field>

//                 <Field label="Company" error={errors.company?.message}>
//                   <input className="w-full" {...register("company")} />
//                 </Field>

//                 <Field label="Source">
//                   <input
//                     className="w-full"
//                     {...register("source")}
//                     placeholder="facebook/referral/walk-in"
//                   />
//                 </Field>

//                 <Field label="Expected Value">
//                   <input
//                     type="number"
//                     className="w-full"
//                     {...register("expected_value")}
//                   />
//                 </Field>
//                 <Field label="Project" error={errors.project_id?.message}>
//                   <select
//                     className="w-full"
//                     {...register("project_id", {
//                       required: "Project is required",
//                     })}
//                     defaultValue=""
//                   >
//                     <option value="">Select Project</option>

//                     {products.map((p) => (
//                       <option key={p.project_id} value={p.project_id}>
//                         {p.name} (₹ {p.price})
//                       </option>
//                     ))}
//                   </select>
//                 </Field>

//                 <Field label="Status">
//                   <select className="w-full" {...register("status")}>
//                     <option value="OPEN">OPEN</option>
//                     <option value="WIP">WIP</option>
//                     <option value="CLOSED">CLOSED</option>
//                     <option value="LOST">LOST</option>
//                   </select>
//                 </Field>

//                 <Field label="Temperature">
//                   <select className="w-full" {...register("temperature")}>
//                     <option value="COLD">COLD</option>
//                     <option value="WARM">WARM</option>
//                     <option value="HOT">HOT</option>
//                   </select>
//                 </Field>

//                 <Field label="Pipeline Stage">
//                   <select className="w-full" {...register("pipeline_stage")}>
//                     <option value="NEW">NEW</option>
//                     <option value="CONTACTED">CONTACTED</option>
//                     <option value="DEMO">DEMO</option>
//                     <option value="PROPOSAL">PROPOSAL</option>
//                     <option value="NEGOTIATION">NEGOTIATION</option>
//                     <option value="WON">WON</option>
//                     <option value="LOST">LOST</option>
//                   </select>
//                 </Field>

//                 <div className="md:col-span-2">
//                   <label className="text-sm font-medium">
//                     Purpose / Requirement
//                   </label>
//                   <textarea
//                     className="mt-1 w-full"
//                     rows="3"
//                     {...register("purpose")}
//                   />
//                 </div>

//                 <div className="md:col-span-2 flex justify-end gap-2 mt-2">
//                   <button
//                     type="button"
//                     onClick={onClose}
//                     className="px-3 py-2 rounded-lg border text-sm"
//                   >
//                     Cancel
//                   </button>

//                   <button
//                     disabled={isSubmitting}
//                     className="px-3 py-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700 text-sm disabled:opacity-60 shadow-soft hover:shadow-hover"
//                   >
//                     {isSubmitting ? "Creating…" : "Create"}
//                   </button>
//                 </div>
//               </form>
//             </Dialog.Panel>
//           </Transition.Child>
//         </div>
//       </Dialog>
//     </Transition>
//   );
// }

// function Field({ label, error, children }) {
//   return (
//     <div>
//       <label className="text-sm font-medium">{label}</label>
//       <div className="mt-1">{children}</div>
//       {error && <div className="text-xs text-rose-600 mt-1">{error}</div>}
//     </div>
//   );
// }

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
      status: "OPEN",
      temperature: "COLD",
      expected_value: 0,
      pipeline_stage: "NEW",
      project_id: "",
    },
  });

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await projectsAPI.list();
        setProducts(res || []);
      } catch (err) {
        console.error("Failed to load products", err);
      }
    };
    fetchProducts();
  }, []);

  useEffect(() => {
    if (open) {
      const init = initial || {};
      reset({
        name: "",
        phone: "",
        email: "",
        company: "",
        source: "",
        purpose: "",
        status: "OPEN",
        temperature: "COLD",
        expected_value: 0,
        pipeline_stage: init.pipeline_stage || "NEW",
        project_id: "",
      });
    }
  }, [open]);

  const onSubmit = async (values) => {
    try {
      const payload = {
        ...values,
        phone: values.phone || null,
        email: values.email || null,
        project_id: values.project_id || null,
      };

      await LeadsAPI.create(payload);
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
          description: detail?.message || detail || "Unknown error",
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
          <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        </Transition.Child>

        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Transition.Child
            enter="transition ease-out duration-200"
            enterFrom="opacity-0 translate-y-2 scale-95"
            enterTo="opacity-100 translate-y-0 scale-100"
            leave="transition ease-in duration-150"
            leaveFrom="opacity-100 translate-y-0 scale-100"
            leaveTo="opacity-0 translate-y-2 scale-95"
          >
            <Dialog.Panel className="w-full max-w-2xl bg-white rounded-2xl shadow-card border p-5">
              <Dialog.Title className="text-lg font-semibold">
                Create Lead
              </Dialog.Title>

              <form
                className="mt-4 grid md:grid-cols-2 gap-3"
                onSubmit={handleSubmit(onSubmit)}
              >
                <Field label="Name" error={errors.name?.message}>
                  <input className="w-full" {...register("name")} />
                </Field>

                <Field label="Phone" error={errors.phone?.message}>
                  <input className="w-full" {...register("phone")} />
                </Field>

                <Field label="Email" error={errors.email?.message}>
                  <input className="w-full" {...register("email")} />
                </Field>

                <Field label="Company" error={errors.company?.message}>
                  <input className="w-full" {...register("company")} />
                </Field>

                <Field label="Source">
                  <input
                    className="w-full"
                    {...register("source")}
                    placeholder="facebook/referral/walk-in"
                  />
                </Field>

                <Field label="Expected Value">
                  <input
                    type="number"
                    className="w-full"
                    {...register("expected_value")}
                  />
                </Field>

                <Field label="Project" error={errors.project_id?.message}>
                  <select className="w-full" {...register("project_id")}>
                    <option value="">Select Project</option>
                    {products.map((p) => (
                      <option key={p.project_id} value={p.project_id}>
                        {p.name} (₹ {p.price})
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Status">
                  <select className="w-full" {...register("status")}>
                    <option value="OPEN">OPEN</option>
                    <option value="WIP">WIP</option>
                    <option value="CLOSED">CLOSED</option>
                    <option value="LOST">LOST</option>
                  </select>
                </Field>

                <Field label="Temperature">
                  <select className="w-full" {...register("temperature")}>
                    <option value="COLD">COLD</option>
                    <option value="WARM">WARM</option>
                    <option value="HOT">HOT</option>
                  </select>
                </Field>

                <Field label="Pipeline Stage">
                  <select className="w-full" {...register("pipeline_stage")}>
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
                  <label className="text-sm font-medium">
                    Purpose / Requirement
                  </label>
                  <textarea
                    className="mt-1 w-full"
                    rows="3"
                    {...register("purpose")}
                  />
                </div>

                <div className="md:col-span-2 flex justify-end gap-2 mt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3 py-2 rounded-lg border text-sm"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-3 py-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700 text-sm disabled:opacity-60 shadow-soft hover:shadow-hover"
                  >
                    {isSubmitting ? "Creating…" : "Create"}
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

function Field({ label, error, children }) {
  return (
    <div>
      <label className="text-sm font-medium">{label}</label>
      <div className="mt-1">{children}</div>
      {error && <div className="text-xs text-rose-600 mt-1">{error}</div>}
    </div>
  );
}