import React from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * <Modal open={bool} onClose={() => {}} title="...">children</Modal>
 */

export function Modal({ open, onClose, children, title }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-40 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/40" onClick={onClose} />
          <motion.div
            initial={{ scale: 0.98, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.98, opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="bg-white w-full max-w-2xl rounded-xl p-6 z-50 shadow-lg"
          >
            {title && <div className="text-lg font-semibold mb-3">{title}</div>}
            <div>{children}</div>
            <div className="mt-4 text-right">
              <button onClick={onClose} className="px-3 py-2 rounded border">
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
