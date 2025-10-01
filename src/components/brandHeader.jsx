import React, { useRef } from "react";

/**
 * <BrandHeader logoUrl={logo} onLogoChange={(base64)=>{}} />
 * simple header with upload button for logo (client-side base64)
 */

export function BrandHeader({ logoUrl, onLogoChange }) {
  const ref = useRef(null);

  function onFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      onLogoChange && onLogoChange(reader.result);
    };
    reader.readAsDataURL(f);
  }

  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-lg bg-slate-100 flex items-center justify-center">
          {logoUrl ? (
            <img src={logoUrl} alt="logo" className="w-full h-full object-contain" />
          ) : (
            <div className="text-slate-400">Logo</div>
          )}
        </div>
        <div>
          <div className="text-xl font-bold">Company Name</div>
          <div className="text-xs text-slate-500">Visitor Management</div>
        </div>
      </div>

      <div>
        <input ref={ref} type="file" accept="image/*" className="hidden" onChange={onFile} />
        <button onClick={() => ref.current?.click()} className="px-3 py-1 border rounded text-sm">
          Upload Logo
        </button>
      </div>
    </div>
  );
}
