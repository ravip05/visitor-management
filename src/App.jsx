import React, { useState, useEffect, useRef, createContext, useContext } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from "react-router-dom";
import Webcam from "react-webcam";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { useToasts, ToastContainer } from "./components/toasts.jsx";
import { Modal } from "./components/modal.jsx";
import { Lightbox } from "./components/lightbox.jsx";
import { Pagination } from "./components/pagination.jsx";
import useDebounce from "./components/useDebounce.jsx";
import { BrandHeader } from "./components/brandHeader.jsx";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

/* --------------------- Avatar --------------------- */
function Avatar({ src, alt, className = "" }) {
  const fallback =
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'><rect width='100%' height='100%' fill='%23e6e6e6'/><text x='50%' y='50%' font-size='12' dominant-baseline='middle' text-anchor='middle' fill='%23999'>N/A</text></svg>";

  if (!src) {
    return (
      <div className={`w-12 h-12 bg-slate-100 rounded flex items-center justify-center text-slate-400 ${className}`}>
        N/A
      </div>
    );
  }

  const s = String(src);
  const ok = s.startsWith("data:") || s.startsWith("http") || s.startsWith("/");

  return ok ? (
    <img
      src={src}
      alt={alt || "avatar"}
      className={`w-12 h-12 object-cover rounded ${className}`}
      onError={(e) => {
        e.target.onerror = null;
        e.target.src = fallback;
      }}
    />
  ) : (
    <img src={fallback} alt="avatar" className={`w-12 h-12 object-cover rounded ${className}`} />
  );
}

/* --------------------- Toast context --------------------- */
const ToastCtx = createContext({ push: () => {}, toasts: [] });

function ToastProvider({ children }) {
  const { toasts, push, dismiss } = useToasts();
  return (
    <ToastCtx.Provider value={{ push, dismiss, toasts }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastCtx.Provider>
  );
}

function useToastsCtx() {
  return useContext(ToastCtx);
}

/* --------------------- API helper --------------------- */
async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("token");
  let body = options.body;

  // If body is an object and not FormData, stringify it
  if (body && typeof body === "object" && !(body instanceof FormData)) {
    body = JSON.stringify(body);
  }

  const headers = { ...(options.headers || {}) };

  if (!(body instanceof FormData)) {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
  }

  headers["Accept"] = headers["Accept"] || "application/json";
  headers["Cache-Control"] = "no-cache";
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const url = (API_URL || "http://localhost:4000") + path;
  console.log("[vms] apiFetch", { method: options.method || "GET", url, hasToken: !!token, headers: Object.keys(headers) });

  try {
    const res = await fetch(url, { ...options, body, headers, mode: "cors", credentials: "same-origin" });
    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = text;
    }

    if (!res.ok) {
      console.warn("[vms] apiFetch non-ok", res.status, data);
 //     if (res.status === 401) {
    //    localStorage.removeItem("token");
    //    localStorage.removeItem("user");
   //     setTimeout(() => (window.location = "/login"), 200);
    //    throw new Error("Unauthorized");
  //    }

      const msg = data && data.error ? data.error : typeof data === "string" ? data : "Request failed";
      const err = new Error(msg);
      err.status = res.status;
      throw err;
    }

    return data;
  } catch (err) {
    console.error("[vms] apiFetch failed", err);
    throw err;
  }
}

/* --------------------- Utilities --------------------- */
const pad = (n) => String(n).padStart(2, "0");

function epochToPretty(sec) {
  if (!sec) return "-";
  try {
    return new Date(sec * 1000).toLocaleString();
  } catch {
    return "-";
  }
}

