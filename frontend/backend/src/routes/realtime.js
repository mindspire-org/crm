import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { registerSseClient, getSseClientCount } from "../services/realtime.js";

const router = Router();

router.get("/stream", authenticate, async (req, res) => {
  // SSE headers
  res.status(200);
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  // Nginx: disable buffering for SSE
  res.setHeader("X-Accel-Buffering", "no");

  // Flush headers early
  try {
    res.flushHeaders?.();
  } catch {}

  // Initial hello
  res.write(`event: hello\ndata: ${JSON.stringify({ ok: true, now: new Date().toISOString() })}\n\n`);

  const unregister = registerSseClient({ res, user: req.user });

  // Keepalive ping to prevent proxies from closing idle connections
  const ping = () => {
    try {
      res.write(`event: ping\ndata: ${JSON.stringify({ t: Date.now(), clients: getSseClientCount() })}\n\n`);
    } catch {
      // ignore
    }
  };

  const t = setInterval(ping, 25000);

  req.on("close", () => {
    clearInterval(t);
    unregister();
  });
});

export default router;
