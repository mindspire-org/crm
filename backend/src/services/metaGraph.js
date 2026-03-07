import https from "node:https";

function buildQuery(params = {}) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    const s = String(v);
    if (!s) continue;
    sp.set(k, s);
  }
  return sp.toString();
}

export async function metaGraphGet(path, params = {}, opts = {}) {
  const accessToken = String(opts?.accessToken || process.env.META_ACCESS_TOKEN || "").trim();
  if (!accessToken) throw new Error("META_ACCESS_TOKEN is not configured");

  const query = buildQuery({ ...params, access_token: accessToken });
  const urlPath = `/${String(path).replace(/^\/+/, "")}${query ? `?${query}` : ""}`;

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        method: "GET",
        host: "graph.facebook.com",
        path: urlPath,
        headers: { "Content-Type": "application/json" },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          try {
            const json = data ? JSON.parse(data) : null;
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              resolve(json);
              return;
            }
            const msg = json?.error?.message || `Meta API error (${res.statusCode})`;
            reject(new Error(msg));
          } catch (e) {
            reject(new Error(`Failed to parse Meta API response (${res.statusCode})`));
          }
        });
      }
    );

    req.on("error", (err) => reject(err));
    req.end();
  });
}
