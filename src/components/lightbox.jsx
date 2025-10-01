import React from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * <Lightbox open={bool} src={url} onClose={() => {}} />
 */

export function Lightbox({ open, src, onClose }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/70" onClick={onClose} />
          <motion.img
            src={src}
            alt="preview"
            initial={{ scale: 0.98 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.98 }}
            className="max-w-full max-h-full rounded-lg shadow-lg z-50"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
