import { Router } from "express";
import { authenticate, isAdmin } from "../middleware/auth.js";
import Leave from "../models/Leave.js";
import Employee from "../models/Employee.js";

const router = Router();

// List
router.get("/", authenticate, async (req, res) => {
  try {
    const q = req.query.q?.toString().trim();
    let filter = q ? { $or: [{ name: { $regex: q, $options: 'i' } }, { type: { $regex: q, $options: 'i' } }] } : {};
    
    // Staff can only see their own leave applications
    if (req.user.role === 'staff') {
      const staffEmployee = await Employee.findOne({ email: req.user.email }).lean();
      if (!staffEmployee) return res.status(404).json({ error: "Employee record not found" });
      filter.employeeId = staffEmployee._id;
      // Ignore search filter for staff
    }
    
    const items = await Leave.find(filter).sort({ createdAt: -1 }).lean();
    res.json(items);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Create (apply)
router.post("/", authenticate, async (req, res) => {
  try {
    // Staff can only apply for leave for themselves
    if (req.user.role === 'staff') {
      const staffEmployee = await Employee.findOne({ email: req.user.email }).lean();
      if (!staffEmployee) return res.status(404).json({ error: "Employee record not found" });
      
      // Override employeeId if provided to ensure staff applies for themselves
      req.body.employeeId = staffEmployee._id;
      req.body.name = staffEmployee.name || `${staffEmployee.firstName || ""} ${staffEmployee.lastName || ""}`.trim();
      
      // Prevent staff from approving their own leave
      if (req.body.status && req.body.status !== 'pending') {
        req.body.status = 'pending';
      }
    }
    
    const doc = await Leave.create(req.body);
    res.status(201).json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Approve/Reject/Update
router.put("/:id", authenticate, async (req, res) => {
  try {
    // First get the leave record to check ownership
    const leave = await Leave.findById(req.params.id).lean();
    if (!leave) return res.status(404).json({ error: 'Not found' });
    
    // Staff can only update their own leave applications (basic info only, not approval status)
    if (req.user.role === 'staff') {
      const staffEmployee = await Employee.findOne({ email: req.user.email }).lean();
      if (!staffEmployee) return res.status(404).json({ error: "Employee record not found" });
      if (String(leave.employeeId) !== String(staffEmployee._id)) {
        return res.status(403).json({ error: "Can only update your own leave applications" });
      }
      
      // Prevent staff from changing approval status
      if (req.body.status && req.body.status !== leave.status) {
        delete req.body.status;
      }
    }
    
    const doc = await Leave.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Delete
router.delete("/:id", authenticate, async (req, res) => {
  try {
    // First get the leave record to check ownership
    const leave = await Leave.findById(req.params.id).lean();
    if (!leave) return res.status(404).json({ error: 'Not found' });
    
    // Staff can only delete their own pending leave applications
    if (req.user.role === 'staff') {
      const staffEmployee = await Employee.findOne({ email: req.user.email }).lean();
      if (!staffEmployee) return res.status(404).json({ error: "Employee record not found" });
      if (String(leave.employeeId) !== String(staffEmployee._id)) {
        return res.status(403).json({ error: "Can only delete your own leave applications" });
      }
      if (leave.status !== 'pending') {
        return res.status(403).json({ error: "Can only delete pending leave applications" });
      }
    }
    
    const r = await Leave.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
