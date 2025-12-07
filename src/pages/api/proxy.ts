// src/pages/api/proxy.ts
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const body = req.method === "GET" ? req.query : req.body;
    const url = (body as any).url;
    if (!url || typeof url !== "string") return res.status(400).json({ error: "Missing url" });

    // Optional: you can whitelist hosts here. For now allow all.
    const response = await fetch(url, {
      method: "GET",
      headers: { accept: "application/json" },
    });

    const text = await response.text();

    try {
      const json = JSON.parse(text);
      res.status(response.status).json(json);
    } catch {
      res.status(response.status).send(text);
    }
  } catch (err: any) {
    console.error("proxy error", err);
    res.status(500).json({ error: err.message || "proxy error" });
  }
}
