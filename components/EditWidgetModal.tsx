// // components/EditWidgetModal.tsx
// "use client";

// import React, { useEffect, useState } from "react";
// import { Widget, useDashboardStore } from "../store/useDashboardStore";
// import { fetchJson } from "../lib/apiClient";
// import JsonExplorer from "./JsonExplorer";

// type Props = { widget: Widget; onClose?: () => void };

// export default function EditWidgetModal({ widget, onClose }: Props) {
//   const updateWidget = useDashboardStore((s) => s.updatewidget);
//   const removeWidget = useDashboardStore((s) => s.removewidget);

//   const [title, setTitle] = useState(widget.title);
//   const [apiUrl, setApiUrl] = useState(widget.apiUrl);
//   const [interval, setIntervalVal] = useState(widget.refreshInterval);
//   const [sample, setSample] = useState<any>(null);
//   const [loading, setLoading] = useState(false);
//   const [selected, setSelected] = useState<string[]>(widget.fields || []);
//   const [error, setError] = useState<string | null>(null);

//   useEffect(() => {
//     // optionally fetch sample at open
//     handleTest();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   async function handleTest() {
//     setError(null);
//     setLoading(true);
//     try {
//       const j = await fetchJson(apiUrl, true);
//       setSample(j);
//     } catch (e: any) {
//       setError(e.message || "Failed to fetch sample");
//       setSample(null);
//     } finally {
//       setLoading(false);
//     }
//   }

//   function handleSave() {
//     updateWidget(widget.id, {
//       title,
//       apiUrl,
//       refreshInterval: Math.max(5, Number(interval) || 30),
//       fields: selected,
//     });
//     onClose?.();
//   }

//   function handleDelete() {
//     if (!confirm("Delete this widget?")) return;
//     removeWidget(widget.id);
//     onClose?.();
//   }

//   return (
//     <div style={{ position: "relative", background: "#071025", color: "white", padding: 12, borderRadius: 8, width: 740 }}>
//       <h4>Edit widget</h4>
//       <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 12 }}>
//         <div>
//           <label>Title</label>
//           <input value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: "100%" }} />

//           <label style={{ marginTop: 8 }}>API URL</label>
//           <input value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} style={{ width: "100%" }} />

//           <div style={{ marginTop: 8 }}>
//             <button onClick={handleTest} disabled={loading}>{loading ? "Testing…" : "Test API"}</button>
//             <button onClick={() => { setSample(null); setSelected([]); }}>Clear sample</button>
//           </div>

//           <label style={{ marginTop: 8 }}>Refresh (s)</label>
//           <input type="number" value={interval} onChange={(e) => setIntervalVal(Number(e.target.value) || 30)} />

//           <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
//             <button onClick={handleSave}>Save</button>
//             <button onClick={handleDelete} style={{ color: "salmon" }}>Delete</button>
//             <button onClick={() => onClose?.()}>Cancel</button>
//           </div>
//         </div>

//         <div>
//           <div style={{ background: "#021427", padding: 8, borderRadius: 6, minHeight: 200 }}>
//             <strong>Sample Preview</strong>
//             <div style={{ marginTop: 6, maxHeight: 340, overflow: "auto", fontSize: 12 }}>
//               {!sample && <div style={{ color: "#789" }}>No sample yet. Click Test API</div>}
//               {sample && <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(sample, null, 2)}</pre>}
//             </div>
//           </div>
//         </div>
//       </div>

//       <div style={{ marginTop: 12 }}>
//         {sample && (
//           <>
//             <h5>Pick fields</h5>
//             <JsonExplorer sample={sample} initialSelection={selected} onChange={(next) => setSelected(next)} />
//             <div style={{ marginTop: 8, color: "#9aa" }}>Selected: {selected.join(", ") || "none"}</div>
//           </>
//         )}

//         {error && <div style={{ color: "salmon", marginTop: 8 }}>{error}</div>}
//       </div>
//     </div>
//   );
// }
