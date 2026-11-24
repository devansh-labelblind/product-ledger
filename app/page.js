"use client";

import { useEffect, useMemo, useState } from "react";

const PW_KEY = "ledger-password";
const COUNTRIES = ["India", "US", "Canada", "GCC"];

async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  let pw = sessionStorage.getItem(PW_KEY);
  if (pw) headers["x-app-password"] = pw;
  let res = await fetch(path, { ...options, headers });
  if (res.status === 401) {
    pw = window.prompt("Password required to change the ledger:");
    if (!pw) throw new Error("Password required");
    sessionStorage.setItem(PW_KEY, pw);
    res = await fetch(path, { ...options, headers: { ...headers, "x-app-password": pw } });
    if (res.status === 401) sessionStorage.removeItem(PW_KEY);
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
  return body;
}

export default function Home() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [country, setCountry] = useState("");
  const [form, setForm] = useState({ name: "", category_code: "", url: "", country: "India" });
  const [importCountry, setImportCountry] = useState("India");
  const [formMsg, setFormMsg] = useState(null);
  const [saving, setSaving] = useState(false);
  const [importText, setImportText] = useState("");
  const [importMsg, setImportMsg] = useState(null);
  const [copied, setCopied] = useState(null);

  const load = async () => {
    try {
      const body = await api("/api/products");
      setProducts(body.products);
      setLoadError("");
    } catch (e) {
      setLoadError(e.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const categories = useMemo(
    () => [...new Set(products.map((p) => p.category_code))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    [products]
  );

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return products.filter(
      (p) =>
        (!country || p.country === country) &&
        (!category || p.category_code === category) &&
        (!needle || p.name.toLowerCase().includes(needle) || p.category_code.startsWith(needle) || p.url.toLowerCase().includes(needle))
    );
  }, [products, q, category, country]);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormMsg(null);
    try {
      const { product } = await api("/api/products", { method: "POST", body: JSON.stringify(form) });
      setProducts((list) => [product, ...list]);
      setForm({ name: "", category_code: "", url: "", country: form.country });
      setFormMsg({ ok: true, text: `Added ${product.name}` });
    } catch (err) {
      setFormMsg({ ok: false, text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (p) => {
    if (!window.confirm(`Delete ${p.name}?`)) return;
    try {
      await api(`/api/products/${p.id}`, { method: "DELETE" });
      setProducts((list) => list.filter((x) => x.id !== p.id));
    } catch (err) {
      window.alert(err.message);
    }
  };

  const copy = async (p) => {
    try {
      await navigator.clipboard.writeText(p.url);
      setCopied(p.id);
      setTimeout(() => setCopied(null), 1200);
    } catch {}
  };

  const runImport = async () => {
    setImportMsg(null);
    try {
      const r = await api("/api/import", { method: "POST", body: JSON.stringify({ text: importText, country: importCountry }) });
      setImportMsg({ ok: true, text: `Found ${r.found}, added ${r.added}, skipped ${r.skipped} already in the ledger` });
      setImportText("");
      load();
    } catch (err) {
      setImportMsg({ ok: false, text: err.message });
    }
  };

  const readFile = async (e) => {
    const f = e.target.files?.[0];
    if (f) setImportText(await f.text());
  };

  return (
    <main className="wrap">
      <h1>Product Ledger</h1>
      <p className="sub">Product names, FSSAI category codes and artwork URLs.</p>

      <div className="stats">
        <div className="stat"><b>{products.length}</b><span>Products</span></div>
        <div className="stat"><b>{categories.length}</b><span>Categories</span></div>
        <div className="stat"><b>{shown.length}</b><span>Matching search</span></div>
      </div>

      <div className="grid">
        <section className="panel">
          <div className="tools">
            <input placeholder="Search by product name, category code or URL" value={q} onChange={(e) => setQ(e.target.value)} />
            <select value={country} onChange={(e) => setCountry(e.target.value)} aria-label="Country">
              <option value="">All countries</option>
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category">
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          {loadError && <p className="msg err">{loadError}</p>}
          <div className="tablewrap">
            <table>
              <thead>
                <tr><th>Product</th><th>Country</th><th>Category</th><th>URL</th><th></th></tr>
              </thead>
              <tbody>
                {shown.map((p) => (
                  <tr key={p.id}>
                    <td className="name">{p.name}</td>
                    <td>{p.country}</td>
                    <td><span className="chip">{p.category_code}</span></td>
                    <td className="url">
                      <a href={p.url} target="_blank" rel="noreferrer" title={p.url}>{decodeURIComponent(p.url.split("/").pop())}</a>
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <button className="link" onClick={() => copy(p)}>{copied === p.id ? "Copied" : "Copy URL"}</button>
                      <button className="link danger" onClick={() => remove(p)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && !shown.length && !loadError && <p className="empty">No products match.</p>}
            {loading && <p className="empty">Loading...</p>}
          </div>
        </section>

        <aside className="side">
          <form className="panel" onSubmit={submit}>
            <h2>Add a product</h2>
            <label htmlFor="name">Name of product</label>
            <input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Tata Coffee" />
            <label htmlFor="country">Country</label>
            <select id="country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })}>
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <label htmlFor="cat">Category code</label>
            <input id="cat" required value={form.category_code} onChange={(e) => setForm({ ...form, category_code: e.target.value })} placeholder="14.1.5" />
            <label htmlFor="url">Product URL</label>
            <input id="url" required type="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://..." />
            <button className="primary" disabled={saving}>{saving ? "Saving..." : "Add to ledger"}</button>
            {formMsg && <p className={`msg ${formMsg.ok ? "ok" : "err"}`}>{formMsg.text}</p>}
          </form>

          <div className="panel">
            <details>
              <summary>Bulk import</summary>
              <label htmlFor="file">Upload a .txt or .csv file, or paste lines like: Name, 4.1.2.7, https://...</label>
              <label htmlFor="icountry">Country for these rows</label>
              <select id="icountry" value={importCountry} onChange={(e) => setImportCountry(e.target.value)}>
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <input id="file" style={{ marginTop: 8 }} type="file" accept=".txt,.csv" onChange={readFile} />
              <textarea style={{ marginTop: 8 }} value={importText} onChange={(e) => setImportText(e.target.value)} placeholder="Tata Coffee, 14.1.5, https://..." />
              <button className="primary" disabled={!importText.trim()} onClick={runImport} type="button">Import</button>
              {importMsg && <p className={`msg ${importMsg.ok ? "ok" : "err"}`}>{importMsg.text}</p>}
            </details>
          </div>
        </aside>
      </div>
    </main>
  );
}
