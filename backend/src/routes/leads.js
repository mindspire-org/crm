import { Router } from "express";
import Lead from "../models/Lead.js";
import Employee from "../models/Employee.js";
import Client from "../models/Client.js";
import Order from "../models/Order.js";
import Invoice from "../models/Invoice.js";
import Commission from "../models/Commission.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import { ensureLinkedAccount, getSettings, postJournal } from "../services/accounting.js";
import { authenticate, requirePermission, applyDataScope } from "../middleware/auth.js";
import { broadcastSse } from "../services/realtime.js";

const router = Router();

// Apply authentication and data scope to all leads routes
router.use(authenticate);
router.use(applyDataScope);

const getMyEmployeeId = async (req) => {
  const email = req.user?.email;
  if (!email) return null;
  const emp = await Employee.findOne({ email }).select("_id").lean();
  return emp ? String(emp._id) : null;
};

const ensureLeadAccess = async (req, res, lead) => {
  if (!lead) return true;
  if (req.user?.role === "admin") return true;
  if (req.user?.role === "sales_manager") return true;
  if (req.user?.role === "marketing_manager" || req.user?.role === "marketing manager") return true;
  if (
    req.user?.role === "marketer" ||
    req.user?.role === "sales" ||
    req.user?.role === "staff" ||
    req.user?.role === "manager" ||
    req.user?.role === "finance" ||
    req.user?.role === "finance_manager" ||
    req.user?.role === "developer" ||
    req.user?.role === "project_manager"
  ) {
    const myEmployeeId = await getMyEmployeeId(req);
    if (!myEmployeeId) {
      res.status(403).json({ error: "Access denied" });
      return false;
    }
    if (String(lead.ownerId || "") !== myEmployeeId) {
      res.status(403).json({ error: "Access denied" });
      return false;
    }
    return true;
  }
  res.status(403).json({ error: "Access denied" });
  return false;
};

// Helper: notify admins when a lead is marked as Won and needs approval
const notifyAdminsWonLead = async (lead, requestedByUserId) => {
  try {
    const admins = await User.find({ role: "admin" }).select("_id").lean();
    const messages = admins.map(admin => ({
      userId: admin._id,
      title: "Lead Approval Required",
      message: `Lead "${lead.name}" (${lead.company || "No Company"}) has been marked as Won and requires your approval to convert to a sale.`,
      type: "lead_approval",
      href: `/admin/lead-approvals`,
      meta: { leadId: lead._id, leadName: lead.name },
      createdAt: new Date(),
    }));
    if (messages.length) await Notification.insertMany(messages);
  } catch (e) {
    // ignore notification errors
  }
};

function toStr(v) {
  return v === undefined || v === null ? "" : v.toString();
}

function cleanPayload(body) {
  const p = {};
  if (body?.name !== undefined) p.name = toStr(body.name).trim();
  if (body?.company !== undefined) p.company = toStr(body.company);
  if (body?.email !== undefined) p.email = toStr(body.email);
  if (body?.phone !== undefined) p.phone = toStr(body.phone);
  if (body?.expectedPrice !== undefined) p.expectedPrice = toStr(body.expectedPrice);
  if (body?.systemNeeded !== undefined) p.systemNeeded = toStr(body.systemNeeded);
  if (body?.type !== undefined) p.type = toStr(body.type) || "Organization";
  if (body?.ownerId !== undefined) p.ownerId = body.ownerId || undefined;
  if (body?.status !== undefined) p.status = toStr(body.status) || "New";
  if (body?.source !== undefined) p.source = toStr(body.source);
  if (body?.value !== undefined) p.value = toStr(body.value) || "-";
  if (body?.lastContact !== undefined) p.lastContact = body.lastContact ? new Date(body.lastContact) : undefined;
  if (body?.address !== undefined) p.address = toStr(body.address);
  if (body?.city !== undefined) p.city = toStr(body.city);
  if (body?.state !== undefined) p.state = toStr(body.state);
  if (body?.zip !== undefined) p.zip = toStr(body.zip);
  if (body?.country !== undefined) p.country = toStr(body.country);
  if (body?.website !== undefined) p.website = toStr(body.website);
  if (body?.vatNumber !== undefined) p.vatNumber = toStr(body.vatNumber);
  if (body?.gstNumber !== undefined) p.gstNumber = toStr(body.gstNumber);
  if (body?.currency !== undefined) p.currency = toStr(body.currency);
  if (body?.currencySymbol !== undefined) p.currencySymbol = toStr(body.currencySymbol);
  if (body?.labels !== undefined) p.labels = Array.isArray(body.labels) ? body.labels : [];
  if (body?.reminderDate !== undefined) p.reminderDate = body.reminderDate ? new Date(body.reminderDate) : undefined;
  if (body?.reminderSent !== undefined) p.reminderSent = Boolean(body.reminderSent);
  if (body?.conversationNotes !== undefined) p.conversationNotes = toStr(body.conversationNotes);
  if (body?.createdByUserId !== undefined) p.createdByUserId = body.createdByUserId;
  return p;
}

