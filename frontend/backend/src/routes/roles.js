import { Router } from "express";
import Role from "../models/Role.js";
import { authenticate, isAdmin } from "../middleware/auth.js";

const router = Router();

router.get("/", authenticate, isAdmin, async (_req, res) => {
  try {
    const roles = await Role.find({}).sort({ createdAt: -1 }).lean();
    res.json(roles);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/", authenticate, isAdmin, async (req, res) => {
  try {
    const { name, description, permissions } = req.body || {};
    const nextName = String(name || "").trim();
    if (!nextName) return res.status(400).json({ error: "Role name is required" });

    const role = await Role.create({
      name: nextName,
      description: String(description || "").trim(),
      permissions: Array.isArray(permissions) ? permissions.map((x) => String(x)) : [],
    });

    res.status(201).json(role);
  } catch (e) {
    if (String(e?.code) === "11000") {
      return res.status(409).json({ error: "Role name already exists" });
    }
    res.status(400).json({ error: e.message });
  }
});

router.put("/:id", authenticate, isAdmin, async (req, res) => {
  try {
    const { name, description, permissions } = req.body || {};
    const update = {};

    if (name !== undefined) {
      const nextName = String(name || "").trim();
      if (!nextName) return res.status(400).json({ error: "Role name is required" });
      update.name = nextName;
    }

    if (description !== undefined) update.description = String(description || "").trim();

    if (permissions !== undefined) {
      if (!Array.isArray(permissions)) return res.status(400).json({ error: "Invalid permissions" });
      update.permissions = permissions.map((x) => String(x));
    }

    const role = await Role.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true }).lean();
    if (!role) return res.status(404).json({ error: "Role not found" });
    res.json(role);
  } catch (e) {
    if (String(e?.code) === "11000") {
      return res.status(409).json({ error: "Role name already exists" });
    }
    res.status(400).json({ error: e.message });
  }
});

router.delete("/:id", authenticate, isAdmin, async (req, res) => {
  try {
    const role = await Role.findByIdAndDelete(req.params.id).lean();
    if (!role) return res.status(404).json({ error: "Role not found" });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
