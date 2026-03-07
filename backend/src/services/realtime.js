import { EventEmitter } from "node:events";

const emitter = new EventEmitter();

// Keep a registry of connected clients so we can broadcast efficiently.
// Each client: { id, res, userId, role, createdAt }
const clients = new Map();
let nextId = 1;

export function registerSseClient({ res, user }) {
  const id = String(nextId++);
  const userId = user?._id ? String(user._id) : "";
  const role = String(user?.role || "").trim().toLowerCase();

  clients.set(id, {
    id,
    res,
    userId,
    role,
    createdAt: new Date(),
  });

  const onClose = () => {
    clients.delete(id);
  };

  res.on("close", onClose);
  res.on("finish", onClose);

  return () => {
    try {
      res.off("close", onClose);
      res.off("finish", onClose);
    } catch {}
    clients.delete(id);
  };
}

function formatSse({ event, data }) {
  const payload = typeof data === "string" ? data : JSON.stringify(data ?? {});
  const e = String(event || "message").trim() || "message";
  return `event: ${e}\ndata: ${payload}\n\n`;
}

export function broadcastSse({ event, data }) {
  const msg = formatSse({ event, data });
  for (const c of clients.values()) {
    try {
      c.res.write(msg);
    } catch {
      clients.delete(c.id);
    }
  }
  emitter.emit("broadcast", { event, data });
}

export function getSseClientCount() {
  return clients.size;
}