// Check for duplicate leads by email or phone
router.post("/check-duplicate", async (req, res) => {
  try {
    const { email, phone } = req.body || {};
    if (!email && !phone) return res.json({ exists: false });

    const conditions = [];
    if (email) conditions.push({ email: String(email).trim().toLowerCase() });
    if (phone) conditions.push({ phone: String(phone).trim() });

    if (conditions.length === 0) return res.json({ exists: false });

    const existing = await Lead.findOne({ $or: conditions }).select("name email phone status").lean();
    if (existing) {
      return res.json({
        exists: true,
        lead: {
          name: existing.name,
          email: existing.email,
          phone: existing.phone,
          status: existing.status
        }
      });
    }
    res.json({ exists: false });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/", requirePermission("leads.read"), async (req, res) => {
  try {
    const q = req.query.q?.toString().trim();
    const ownerId = req.query.ownerId?.toString();
    const status = req.query.status?.toString();
    const source = req.query.source?.toString();
    const labelId = req.query.labelId?.toString();
    const createdFrom = req.query.createdFrom?.toString();
    const createdTo = req.query.createdTo?.toString();
    const lastContactFrom = req.query.lastContactFrom?.toString();
    const lastContactTo = req.query.lastContactTo?.toString();
    const sortBy = String(req.query.sort || "").trim();

    const parseDateBound = (raw, endOfDay) => {
      const s = String(raw || "").trim();
      if (!s) return null;
      const d = new Date(s);
      if (Number.isNaN(d.getTime())) return null;

      // If the input looks like a date-only string (YYYY-MM-DD), normalize time bounds
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        if (endOfDay) d.setHours(23, 59, 59, 999);
        else d.setHours(0, 0, 0, 0);
      }
      return d;
    };

    const filter = {};
    if (req.user.role === "admin" || req.user.role === "sales_manager") {
      if (ownerId) filter.ownerId = ownerId;
    } else if (req.user.role === "marketing_manager" || req.user.role === "marketing manager") {
      // Marketing Managers see all leads by default
      if (ownerId) filter.ownerId = ownerId;
    } else if (
      req.user.role === "marketer" ||
      req.user.role === "sales" ||
      req.user.role === "staff" ||
      req.user.role === "manager" ||
      req.user.role === "finance" ||
      req.user.role === "finance_manager" ||
      req.user.role === "developer" ||
      req.user.role === "project_manager" ||
      req.user.role === "team_member"
    ) {
      const myEmployeeId = await getMyEmployeeId(req);
      const orConditions = [{ createdByUserId: req.user._id }];
      if (myEmployeeId) {
        orConditions.push({ ownerId: myEmployeeId });
      }
      
      filter.$and = filter.$and || [];
      filter.$and.push({ $or: orConditions });

      // If filtering by owner specifically, ensure we only show those that match the search AND are accessible
      if (ownerId) {
        filter.ownerId = ownerId;
      }
    } else {
      return res.status(403).json({ error: "Access denied" });
    }
    if (status) filter.status = status;
    if (source) filter.source = source;
    if (labelId) filter.labels = labelId;
    if (createdFrom || createdTo) {
      filter.createdAt = {};
      const fromD = parseDateBound(createdFrom, false);
      const toD = parseDateBound(createdTo, true);
      if (fromD) filter.createdAt.$gte = fromD;
      if (toD) filter.createdAt.$lte = toD;
    }

    if (lastContactFrom || lastContactTo) {
      const fromD = parseDateBound(lastContactFrom, false);
      const toD = parseDateBound(lastContactTo, true);
      // Include leads where lastContact is within range OR lastContact is not set (new leads)
      filter.$or = filter.$or || [];
      const lastContactFilter = {};
      if (fromD) lastContactFilter.$gte = fromD;
      if (toD) lastContactFilter.$lte = toD;
      filter.$or.push(
        { lastContact: lastContactFilter },
        { lastContact: { $exists: false } },
        { lastContact: null }
      );
    }
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { company: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
        { phone: { $regex: q, $options: "i" } },
      ];
    }

    const sort =
      sortBy === "lastContact"
        ? { lastContact: -1, createdAt: -1 }
        : sortBy === "updatedAt"
          ? { updatedAt: -1, createdAt: -1 }
          : { createdAt: -1 };

    const items = await Lead.find(filter).sort(sort).lean();
    res.json(items);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/", requirePermission("leads.create"), async (req, res) => {
  try {
    const payload = cleanPayload(req.body);
    if (!payload.name) return res.status(400).json({ error: "name is required" });
    if (req.user.role === "marketer" || req.user.role === "marketing_manager" || req.user.role === "marketing manager" || req.user.role === "sales" || req.user.role === "staff" || req.user.role === "developer" || req.user.role === "project_manager" || req.user.role === "finance" || req.user.role === "finance_manager") {
      const myEmployeeId = await getMyEmployeeId(req);
      payload.createdByUserId = req.user._id;
      if (myEmployeeId) {
        payload.ownerId = myEmployeeId;
      }
      // Log for debugging
      console.log(`[Lead Create] User: ${req.user._id}, Role: ${req.user.role}, OwnerId: ${payload.ownerId}, CreatedByUserId: ${payload.createdByUserId}`);
    }
    if (!payload.initials && payload.name) {
      payload.initials = payload.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
    }
    const doc = await Lead.create(payload);
    try {
      broadcastSse({ event: "invalidate", data: { keys: ["leads"], id: String(doc?._id || "") } });
    } catch {}
    res.status(201).json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Approve a lead (admin only): converts to a Client, creates Order/Sale, Invoice, and accounting entries
router.post("/:id/approve", authenticate, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Access denied" });
    }
    const lead = await Lead.findById(req.params.id).lean();
    if (!lead) return res.status(404).json({ error: "Not found" });

    // Check if already approved
    if (lead.approvalStatus === "approved") {
      return res.status(400).json({ error: "Lead already approved" });
    }

    const amount = Number(lead.expectedPrice?.replace(/[^0-9.]/g, "")) || 0;
    const commissionRate = 0.05; // 5%
    const commissionAmount = Math.round(amount * commissionRate * 100) / 100;
    const currentPeriod = new Date().toISOString().slice(0, 7); // YYYY-MM

    // Create client from lead
    const isPerson = String(lead.type || "").toLowerCase() === "person";
    const clientPayload = {
      type: isPerson ? "person" : "org",
      company: isPerson ? "" : (lead.company || lead.name || ""),
      person: isPerson ? (lead.name || "") : "",
      address: lead.address || "",
      city: lead.city || "",
      state: lead.state || "",
      zip: lead.zip || "",
      country: lead.country || "",
      phone: lead.phone || "",
      website: lead.website || "",
      vatNumber: lead.vatNumber || "",
      gstNumber: lead.gstNumber || "",
      currency: lead.currency || "",
      currencySymbol: lead.currencySymbol || "",
      labels: Array.isArray(lead.labels) ? lead.labels.map(String) : [],
      createdBy: "lead-approve",
      status: "active",
      email: lead.email || "",
    };
    const client = await Client.create(clientPayload);

    // Create order/sale from lead
    const orderCount = await Order.countDocuments();
    const orderPayload = {
      number: `ORDER #${orderCount + 1}`,
      clientId: client._id,
      client: lead.company || lead.name || "",
      items: [{
        name: lead.systemNeeded || "Service",
        description: `Converted from lead: ${lead.name}`,
        quantity: 1,
        unit: "unit",
        rate: amount,
        total: amount,
      }],
      amount: amount,
      status: "completed",
      orderDate: new Date(),
      note: `Auto-generated from approved lead: ${lead.name}`,
    };
    const order = await Order.create(orderPayload);

    // Create invoice for accounting impact (DR AR, CR Revenue)
    let invoice = null;
    let journalEntry = null;
    if (amount > 0) {
      try {
        const invoiceCount = await Invoice.countDocuments();
        const invoicePayload = {
          number: `INV-LEAD-${invoiceCount + 1}`,
          clientId: client._id,
          client: lead.company || lead.name || "",
          amount: amount,
          issueDate: new Date(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          status: "Unpaid",
          items: [{
            description: lead.systemNeeded || "Service",
            quantity: 1,
            rate: amount,
            amount: amount,
          }],
          note: `Auto-generated invoice from approved lead: ${lead.name}`,
          labels: "lead-conversion",
        };
        invoice = await Invoice.create(invoicePayload);

        // Create accounting journal entry: DR AR-[Client], CR Revenue
        const settings = await getSettings();
        const clientAcc = await ensureLinkedAccount("client", client._id, clientPayload.company || clientPayload.person || "Client");
        journalEntry = await postJournal({
          date: new Date(),
          memo: `Lead approval: ${lead.name} - Invoice ${invoice.number}`,
          refNo: invoice.number,
          lines: [
            { accountCode: clientAcc.code, debit: amount, credit: 0, entityType: "client", entityId: client._id },
            { accountCode: settings.revenueAccount, debit: 0, credit: amount },
          ],
          postedBy: "system",
        });
      } catch (accountingError) {
        // Log but don't fail the approval if accounting fails
        console.error("Accounting entry failed for lead approval:", accountingError);
      }
    }

    // Update lead with approval status and references
    await Lead.findByIdAndUpdate(lead._id, {
      $set: {
        status: "Won",
        approvalStatus: "approved",
        approvedAt: new Date(),
        approvedBy: req.user._id,
        clientId: client._id,
        orderId: order._id,
        invoiceId: invoice?._id || null,
      }
    });

    const commissionEntry = null;
    let commission = null;
    
    // Create commission for lead owner (if has owner) - always create even if 0 amount for record keeping
    if (lead.ownerId) {
      try {
        // Get employee details
        const employee = await Employee.findById(lead.ownerId).lean();
        const employeeName = employee ? (employee.name || `${employee.firstName || ""} ${employee.lastName || ""}`.trim()) : "Unknown";
        
        // Create commission record (even with 0 amount for record keeping)
        commission = await Commission.create({
          leadId: lead._id,
          leadName: lead.name,
          employeeId: lead.ownerId,
          employeeName: employeeName,
          clientId: client._id,
          orderId: order._id,
          invoiceId: invoice?._id || null,
          saleAmount: amount,
          commissionRate: commissionRate,
          commissionAmount: commissionAmount,
          status: commissionAmount > 0 ? "approved" : "cancelled",
          approvedAt: commissionAmount > 0 ? new Date() : null,
          period: currentPeriod,
          notes: commissionAmount > 0 
            ? `5% commission on lead conversion: ${lead.name}`
            : `No commission - sale amount was 0 for lead: ${lead.name}`,
        });
        
        // Only create accounting entry if commission amount > 0
        if (commissionAmount > 0) {
          // Create accounting entry for commission: DR Commission Expense, CR Commission Payable
          const settings = await getSettings();
          commissionEntry = await postJournal({
            date: new Date(),
            memo: `Commission: ${employeeName} - Lead ${lead.name}`,
            refNo: order.number,
            lines: [
              { accountCode: settings.commissionExpense, debit: commissionAmount, credit: 0 },
              { accountCode: settings.commissionPayable, debit: 0, credit: commissionAmount },
            ],
            postedBy: "system",
          });
          
          // Update commission with journal entry reference
          if (commissionEntry) {
            await Commission.findByIdAndUpdate(commission._id, { 
              journalEntryId: commissionEntry._id 
            });
          }
          
          // Notify employee about commission
          try {
            await Notification.create({
              userId: lead.approvalRequestedBy,
              title: "Commission Earned",
              message: `You earned ${commissionRate * 100}% commission (${commissionAmount.toLocaleString()}) on lead "${lead.name}" conversion.`,
              type: "commission_earned",
              href: `/hrm/dashboard`,
              meta: { 
                leadId: lead._id, 
                commissionId: commission._id, 
                amount: commissionAmount,
                period: currentPeriod
              },
            });
          } catch {}
        }
      } catch (commissionError) {
        console.error("Commission creation failed:", commissionError);
        // Don't fail the approval if commission fails
      }
    }
    if (lead.approvalRequestedBy) {
      try {
        await Notification.create({
          userId: lead.approvalRequestedBy,
          title: "Lead Approved",
          message: `Lead "${lead.name}" has been approved and converted to a sale (Order: ${order.number}${invoice ? `, Invoice: ${invoice.number}` : ""}).`,
          type: "lead_approved",
          href: `/crm/leads/${lead._id}`,
          meta: { leadId: lead._id, orderId: order._id, clientId: client._id, invoiceId: invoice?._id },
        });
      } catch {
        // ignore notification errors
      }
    }

    try {
      broadcastSse({ event: "invalidate", data: { keys: ["leads", "clients", "orders", "invoices", "accounting", "commissions"], id: String(lead?._id || "") } });
    } catch {}

    res.json({ 
      ok: true, 
      clientId: client._id, 
      orderId: order._id, 
      invoiceId: invoice?._id || null,
      journalEntryId: journalEntry?._id || null,
      commissionId: commission?._id || null,
      commissionAmount: commissionAmount > 0 ? commissionAmount : 0,
      message: `Lead approved and converted to sale successfully. Accounting entries created.${commission ? ` Commission (${commissionAmount.toLocaleString()}) recorded for owner.` : ""}` 
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/bulk", authenticate, async (req, res) => {
  try {
    if (req.user.role !== "admin" && req.user.role !== "marketer" && req.user.role !== "marketing_manager" && req.user.role !== "marketing manager") {
      return res.status(403).json({ error: "Access denied" });
    }
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (!items.length) return res.status(400).json({ error: "No items provided" });
    const cleaned = items
      .map((x) => cleanPayload(x))
      .filter((x) => x.name);
    if (req.user.role === "marketer" || req.user.role === "marketing_manager" || req.user.role === "marketing manager") {
      const myEmployeeId = await getMyEmployeeId(req);
      if (!myEmployeeId) return res.status(403).json({ error: "Access denied" });
      for (const c of cleaned) c.ownerId = myEmployeeId;
    }
    const inserted = await Lead.insertMany(cleaned, { ordered: false });
    try {
      broadcastSse({ event: "invalidate", data: { keys: ["leads"] } });
    } catch {}
    res.status(201).json({ ok: true, inserted: inserted.length });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Get leads pending approval (admin only)
router.get("/pending-approvals", authenticate, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Access denied" });
    }
    const leads = await Lead.find({
      status: "Won",
      $or: [
        { approvalStatus: "pending" },
        { approvalStatus: null },
        { approvalStatus: { $exists: false } }
      ]
    }).sort({ approvalRequestedAt: -1 }).lean();
    res.json(leads);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get("/:id", requirePermission('leads.read'), async (req, res) => {
  try {
    const doc = await Lead.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ error: "Not found" });
    if (!(await ensureLeadAccess(req, res, doc))) return;
    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put("/:id", requirePermission('leads.update'), async (req, res) => {
  try {
    const payload = cleanPayload(req.body);
    const existing = await Lead.findById(req.params.id).lean();
    if (!existing) return res.status(404).json({ error: "Not found" });
    if (!(await ensureLeadAccess(req, res, existing))) return;
    if (req.user.role === "marketer") {
      delete payload.ownerId;
    }

    // PREVENT EDITING of already approved leads (maintains data integrity)
    const isAlreadyApproved = existing.approvalStatus === "approved" || 
                              existing.clientId || 
                              existing.orderId;
    
    // NO ONE can change expectedPrice on approved leads (would break commission/sales data)
    if (isAlreadyApproved && payload.expectedPrice !== undefined) {
      return res.status(400).json({ 
        error: "Cannot change lead amount after approval", 
        message: "This lead has been converted to a sale. The amount cannot be modified to maintain data integrity."
      });
    }
    
    // Non-admins: Completely blocked from editing approved leads
    if (isAlreadyApproved && req.user.role !== "admin") {
      return res.status(400).json({ 
        error: "Cannot edit lead that has been converted to a sale", 
        message: "This lead has been approved and converted. Contact admin for modifications."
      });
    }
    
    // Admins: Can edit but critical fields (except amount already blocked above) are protected
    if (isAlreadyApproved && req.user.role === "admin") {
      delete payload.ownerId;        // Would break commission ownership
      delete payload.systemNeeded;   // Would break order items
    }

    // Handle Won status workflow - requires admin approval
    const isChangingToWon = payload.status === "Won" && existing.status !== "Won";
    
    if (isChangingToWon && !isAlreadyApproved) {
      // Set to pending approval instead of directly Won
      payload.status = "Won";
      payload.approvalStatus = "pending";
      payload.approvalRequestedAt = new Date();
      payload.approvalRequestedBy = req.user._id;
    }

    // Allow marketers to see their own leads even if status is Won (pending approval)
    if (existing.status === "Won" && existing.approvalStatus === "pending" && !isAlreadyApproved) {
      // Logic for status transition remains the same
    }

    const doc = await Lead.findByIdAndUpdate(req.params.id, payload, { new: true }).lean();
    if (!doc) return res.status(404).json({ error: "Not found" });

    // Send notifications to admins if status changed to Won (pending approval)
    if (isChangingToWon && !isAlreadyApproved) {
      await notifyAdminsWonLead(doc, req.user._id);
    }

    try {
      broadcastSse({ event: "invalidate", data: { keys: ["leads"], id: String(doc?._id || "") } });
    } catch {}
    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete("/:id", authenticate, async (req, res) => {
  try {
    const existing = await Lead.findById(req.params.id).lean();
    if (!existing) return res.status(404).json({ error: "Not found" });
    
    // PREVENT DELETION of leads that have been converted to sales
    const isConverted = existing.approvalStatus === "approved" || 
                        existing.clientId || 
                        existing.orderId;
    
    if (isConverted) {
      return res.status(400).json({ 
        error: "Cannot delete lead that has been converted to a sale", 
        message: "This lead has been approved and converted. Contact admin to archive instead of delete."
      });
    }
    
    // Check if user is the lead owner - allow delete without explicit permission
    const myEmployeeId = await getMyEmployeeId(req);
    const isOwner = myEmployeeId && String(existing.ownerId) === String(myEmployeeId);
    
    // Allow if: admin, sales_manager, marketing_manager, OR the lead owner
    const hasDeletePermission = req.user.role === "admin" || 
                                req.user.role === "sales_manager" || 
                                req.user.role === "marketing_manager" || 
                                req.user.role === "marketing manager";
    
    if (!hasDeletePermission && !isOwner) {
      return res.status(403).json({ error: "Access denied - you can only delete leads you created" });
    }
    
    const r = await Lead.findByIdAndDelete(req.params.id);
    if (!r) return res.status(404).json({ error: "Not found" });
    try {
      broadcastSse({ event: "invalidate", data: { keys: ["leads"], id: String(req.params.id || "") } });
    } catch {}
    res.json({ ok: true, message: "Lead deleted successfully" });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