function downloadCSV(filename, rows) {
  if (!rows || rows.length === 0) return;
  const cols = Object.keys(rows[0]);
  const csv = [cols.join(",")]
    .concat(
      rows.map((r) =>
        cols
          .map((c) => `${(r[c] ?? "").toString().replace(/"/g, '""')}`)
          .join(",")
      )
    )
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* --------------------- App root --------------------- */
export default function App() {
  return (
    <Router>
      <ToastProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/*" element={<MainApp />} />
        </Routes>
      </ToastProvider>
    </Router>
  );
}

/* --------------------- Login --------------------- */
function LoginPage() {
  const nav = useNavigate();
  const { push } = useToastsCtx();

  useEffect(() => {
    if (localStorage.getItem("token")) nav("/");
  }, [nav]);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e?.preventDefault();
    setBusy(true);
    try {
      const res = await apiFetch("/auth/login", { method: "POST", body: { username, password } });
      localStorage.setItem("token", res.token);
      localStorage.setItem("user", res.username);
      push("Signed in");
      nav("/");
    } catch (err) {
      push(err.message || "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-800 to-purple-700 p-6">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-500 flex items-center justify-center text-white font-bold text-xl">LOGO</div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800">Visitor Portal</h1>
            <p className="text-sm text-slate-500">Sign in to manage visitors</p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-xs text-slate-500">Email or Phone</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full mt-1 p-3 rounded-xl border border-slate-200"
              placeholder="you@example.com or +1 555..."
            />
          </div>

          <div>
            <label className="text-xs text-slate-500">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full mt-1 p-3 rounded-xl border border-slate-200"
              placeholder="••••••••"
            />
          </div>

          <div className="flex items-center justify-between">
            <button disabled={busy} className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-500 text-white font-semibold shadow">
              {busy ? "Signing in..." : "Sign in"}
            </button>
            <button
              type="button"
              onClick={() => {
                setUsername("admin@example.com");
                setPassword("password123");
              }}
              className="text-sm text-slate-400 underline"
            >
              Use demo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* --------------------- Main app & layout --------------------- */
function MainApp() {
  const nav = useNavigate();

  useEffect(() => {
    if (!localStorage.getItem("token")) nav("/login");
  }, [nav]);

  return (
    <div className="min-h-screen flex bg-slate-50">
      <LeftSidebar />
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-7xl mx-auto space-y-6">
          <BrandHeader logoUrl={null} onLogoChange={() => {}} />
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/visitor" element={<Dashboard />} />
            <Route path="/reports" element={<Reports />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

/* --------------------- Sidebar --------------------- */
function LeftSidebar() {
  const nav = useNavigate();
  const { push } = useToastsCtx();
  const [stats, setStats] = useState({ today: 0, in: 0, out: 0 });
  const user = localStorage.getItem("user") || "Admin";

  async function loadStats() {
    try {
      const v = await apiFetch("/visitors");
      const now = new Date();
      const start = Math.floor(new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 1000);
      const end = Math.floor(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).getTime() / 1000);
      const today = v.filter((x) => (Number(x.checkin_time) || 0) >= start && (Number(x.checkin_time) || 0) <= end).length;
      const inCount = v.filter((x) => !x.checkout_time).length;
      const outCount = v.filter((x) => x.checkout_time).length;
      setStats({ today, in: inCount, out: outCount });
    } catch (e) {
      push("Failed to load stats");
    }
  }

  useEffect(() => {
    loadStats();
    const id = setInterval(loadStats, 15_000);
    window.addEventListener("vms:visitors-changed", loadStats);
    return () => {
      clearInterval(id);
      window.removeEventListener("vms:visitors-changed", loadStats);
    };
  }, []);

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    nav("/login");
  }

  const path = typeof window !== "undefined" ? window.location.pathname : "/";

  return (
    <aside className="w-80 bg-white border-r shadow-sm flex flex-col">
      <div className="p-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-500 flex items-center justify-center text-white font-bold">LOGO</div>
          <div>
            <div className="font-semibold">Acme Corp</div>
            <div className="text-xs text-slate-500">Visitor Management</div>
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <Link to="/visitor" className={`block p-3 rounded-lg ${path === "/visitor" || path === "/" ? "bg-purple-600 text-white" : "text-slate-700 hover:bg-slate-50"}`}>
            Check In
          </Link>
          <Link to="/reports" className={`block p-3 rounded-lg ${path === "/reports" ? "bg-purple-600 text-white" : "text-slate-700 hover:bg-slate-50"}`}>
            Reports
          </Link>
        </div>

        <div className="mt-6">
          <div className="text-xs text-slate-500">Today's</div>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <StatCard label="Visits" value={stats.today} />
            <StatCard label="In" value={stats.in} />
            <StatCard label="Out" value={stats.out} />
          </div>
        </div>

        <div className="mt-6 border-t pt-4">
          <div className="text-xs text-slate-500">Signed in as</div>
          <div className="mt-1 font-medium">{user}</div>
          <div className="mt-3">
            <button onClick={logout} className="w-full text-left px-3 py-2 rounded hover:bg-slate-50">Logout</button>
          </div>
        </div>
      </div>
    </aside>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="bg-slate-50 p-3 rounded text-center">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}

/* --------------------- Dashboard --------------------- */
function Dashboard() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Check In</h2>
          <p className="text-sm text-slate-500">Multi-step visitor registration</p>
        </div>
      </div>
      <CheckInAndList />
    </div>
  );
}

/* --------------------- CheckInAndList --------------------- */
function CheckInAndList() {
  const { push } = useToastsCtx();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    company: "",
    personToMeet: "",
    purpose: "",
    address: "",
    checkin_time: new Date().toISOString().slice(0, 16),
  });
  const [msg, setMsg] = useState("");
  const [photo, setPhoto] = useState(null);
  const [mode, setMode] = useState(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const webcamRef = useRef(null);
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [sortBy, setSortBy] = useState("checkin_time");
  const [filterStatus, setFilterStatus] = useState("all");
  const [page, setPage] = useState(1);
  const perPage = 8;
  const [detail, setDetail] = useState(null);
  const [lightSrc, setLightSrc] = useState(null);

  function updateForm(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function nextFromDetails() {
    if (!form.name || !String(form.name).trim() || !form.phone || !String(form.phone).trim()) {
      setMsg("Name and phone required");
      push("Name and phone required");
      return;
    }
    setMsg("");
    setStep(2);
  }

  function backToDetails() {
    setStep(1);
  }

  function capture() {
    try {
      const s = webcamRef.current?.getScreenshot();
      if (s) setPhoto(s);
      setCameraOpen(false);
    } catch (e) {
      console.error(e);
      push("Camera capture failed");
    }
  }

  function onUpload(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => setPhoto(r.result);
    r.readAsDataURL(f);
  }

  // Replace the loadVisitors function in App.jsx (around line 269)
  async function loadVisitors() {
    try {
      setLoading(true);
      console.log("[vms] loadVisitors: fetching /visitors");
      const v = await apiFetch("/visitors");

      if (!Array.isArray(v)) {
        console.warn("[vms] loadVisitors: server returned non-array", v);
        setVisitors([]);
        return [];
      }

      // Parse and normalize the data
      const parsed = v.map((it) => {
        // Ensure checkin_time is a number (epoch seconds)
        let ck = it.checkin_time;
        if (typeof ck === "string") {
          ck = Math.floor(new Date(ck).getTime() / 1000);
        } else if (typeof ck === "number") {
          // If it's already a number, ensure it's in seconds not milliseconds
          if (ck > 10000000000) {
            // If it looks like milliseconds
            ck = Math.floor(ck / 1000);
          }
        }

        // Same for checkout_time
        let co = it.checkout_time;
        if (co) {
          if (typeof co === "string") {
            co = Math.floor(new Date(co).getTime() / 1000);
          } else if (typeof co === "number" && co > 10000000000) {
            co = Math.floor(co / 1000);
          }
        }

        return { ...it, checkin_time: ck || 0, checkout_time: co || null };
      });

      // Sort by checkin_time descending (newest first)
      parsed.sort((a, b) => (b.checkin_time || 0) - (a.checkin_time || 0));
      console.log(`[vms] loadVisitors: loaded ${parsed.length} visitors`);

      if (parsed.length > 0) {
        console.log("[vms] Top 3 visitors:", parsed.slice(0, 3).map((v) => ({ id: v.id, name: v.name, checkin_time: v.checkin_time, date: new Date(v.checkin_time * 1000).toLocaleString() })));
      }

      setVisitors(parsed);
      return parsed;
    } catch (e) {
      console.error("[vms] loadVisitors failed", e);
      setMsg(typeof e === "string" ? e : e.message || "Failed to load visitors");
      throw e;
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadVisitors();
    window.addEventListener("vms:visitors-changed", loadVisitors);
    return () => window.removeEventListener("vms:visitors-changed", loadVisitors);
  }, []);

  // Replace the submitCheckin function in App.jsx (around line 367)
  async function submitCheckin() {
    setLoading(true);
    setMsg("");
    console.log("[vms] submitCheckin called");
    try {
      const payload = {
        name: form.name,
        phone: form.phone,
        address: form.address,
        purpose: form.purpose,
        company: form.company,
        personToMeet: form.personToMeet,
        photo: photo || null,
        checkin_time: Math.floor(Date.now() / 1000), // always "now"
      };

      console.log("[vms] payload prepared:", payload);

      if (!payload.name || !payload.phone) {
        throw new Error("Name and phone required");
      }

      console.log("[vms] about to fetch POST", `${API_URL}/visitors`);
      const saved = await apiFetch("/visitors", { method: "POST", body: payload });
      console.log("[vms] fetch response - saved:", saved);

      // CRITICAL FIX: Always reload the full list from server to ensure sync
      console.log("[vms] Reloading visitor list from server...");
      await loadVisitors();

      // Reset form/UI
      setForm({
        name: "",
        phone: "",
        company: "",
        personToMeet: "",
        purpose: "",
        address: "",
        checkin_time: new Date().toISOString().slice(0, 16),
      });
      setPhoto(null);
      setMode(null);
      setStep(1);
      setPage(1);

      // Notify
      window.dispatchEvent(new Event("vms:visitors-changed"));

      const visitorName = saved?.name || payload.name;
      setMsg(`Checked in ${visitorName}`);
      push?.(`Checked in ${visitorName}`);
      console.log("[vms] submitCheckin completed successfully");
    } catch (e) {
      console.error("submitCheckin error", e);
      setMsg(e.message || "Failed to check in");
      push?.(e.message || "Failed to check in");

      // Try to reload list anyway to see if it actually saved
      try {
        await loadVisitors();
      } catch {}
    } finally {
      setLoading(false);
    }
  }

  async function checkout(id) {
    try {
      setMsg("");
      await apiFetch(`/visitors/${id}/checkout`, { method: "POST" });
      push("Checked out");
      setVisitors((prev) => prev.map((v) => (v.id === id ? { ...v, checkout_time: Math.floor(Date.now() / 1000) } : v)));
      window.dispatchEvent(new Event("vms:visitors-changed"));
    } catch (e) {
      console.error("checkout error", e);
      setMsg(e.message || "Checkout failed");
      push(e.message || "Checkout failed");
      try {
        await loadVisitors();
      } catch {}
    }
  }

  const qDeb = useDebounce(q, 300);

  const visible = (visitors || [])
    .filter((v) => (filterStatus === "all") || (filterStatus === "in" ? !v.checkout_time : !!v.checkout_time))
    .filter((v) => {
      if (!qDeb) return true;
      const s = qDeb.toLowerCase();
      return (v.name || "").toLowerCase().includes(s) || (v.phone || "").toLowerCase().includes(s) || (v.purpose || "").toLowerCase().includes(s);
    })
    .sort((a, b) => {
      if (sortBy === "name") return (a.name || "").localeCompare(b.name || "");
      return (b.checkin_time || 0) - (a.checkin_time || 0);
    });

  const checkedInCount = (visitors || []).filter((v) => !v.checkout_time).length;
  const totalPages = Math.max(1, Math.ceil(visible.length / perPage));

  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [totalPages]);

  const paged = visible.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="grid grid-cols-3 gap-6">
      <div className="col-span-2 bg-white rounded-2xl p-6 shadow">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">New Visitor</h3>
            <div className="text-xs text-slate-400">Step {step} of 3</div>
          </div>
          <div className="text-sm text-slate-500">{msg}</div>
        </div>

        <div className="mb-4">
          <StepPills step={step} />
        </div>

        {step === 1 && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input value={form.name} onChange={(e) => updateForm("name", e.target.value)} placeholder="Full name *" className="p-3 border rounded" />
              <input value={form.phone} onChange={(e) => updateForm("phone", e.target.value)} placeholder="Phone *" className="p-3 border rounded" />
              <input value={form.company} onChange={(e) => updateForm("company", e.target.value)} placeholder="Company" className="p-3 border rounded" />
              <input value={form.personToMeet} onChange={(e) => updateForm("personToMeet", e.target.value)} placeholder="Person to meet" className="p-3 border rounded" />
              <input value={form.purpose} onChange={(e) => updateForm("purpose", e.target.value)} placeholder="Purpose" className="p-3 border rounded col-span-2" />
              <input value={form.address} onChange={(e) => updateForm("address", e.target.value)} placeholder="Address" className="p-3 border rounded col-span-2" />
              <label className="col-span-2 block">
                <div className="text-xs text-slate-500 mb-1">Check-in time</div>
                <input type="datetime-local" value={form.checkin_time} onChange={(e) => updateForm("checkin_time", e.target.value)} className="p-3 border rounded w-full" />
              </label>
            </div>

            <div className="flex items-center gap-3">
              <button onClick={nextFromDetails} className="px-4 py-2 rounded bg-purple-600 text-white">Next: Photo</button>
              <button
                onClick={() => {
                  setForm({ name: "", phone: "", company: "", personToMeet: "", purpose: "", address: "", checkin_time: new Date().toISOString().slice(0, 16) });
                  setMsg("");
                }}
                className="px-3 py-2 border rounded"
              >
                Reset
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div onClick={() => { setMode("upload"); setCameraOpen(false); }} className={`px-3 py-1 rounded cursor-pointer ${mode === "upload" ? "bg-purple-600 text-white" : "border"}`}>
                Upload
              </div>
              <div onClick={() => { setMode("camera"); setCameraOpen(false); }} className={`px-3 py-1 rounded cursor-pointer ${mode === "camera" ? "bg-purple-600 text-white" : "border"}`}>
                Camera
              </div>
              <div onClick={() => { setMode(null); setPhoto(null); }} className="px-3 py-1 rounded cursor-pointer border">Skip</div>
            </div>

            {mode === "upload" && (
              <div>
                <input type="file" accept="image/*" onChange={onUpload} />
              </div>
            )}

            {mode === "camera" && (
              <div>
                {!cameraOpen ? (
                  <div className="flex gap-2">
                    <button onClick={() => setCameraOpen(true)} className="px-3 py-1 bg-green-600 text-white rounded">Open Camera</button>
                    <button onClick={() => setPhoto(null)} className="px-3 py-1 border rounded">Clear</button>
                  </div>
                ) : (
                  <div>
                    <Webcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg" className="rounded w-full" />
                    <div className="flex gap-2 mt-2">
                      <button onClick={capture} className="px-3 py-1 bg-indigo-600 text-white rounded">Capture</button>
                      <button onClick={() => setCameraOpen(false)} className="px-3 py-1 border rounded">Close Camera</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div>
              <div className="text-xs text-slate-500 mb-2">Preview</div>
              {photo ? (
                <img src={photo} alt="preview" className="w-36 h-36 object-cover rounded border" />
              ) : (
                <div className="w-36 h-36 bg-slate-100 rounded flex items-center justify-center text-slate-400">No photo</div>
              )}
            </div>

            <div className="flex gap-2">
              <button onClick={backToDetails} className="px-3 py-2 border rounded">Back</button>
              <button onClick={() => setStep(3)} className="px-3 py-2 bg-indigo-600 text-white rounded">Next: Confirm</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="text-sm text-slate-600">Confirm details and submit</div>
            <div className="bg-slate-50 p-3 rounded border grid grid-cols-2 gap-2">
              <div>
                <div className="text-xs text-slate-500">Name</div>
                <div className="font-medium">{form.name}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Phone</div>
                <div className="font-medium">{form.phone}</div>
              </div>
              <div className="col-span-2">
                <div className="text-xs text-slate-500">Purpose</div>
                <div>{form.purpose || "-"}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Company</div>
                <div>{form.company || "-"}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Person</div>
                <div>{form.personToMeet || "-"}</div>
              </div>
              <div className="col-span-2">
                <div className="text-xs text-slate-500">Check-in</div>
                <div>{new Date(form.checkin_time).toLocaleString()}</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button onClick={() => setStep(2)} className="px-3 py-2 border rounded">Back</button>
              <button onClick={submitCheckin} disabled={loading} className="px-4 py-2 bg-purple-600 text-white rounded">{loading ? "Saving..." : "Confirm & Check In"}</button>
            </div>
          </div>
        )}
      </div>

      {/* Right column */}
      <div className="bg-white rounded-2xl p-4 shadow space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold">Checked In ({checkedInCount})</h4>
            <div className="text-xs text-slate-500">Active visitors and recent activity</div>
          </div>
          <div className="flex items-center gap-2">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name/phone/purpose" className="p-2 border rounded" />
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="p-2 border rounded">
              <option value="all">All</option>
              <option value="in">In</option>
              <option value="out">Out</option>
            </select>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="p-2 border rounded">
              <option value="checkin_time">Newest</option>
              <option value="name">Name</option>
            </select>
            <button onClick={() => downloadCSV("visitors.csv", visitors)} className="px-3 py-1 border rounded text-sm">Export</button>
          </div>
        </div>

        <div className="max-h-[60vh] overflow-auto space-y-2">
          {visible.length === 0 && <div className="text-sm text-slate-400">No visitors found</div>}
          {paged.map((v) => (
            <div key={v.id} className="flex items-center justify-between p-3 border rounded">
              <div className="flex items-center gap-3">
                <Avatar src={v.photo} alt={v.name} />
                <div>
                  <div className="font-medium">{v.name}</div>
                  <div className="text-xs text-slate-500">{v.purpose} • {v.company || "-"}</div>
                  <div className="text-xs text-slate-400">{epochToPretty(v.checkin_time)}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!v.checkout_time ? (
                  <button onClick={() => checkout(v.id)} className="px-3 py-1 bg-red-500 text-white rounded">Check Out</button>
                ) : (
                  <div className="text-xs text-slate-500">Checked out</div>
                )}
                <button onClick={() => setDetail(v)} className="px-2 py-1 border rounded text-sm">Details</button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div className="text-sm text-slate-500">Showing {visible.length} entries</div>
          <Pagination page={page} totalPages={totalPages} onChange={(p) => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
        </div>

        <div className="text-xs text-slate-400">Tip: Use Export to download CSV of entries</div>
      </div>

      <Modal open={!!detail} onClose={() => setDetail(null)} title="Visitor details">
        {detail && (
          <div className="grid grid-cols-2 gap-4">
            <div>{detail.photo ? <img src={detail.photo} alt="p" className="w-full h-52 object-cover rounded" /> : <div className="w-full h-52 bg-slate-100 rounded" />}</div>
            <div>
              <div className="font-semibold text-lg mb-2">{detail.name}</div>
              <div className="text-sm text-slate-600 mb-1">Phone: {detail.phone}</div>
              <div className="text-sm text-slate-600 mb-1">Company: {detail.company || "-"}</div>
              <div className="text-sm text-slate-600 mb-1">Person: {detail.personToMeet || "-"}</div>
              <div className="text-sm text-slate-600 mb-1">Purpose: {detail.purpose || "-"}</div>
              <div className="text-sm text-slate-400 mt-2">In: {epochToPretty(detail.checkin_time)}</div>
              <div className="text-sm text-slate-400">Out: {detail.checkout_time ? epochToPretty(detail.checkout_time) : "—"}</div>
            </div>
          </div>
        )}
      </Modal>

      <Lightbox open={!!lightSrc} src={lightSrc} onClose={() => setLightSrc(null)} />
    </div>
  );
}

/* --------------------- Step UI --------------------- */
function StepPills({ step }) {
  const items = ["Details", "Photo", "Confirm"];
  return (
    <div className="flex items-center gap-4">
      {items.map((it, i) => (
        <div key={it} className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === i + 1 ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{i + 1}</div>
          <div className={`text-sm ${step === i + 1 ? 'text-slate-800 font-medium' : 'text-slate-500'}`}>{it}</div>
        </div>
      ))}
    </div>
  );
}

/* --------------------- Reports --------------------- */
function Reports() {
  const { push } = useToastsCtx();
  const [daily, setDaily] = useState([]);
  const [monthly, setMonthly] = useState([]);
  const [visitors, setVisitors] = useState([]);
  const [err, setErr] = useState("");

  async function loadAll() {
    try {
      const d = await apiFetch("/reports/daily?days=7");
      const m = await apiFetch("/reports/monthly?months=6");
      const v = await apiFetch("/visitors");
      setDaily(d);
      setMonthly(m);
      setVisitors((v || []).map((it) => ({ ...it, checkin_time: Number(it.checkin_time) || (it.checkin_time ? Math.floor(new Date(it.checkin_time).getTime() / 1000) : null) })).sort((a, b) => (b.checkin_time || 0) - (a.checkin_time || 0)));
    } catch (e) {
      setErr(e.message || "Failed to load reports");
      push(e.message || "Failed to load reports");
    }
  }

  useEffect(() => {
    loadAll();
    window.addEventListener('vms:visitors-changed', loadAll);
    return () => window.removeEventListener('vms:visitors-changed', loadAll);
  }, []);

  return (
    <div className="bg-white rounded-2xl p-6 shadow">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold">Reports</h3>
          <div className="text-sm text-slate-500">Analytics & entries</div>
        </div>
      </div>

      {err && <div className="text-red-500 mb-4">{err}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="h-56 bg-gradient-to-br from-white to-slate-50 p-4 rounded">
          <h4 className="mb-2 font-medium">Daily (7 days)</h4>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={daily}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#6366f1" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="h-56 bg-gradient-to-br from-white to-slate-50 p-4 rounded">
          <h4 className="mb-2 font-medium">Monthly (6 months)</h4>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#a855f7" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <h4 className="mb-3 font-semibold">All Entries</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border">
            <thead className="bg-slate-50">
              <tr>
                <th className="p-2 border">Photo</th>
                <th className="p-2 border">Name</th>
                <th className="p-2 border">Phone</th>
                <th className="p-2 border">Purpose</th>
                <th className="p-2 border">Company</th>
                <th className="p-2 border">Person</th>
                <th className="p-2 border">Check-In</th>
                <th className="p-2 border">Check-Out</th>
                <th className="p-2 border">Status</th>
              </tr>
            </thead>
            <tbody>
              {visitors.map((v) => (
                <tr key={v.id} className="odd:bg-white even:bg-slate-50">
                  <td className="p-2 border">{v.photo ? <Avatar src={v.photo} alt={v.name} /> : "-"}</td>
                  <td className="p-2 border">{v.name}</td>
                  <td className="p-2 border">{v.phone}</td>
                  <td className="p-2 border">{v.purpose}</td>
                  <td className="p-2 border">{v.company}</td>
                  <td className="p-2 border">{v.personToMeet}</td>
                  <td className="p-2 border">{epochToPretty(v.checkin_time)}</td>
                  <td className="p-2 border">{v.checkout_time ? epochToPretty(v.checkout_time) : "-"}</td>
                  <td className="p-2 border">{v.checkout_time ? "Out" : "In"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex gap-2">
          <button onClick={() => downloadCSV("all-visitors.csv", visitors)} className="px-3 py-2 border rounded">Export CSV</button>
        </div>
      </div>
    </div>
  );
}

/* --------------------- end --------------------- */
