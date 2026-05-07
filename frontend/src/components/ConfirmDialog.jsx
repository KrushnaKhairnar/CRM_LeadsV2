import { useEffect, useState } from "react"
import { createPortal } from "react-dom"

export default function ConfirmDialog({
  trigger,
  title = "Are you sure?",
  description = "This action cannot be undone.",
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  loading = false,
}) {
  const [open, setOpen] = useState(false)

  // ESC close
  useEffect(() => {
    if (!open) return

    const onKeyDown = (e) => {
      if (e.key === "Escape") setOpen(false)
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open])

  // prevent background scroll
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden"
    else document.body.style.overflow = ""

    return () => (document.body.style.overflow = "")
  }, [open])

  const modal = open && (
    <div
      className="fixed inset-0 z-50 bg-black/50 grid place-items-center p-4"
      onClick={() => setOpen(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold">{title}</h2>

        <p className="text-sm text-slate-600 mt-2">
          {description}
        </p>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={() => setOpen(false)}
            className="px-4 py-2 text-sm border rounded-lg hover:bg-slate-50"
          >
            {cancelText}
          </button>

          <button
            disabled={loading}
            onClick={async () => {
              await onConfirm?.()
              setOpen(false)
            }}
            className="px-4 py-2 text-sm bg-brand-600 text-white rounded-lg disabled:opacity-50"
          >
            {loading ? "Processing..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      <span onClick={() => setOpen(true)} className="inline-block">
        {trigger}
      </span>

      {typeof window !== "undefined"
        ? createPortal(modal, document.body)
        : null}
    </>
  )
}