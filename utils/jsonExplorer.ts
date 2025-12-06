// utils/jsonExplorer.ts
export function isObject(v: any) {
  return v && typeof v === "object" && !Array.isArray(v);
}

export function buildJsonPaths(obj: any, prefix = "", maxDepth = 5, depth = 0) {
  if (depth > maxDepth) return [];

  if (Array.isArray(obj)) {
    if (obj.length === 0) return [{ path: prefix + "[0]", value: undefined }];
    return buildJsonPaths(obj[0], prefix ? `${prefix}[0]` : "[0]", maxDepth, depth + 1);
  }

  if (!isObject(obj)) {
    return [{ path: prefix || "$", value: obj }];
  }

  const results: Array<{ path: string; value: any }> = [];
  for (const key of Object.keys(obj)) {
    const newPrefix = prefix ? `${prefix}.${key}` : key;
    const value = (obj as any)[key];
    if (isObject(value) || Array.isArray(value)) {
      results.push(...buildJsonPaths(value, newPrefix, maxDepth, depth + 1));
    } else {
      results.push({ path: newPrefix, value });
    }
  }
  return results;
}
