import React from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * useToasts() -> { toasts, push, dismiss }
 * ToastContainer -> render toasts array
 */

let _toastId = 1;

export function useToasts() {
  const [toasts, setToasts] = React.useState([]);

  function push(msg, opts = {}) {
    const id = _toastId++;
    const toast = {
      id,
      msg,
      detail: opts.detail || "",
      stay: !!opts.stay,
      duration: opts.duration || 3500,
      type: opts.type || "info",
    };
    setToasts((t) => [...t, toast]);
    if (!toast.stay) {
      setTimeout(() => {
        setToasts((t) => t.filter((x) => x.id !== id));
      }, toast.duration);
    }
    return id;
  }

  function dismiss(id) {
    setToasts((t) => t.filter((x) => x.id !== id));
  }

  return { toasts, push, dismiss };
}

export function ToastContainer({ toasts = [], onDismiss }) {
  return (
    <div className="fixed right-4 bottom-6 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.18 }}
            className="pointer-events-auto bg-white rounded-lg shadow p-3 border"
          >
            <div className="flex items-start gap-3">
              <div className="text-sm font-medium">{t.msg}</div>
              <div className="text-xs text-slate-400 ml-auto">{t.detail}</div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
