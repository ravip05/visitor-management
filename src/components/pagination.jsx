import React from "react";
import classNames from "classnames";

/**
 * <Pagination page={n} totalPages={m} onChange={(p)=>{}} />
 */

export function Pagination({ page = 1, totalPages = 1, onChange }) {
  const pages = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, start + 4);
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div className="flex items-center gap-2">
      <button
        disabled={page === 1}
        onClick={() => onChange(Math.max(1, page - 1))}
        className="px-2 py-1 border rounded"
      >
        Prev
      </button>
      {pages.map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={classNames("px-3 py-1 rounded", {
            "bg-purple-600 text-white": p === page,
            "border": p !== page,
          })}
        >
          {p}
        </button>
      ))}
      <button
        disabled={page === totalPages}
        onClick={() => onChange(Math.min(totalPages, page + 1))}
        className="px-2 py-1 border rounded"
      >
        Next
      </button>
    </div>
  );
}
