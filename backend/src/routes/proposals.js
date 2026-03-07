import { Router } from "express";
import Proposal from "../models/Proposal.js";
import Lead from "../models/Lead.js";
import Contract from "../models/Contract.js";
import Project from "../models/Project.js";
import { authenticate } from "../middleware/auth.js";
import mongoose from "mongoose";
import { ensureInvoiceForContract } from "../services/contractOps.js";

const router = Router();

router.use(authenticate);

router.use((req, res, next) => {
  if (String(req.user?.role || "").toLowerCase() === "client") {
    return res.status(403).json({ error: "Access denied" });
  }
  next();
});

const toStr = (v) => (v === undefined || v === null ? "" : String(v));

const normalizeItems = (raw) => {
  const list = Array.isArray(raw) ? raw : [];
  return list
    .map((it) => ({
      name: toStr(it?.name).trim(),
      qty: Number(it?.qty ?? 1) || 0,
      rate: Number(it?.rate ?? 0) || 0,
    }))
    .filter((it) => it.name);
};

const ensureAcceptedConversionCore = async ({ proposalId, userId, acceptedFrom, session }) => {
  const proposal = session
    ? await Proposal.findById(proposalId).session(session)
    : await Proposal.findById(proposalId);
  if (!proposal) throw new Error("Not found");

  // 1) Ensure contract exists and is linked
  let contract = null;
  if (proposal.contractId) {
    contract = session
      ? await Contract.findById(proposal.contractId).session(session)
      : await Contract.findById(proposal.contractId);
  }

  if (!contract) {
    contract = session
      ? await Contract.findOne({ proposalId: proposal._id }).session(session)
      : await Contract.findOne({ proposalId: proposal._id });
  }

  if (!contract) {
    const items = Array.isArray(proposal.items) ? proposal.items : [];
    try {
      contract = await Contract.create(
        [
          {
            clientId: proposal.clientId || undefined,
            leadId: proposal.leadId || undefined,
            client: proposal.client || "",
            projectId: undefined,
            proposalId: proposal._id,
            title: proposal.title || `Contract for Proposal ${proposal.number || proposal._id}`,
            amount: Number(proposal.amount || 0),
            contractDate: new Date(),
            validUntil: proposal.validUntil || undefined,
            status: "draft",
            tax1: Number(proposal.tax1 || 0),
            tax2: Number(proposal.tax2 || 0),
            note: proposal.note || "",
            items: items.map((it) => ({
              name: toStr(it?.name).trim(),
              description: "",
              quantity: Number(it?.qty ?? 1) || 0,
              rate: Number(it?.rate ?? 0) || 0,
            })),
            fileIds: Array.isArray(proposal.fileIds) ? proposal.fileIds : [],
          },
        ],
        session ? { session } : undefined
      ).then((r) => r?.[0]);
    } catch (e) {
      const msg = String(e?.message || "");
      const isDup = msg.includes("E11000") || e?.code === 11000;
      if (!isDup) throw e;
      contract = session
        ? await Contract.findOne({ proposalId: proposal._id }).session(session)
        : await Contract.findOne({ proposalId: proposal._id });
    }
  }

  // Keep bidirectional linkage consistent
  if (!proposal.contractId || String(proposal.contractId) !== String(contract._id)) {
    proposal.contractId = contract._id;
  }
  if (!contract.proposalId || String(contract.proposalId) !== String(proposal._id)) {
    contract.proposalId = proposal._id;
    await contract.save(session ? { session } : undefined);
  }

  // 2) Ensure project exists and is linked to contract
  let project = null;
  if (contract.projectId) {
    project = session
      ? await Project.findById(contract.projectId).session(session)
      : await Project.findById(contract.projectId);
  }
  if (!project) {
    project = await Project.create(
      [
        {
          title: (proposal.title || "Project from Proposal").slice(0, 120),
          clientId: proposal.clientId || undefined,
          client: proposal.client || "",
          price: Number(proposal.amount || 0),
          start: new Date(),
          deadline: proposal.validUntil || undefined,
          status: "Open",
        },
      ],
      session ? { session } : undefined
    ).then((r) => r?.[0]);
    contract.projectId = project?._id;
    await contract.save(session ? { session } : undefined);
  }

  // 3) Mark lead as Won
  if (proposal.leadId) {
    const q = Lead.updateOne({ _id: proposal.leadId }, { $set: { status: "Won" } });
    if (session) q.session(session);
    await q;
  }

  // 4) Audit fields
  if (!proposal.acceptedAt) proposal.acceptedAt = new Date();
  if (!proposal.acceptedBy && userId) proposal.acceptedBy = userId;
  if (!proposal.acceptedFrom) proposal.acceptedFrom = toStr(acceptedFrom || "");

  await proposal.save(session ? { session } : undefined);

  return {
    proposal: proposal.toObject(),
    contract: contract?.toObject ? contract.toObject() : contract,
    project: project?.toObject ? project.toObject() : project,
  };
};

