import Invoice from "../models/Invoice.js";
import Project from "../models/Project.js";
import { ensureLinkedAccount, getSettings, postJournal } from "./accounting.js";

function last6(id = "") {
  const s = String(id || "");
  return s.slice(-6).toUpperCase();
}

function computeInvoiceAmount({ items = [], tax1 = 0, tax2 = 0 } = {}) {
  const list = Array.isArray(items) ? items : [];
  const subTotal = list.reduce((sum, it) => sum + (Number(it?.quantity ?? it?.qty ?? 0) * Number(it?.rate ?? 0)), 0);
  const t1 = (Number(tax1 || 0) / 100) * subTotal;
  const t2 = (Number(tax2 || 0) / 100) * subTotal;
  return Math.max(0, subTotal + t1 + t2);
}

export async function ensureProjectForContract({ contract, session } = {}) {
  if (!contract?._id) return { contract, project: null, created: false };

  let project = null;
  const hasProjectId = Boolean(contract.projectId);

  if (hasProjectId) {
    project = session
      ? await Project.findById(contract.projectId).session(session).lean().catch(() => null)
      : await Project.findById(contract.projectId).lean().catch(() => null);
  }

  if (project?._id) {
    return { contract, project, created: false };
  }

  const payload = {
    title: String(contract.title || "Project from Contract").slice(0, 120),
    clientId: contract.clientId || undefined,
    client: contract.client || "",
    price: Number(contract.amount || 0),
    start: new Date(),
    deadline: contract.validUntil || undefined,
    status: "Open",
    description: `Created from Contract ${String(contract._id)}`,
    labels: `contract:${String(contract._id)}`,
  };

  const created = await Project.create([payload], session ? { session } : undefined).then((r) => r?.[0]);
  project = created ? (created.toObject ? created.toObject() : created) : null;

  if (project?._id) {
    const label = `contract:${String(contract._id)}`;
    try {
      const q = Invoice.updateMany(
        { labels: label, $or: [{ projectId: { $exists: false } }, { projectId: null }] },
        { $set: { projectId: project._id, project: String(project.title || "") } }
      );
      if (session) q.session(session);
      await q;
    } catch {}
    return { contract: { ...contract, projectId: project._id }, project, created: true };
  }

  return { contract, project: null, created: false };
}

export async function ensureInvoiceForContract({ contract, project, session } = {}) {
  if (!contract?._id) return { invoice: null, created: false };

  const label = `contract:${String(contract._id)}`;

  const existing = session
    ? await Invoice.findOne({ labels: label }).session(session).lean().catch(() => null)
    : await Invoice.findOne({ labels: label }).lean().catch(() => null);

  if (existing?._id) return { invoice: existing, created: false };

  let items = (Array.isArray(contract.items) ? contract.items : []).map((it) => {
    const qty = Number(it?.quantity ?? 1) || 0;
    const rate = Number(it?.rate ?? 0) || 0;
    return {
      name: String(it?.name || "Item"),
      quantity: qty,
      rate,
      taxable: false,
      total: Number(it?.total ?? (qty * rate)) || 0,
    };
  });

  if (!items.length && Number(contract.amount || 0) > 0) {
    const amt = Number(contract.amount || 0);
    items = [
      {
        name: String(contract.title || "Contract"),
        quantity: 1,
        rate: amt,
        taxable: false,
        total: amt,
      },
    ];
  }

  const tax1 = Number(contract.tax1 || 0) || 0;
  const tax2 = Number(contract.tax2 || 0) || 0;

  const amount = computeInvoiceAmount({ items, tax1, tax2 });

  let projectId = contract.projectId || undefined;
  let projectTitle = "";

  if (project?._id) {
    projectId = project._id;
    projectTitle = String(project.title || "");
  } else if (projectId) {
    const proj = session
      ? await Project.findById(projectId).session(session).lean().catch(() => null)
      : await Project.findById(projectId).lean().catch(() => null);
    if (proj) {
      projectTitle = String(proj.title || "");
    }
  }

  const payload = {
    number: `CON-${last6(contract._id)}`,
    clientId: contract.clientId || undefined,
    client: contract.client || "",
    issueDate: new Date(),
    dueDate: contract.validUntil || undefined,
    status: "Unpaid",
    items,
    amount,
    tax1,
    tax2,
    note: String(contract.note || ""),
    projectId,
    project: projectTitle,
    labels: label,
  };

  const doc = await Invoice.create([payload], session ? { session } : undefined).then((r) => r?.[0]);
  const invoice = doc ? (doc.toObject ? doc.toObject() : doc) : null;

  try {
    const amt = Number(invoice?.amount || 0);
    if (amt > 0 && invoice?.clientId) {
      const settings = await getSettings();
      const clientAcc = await ensureLinkedAccount("client", invoice.clientId, invoice.client || "Client");
      await postJournal({
        date: invoice.issueDate || new Date(),
        memo: `Invoice ${invoice.number}`,
        refNo: String(invoice.number || ""),
        lines: [
          { accountCode: clientAcc.code, debit: amt, credit: 0, entityType: "client", entityId: invoice.clientId },
          { accountCode: settings.revenueAccount, debit: 0, credit: amt },
        ],
        postedBy: "system",
      });
    }
  } catch (_) {}

  return { invoice, created: Boolean(invoice?._id) };
}

