// components/JsonExplorer.tsx
"use client";

import React, { useMemo, useState } from "react";

type JsonExplorerProps = {
  sample: any; // parsed JSON sample
  initialSelection?: string[]; // optional
  onChange: (selectedPaths: string[]) => void;
  maxDepth?: number;
};

function isPlainObject(v: any) {
  return v && typeof v === "object" && !Array.isArray(v);
}

function inferType(val: any) {
  if (val === null) return "null";
  if (Array.isArray(val)) return "array";
  if (typeof val === "number") return "number";
  if (typeof val === "boolean") return "boolean";
  // simple date check
  if (typeof val === "string" && !isNaN(Date.parse(val))) return "date";
  return typeof val;
}

function buildPaths(obj: any, prefix = "", maxDepth = 5, depth = 0): Array<{ path: string; value: any }> {
  if (depth > maxDepth) return [];
  if (Array.isArray(obj)) {
    if (obj.length === 0) return [{ path: prefix + "[0]", value: undefined }];
    // explore first element only (common for API arrays)
    return buildPaths(obj[0], prefix ? `${prefix}[0]` : "[0]", maxDepth, depth + 1);
  }
  if (!isPlainObject(obj)) {
    return [{ path: prefix || "$", value: obj }];
  }

  const result: Array<{ path: string; value: any }> = [];
  for (const key of Object.keys(obj)) {
    const newPrefix = prefix ? `${prefix}.${key}` : key;
    const v = (obj as any)[key];
    if (isPlainObject(v) || Array.isArray(v)) {
      result.push(...buildPaths(v, newPrefix, maxDepth, depth + 1));
    } else {
      result.push({ path: newPrefix, value: v });
    }
  }
  return result;
}

export default function JsonExplorer({ sample, onChange, initialSelection = [], maxDepth = 5 }: JsonExplorerProps) {
  const [selected, setSelected] = useState<string[]>(initialSelection);

  const flat = useMemo(() => buildPaths(sample, "", maxDepth, 0), [sample, maxDepth]);

  function toggle(path: string) {
    setSelected((s) => {
      const exists = s.includes(path);
      const next = exists ? s.filter((x) => x !== path) : [...s, path];
      onChange(next);
      return next;
    });
  }

  function selectAll() {
    const all = flat.map((p) => p.path);
    setSelected(all);
    onChange(all);
  }

  function deselectAll() {
    setSelected([]);
    onChange([]);
  }

  return (
    <div style={{ padding: 8, maxHeight: 360, overflow: "auto", border: "1px solid #213" }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <button type="button" onClick={selectAll}>Select all</button>
        <button type="button" onClick={deselectAll}>Clear</button>
        <div style={{ marginLeft: "auto", fontSize: 12, color: "#9aa" }}>{flat.length} fields</div>
      </div>

      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {flat.map((p) => (
          <li key={p.path} style={{ display: "flex", alignItems: "center", padding: "4px 0", borderBottom: "1px dashed rgba(255,255,255,0.02)" }}>
            <input
              type="checkbox"
              checked={selected.includes(p.path)}
              onChange={() => toggle(p.path)}
              style={{ marginRight: 8 }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <code style={{ background: "#061022", padding: "2px 6px", borderRadius: 4 }}>{p.path}</code>
                <small style={{ color: "#9aa" }}>{inferType(p.value)}</small>
              </div>
              <div style={{ fontSize: 12, color: "#9aa", marginTop: 4 }}>{String(p.value)}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