const ensureAcceptedConversion = async ({ proposalId, userId, acceptedFrom }) => {
  const session = await mongoose.startSession();
  try {
    const result = await session.withTransaction(async () => {
      return ensureAcceptedConversionCore({ proposalId, userId, acceptedFrom, session });
    });
    try {
      const contractId = result?.proposal?.contractId;
      const contractDoc = contractId ? await Contract.findById(contractId).lean().catch(() => null) : result?.contract;
      if (contractDoc?._id) {
        await ensureInvoiceForContract({ contract: contractDoc, project: result?.project });
      }
    } catch {}
    return result;
  } catch (e) {
    // Fallback for standalone MongoDB (no replica set) where transactions are not supported.
    const msg = String(e?.message || "");
    const isTxUnsupported = msg.toLowerCase().includes("transaction") && msg.toLowerCase().includes("replica");
    if (!isTxUnsupported) throw e;
    const result = await ensureAcceptedConversionCore({ proposalId, userId, acceptedFrom, session: null });
    try {
      const contractId = result?.proposal?.contractId;
      const contractDoc = contractId ? await Contract.findById(contractId).lean().catch(() => null) : result?.contract;
      if (contractDoc?._id) {
        await ensureInvoiceForContract({ contract: contractDoc, project: result?.project });
      }
    } catch {}
    return result;
  } finally {
    session.endSession();
  }
};

router.get("/", async (req, res) => {
  try {
    const q = req.query.q?.toString().trim();
    const clientId = req.query.clientId?.toString();
    const leadId = req.query.leadId?.toString();
    const filter = {};
    if (clientId) filter.clientId = clientId;
    if (leadId) filter.leadId = leadId;
    if (q) filter.$or = [{ title: { $regex: q, $options: "i" } }, { client: { $regex: q, $options: "i" } }];
    const items = await Proposal.find(filter).sort({ createdAt: -1 }).lean();
    res.json(items);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.get("/:id", async (req, res) => {
  try {
    const doc = await Proposal.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(doc);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.post("/", async (req, res) => {
  try {
    const body = req.body || {};
    const payload = {
      clientId: body.clientId || undefined,
      leadId: body.leadId || undefined,
      client: toStr(body.client).trim(),
      title: toStr(body.title).trim(),
      amount: Number(body.amount || 0),
      proposalDate: body.proposalDate ? new Date(body.proposalDate) : undefined,
      validUntil: body.validUntil ? new Date(body.validUntil) : undefined,
      status: toStr(body.status).trim() || "draft",
      tax1: Number(body.tax1 || 0),
      tax2: Number(body.tax2 || 0),
      note: toStr(body.note),
      items: normalizeItems(body.items),
      fileIds: Array.isArray(body.fileIds) ? body.fileIds : [],
    };
    const doc = await Proposal.create(payload);
    res.status(201).json(doc);
  }
  catch (e) { res.status(400).json({ error: e.message }); }
});

router.put("/:id", async (req, res) => {
  try {
    const pre = await Proposal.findById(req.params.id).lean();
    if (!pre) return res.status(404).json({ error: "Not found" });

    const body = req.body || {};
    const update = {};

    if (body.clientId !== undefined) update.clientId = body.clientId || undefined;
    if (body.leadId !== undefined) update.leadId = body.leadId || undefined;
    if (body.client !== undefined) update.client = toStr(body.client);
    if (body.title !== undefined) update.title = toStr(body.title);
    if (body.amount !== undefined) update.amount = Number(body.amount || 0);
    if (body.proposalDate !== undefined) update.proposalDate = body.proposalDate ? new Date(body.proposalDate) : undefined;
    if (body.validUntil !== undefined) update.validUntil = body.validUntil ? new Date(body.validUntil) : undefined;
    if (body.status !== undefined) update.status = toStr(body.status).trim() || "draft";
    if (body.tax1 !== undefined) update.tax1 = Number(body.tax1 || 0);
    if (body.tax2 !== undefined) update.tax2 = Number(body.tax2 || 0);
    if (body.note !== undefined) update.note = toStr(body.note);
    if (body.items !== undefined) update.items = normalizeItems(body.items);
    if (body.fileIds !== undefined) update.fileIds = Array.isArray(body.fileIds) ? body.fileIds : [];

    const next = await Proposal.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!next) return res.status(404).json({ error: "Not found" });

    const becameAccepted = String(update?.status || "").toLowerCase() === "accepted" && String(pre?.status || "").toLowerCase() !== "accepted";
    const isAccepted = String(next?.status || "").toLowerCase() === "accepted";

    if (becameAccepted || (isAccepted && (!next.contractId || !next.acceptedAt))) {
      const acceptedFrom = String(req.user?.role || "").toLowerCase() === "client" ? "client_portal" : "staff_portal";
      const result = await ensureAcceptedConversion({ proposalId: next._id, userId: req.user?._id, acceptedFrom });
      return res.json(result?.proposal || next);
    }

    res.json(next);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete("/:id", async (req, res) => {
  try { const r = await Proposal.findByIdAndDelete(req.params.id); if (!r) return res.status(404).json({ error: "Not found" }); res.json({ ok: true }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

export default router;