export async function upsertInvoiceForContract({ contract, project, session } = {}) {
  if (!contract?._id) return { invoice: null, created: false, updated: false };

  const label = `contract:${String(contract._id)}`;

  const existing = session
    ? await Invoice.findOne({ labels: label }).session(session).catch(() => null)
    : await Invoice.findOne({ labels: label }).catch(() => null);

  if (!existing?._id) {
    const r = await ensureInvoiceForContract({ contract, project, session });
    return { invoice: r.invoice, created: r.created, updated: false };
  }

  let items = (Array.isArray(contract.items) ? contract.items : []).map((it) => {
    const qty = Number(it?.quantity ?? 1) || 0;
    const rate = Number(it?.rate ?? 0) || 0;
    return {
      name: String(it?.name || "Item"),
      quantity: qty,
      rate,
      taxable: Boolean(it?.taxable) || false,
      total: Number(it?.total ?? (qty * rate)) || 0,
    };
  });

  if (!items.length && Number(contract.amount || 0) > 0) {
    const amt = Number(contract.amount || 0);
    items = [
      {
        name: String(contract.title || "Contract"),
        quantity: 1,
        rate: amt,
        taxable: false,
        total: amt,
      },
    ];
  }

  const tax1 = Number(contract.tax1 || 0) || 0;
  const tax2 = Number(contract.tax2 || 0) || 0;
  const amount = computeInvoiceAmount({ items, tax1, tax2 });

  let projectId = contract.projectId || undefined;
  let projectTitle = "";
  if (project?._id) {
    projectId = project._id;
    projectTitle = String(project.title || "");
  } else if (projectId) {
    const proj = session
      ? await Project.findById(projectId).session(session).lean().catch(() => null)
      : await Project.findById(projectId).lean().catch(() => null);
    if (proj) projectTitle = String(proj.title || "");
  }

  const patch = {
    clientId: contract.clientId || undefined,
    client: contract.client || "",
    dueDate: contract.validUntil || existing.dueDate || undefined,
    items,
    amount,
    tax1,
    tax2,
    note: String(contract.note || ""),
    projectId,
    project: projectTitle,
    labels: label,
  };

  const q = Invoice.findByIdAndUpdate(existing._id, { $set: patch }, { new: true });
  if (session) q.session(session);
  const updated = await q.catch(() => null);
  const invoice = updated ? (updated.toObject ? updated.toObject() : updated) : (existing.toObject ? existing.toObject() : existing);

  return { invoice, created: false, updated: true };
}
