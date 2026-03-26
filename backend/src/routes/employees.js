import { Router } from "express";
import { authenticate, isAdmin } from "../middleware/auth.js";
import { ensureLinkedAccount } from "../services/accounting.js";
import Employee from "../models/Employee.js";
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";

const router = Router();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_ROOT = path.resolve(__dirname, "..", "..");
const uploadDir = path.join(SERVER_ROOT, "uploads");
const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname || "").toLowerCase();
    cb(null, `emp_${req.params.id || Date.now()}_${Date.now()}${ext}`);
  },
});
const upload = multer({ storage });

const escapeRegExp = (s) => String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const resolveUserRoleFromEmployee = (employee) => {
  const r = String(employee?.role || "").trim().toLowerCase();
  const dept = String(employee?.department || "").trim().toLowerCase();
  if (r === "project_manager" || r === "project manager") return "project_manager";
  if (r === "sales_manager") return "sales_manager";
  if (r === "finance_manager") return "finance_manager";
  if (r === "marketing_manager") return "marketing_manager";
  if (r === "developer") return "developer";
  if (r === "sales") return "sales";
  if (r === "finance") return "finance";
  if (r === "marketer") return "marketer";
  if (r === "team_member") return "team_member";
  if (r === "staff") return "staff";
  if (dept === "marketing") return "marketer";
  if (dept === "development" || dept === "engineering") return "developer";
  return "staff";
};

// List with simple search
router.get("/", authenticate, async (req, res) => {
  const userRole = String(req.user.role || "").toLowerCase();
  const userEmail = req.user.email;
  
  // Admin, finance_manager, and project_manager can see all employees
  if (userRole === 'admin' || userRole === 'finance_manager' || userRole === 'project_manager') {
    const q = req.query.q?.toString().trim();
    const role = req.query.role?.toString().trim();
    const filter = q
      ? {
          $or: [
            { name: { $regex: q, $options: "i" } },
            { email: { $regex: q, $options: "i" } },
            { phone: { $regex: q, $options: "i" } },
            { department: { $regex: q, $options: "i" } },
            { role: { $regex: q, $options: "i" } },
          ],
        }
      : {};
    if (role) {
      filter.role = { $regex: `^${escapeRegExp(role)}$`, $options: "i" };
    }
    const items = await Employee.find(filter).sort({ createdAt: -1 }).lean();
    return res.json(items);
  }
  
  // Get current user's employee record for non-admin users
  const currentEmployee = await Employee.findOne({ email: userEmail }).lean();
  
  // Non-admin users without employee record can only see themselves (empty list)
  if (!currentEmployee) {
    return res.json([]);
  }
  
  // Marketing manager can only see marketers
  if (userRole === 'marketing_manager') {
    const q = req.query.q?.toString().trim();
    const filter = { 
      $or: [
        { role: { $regex: 'marketer', $options: "i" } },
        { department: { $regex: 'marketing', $options: "i" } }
      ]
    };
    if (q) {
      filter.$and = [
        { $or: [
          { role: { $regex: 'marketer', $options: "i" } },
          { department: { $regex: 'marketing', $options: "i" } }
        ]},
        { $or: [
          { name: { $regex: q, $options: "i" } },
          { email: { $regex: q, $options: "i" } },
          { phone: { $regex: q, $options: "i" } },
        ]}
      ];
      delete filter.$or;
    }
    const items = await Employee.find(filter).sort({ createdAt: -1 }).lean();
    return res.json(items);
  }
  
  // Sales manager can only see sales people
  if (userRole === 'sales_manager') {
    const q = req.query.q?.toString().trim();
    const filter = { 
      role: { $regex: '^sales$', $options: "i" }
    };
    if (q) {
      filter.$and = [
        { role: { $regex: '^sales$', $options: "i" } },
        { $or: [
          { name: { $regex: q, $options: "i" } },
          { email: { $regex: q, $options: "i" } },
          { phone: { $regex: q, $options: "i" } },
        ]}
      ];
      delete filter.role;
    }
    const items = await Employee.find(filter).sort({ createdAt: -1 }).lean();
    return res.json(items);
  }
  
  // Project manager can only see developers
  if (userRole === 'project_manager') {
    const q = req.query.q?.toString().trim();
    const filter = { 
      $or: [
        { role: { $regex: 'developer', $options: "i" } },
        { department: { $regex: 'development|engineering', $options: "i" } }
      ]
    };
    if (q) {
      filter.$and = [
        { $or: [
          { role: { $regex: 'developer', $options: "i" } },
          { department: { $regex: 'development|engineering', $options: "i" } }
        ]},
        { $or: [
          { name: { $regex: q, $options: "i" } },
          { email: { $regex: q, $options: "i" } },
          { phone: { $regex: q, $options: "i" } },
        ]}
      ];
      delete filter.$or;
    }
    const items = await Employee.find(filter).sort({ createdAt: -1 }).lean();
    return res.json(items);
  }
  
  // All other roles (staff, finance, marketer, sales, developer) can only see themselves
  return res.json([currentEmployee]);
});

// Create (admin only)
router.post("/", authenticate, isAdmin, async (req, res) => {
  try {
    const doc = await Employee.create(req.body);
    try {
      await ensureLinkedAccount("employee", doc._id, doc.name || doc.email || "Employee");
    } catch (err) {
      console.error("Account auto-creation failed for employee:", err.message);
    }
    // Ensure staff User exists for login purposes
    try {
      const email = String(doc?.email || "").toLowerCase().trim();
      const userRole = resolveUserRoleFromEmployee(doc);
      const employeePassword = String(req.body?.password || "").trim();
      const shouldSetUserPasswordHash =
        userRole === "developer" ||
        userRole === "project_manager" ||
        userRole === "sales" ||
        userRole === "sales_manager" ||
        userRole === "finance" ||
        userRole === "finance_manager";

      if (email) {
        const existingUser = await User.findOne({ email }).select("_id passwordHash").lean();

        if (!existingUser?._id) {
          const createDoc = {
            email,
            username: email,
            status: doc.status === "active" ? "active" : "inactive",
            createdBy: "employee-create",
            name: doc.name || "",
            avatar: doc.avatar || "",
            role: userRole,
          };
          if (employeePassword && shouldSetUserPasswordHash) {
            createDoc.passwordHash = await bcrypt.hash(employeePassword, 10);
          }
          await User.create(createDoc);
        } else {
          const update = {
            name: doc.name || "",
            avatar: doc.avatar || "",
            role: userRole,
            status: doc.status === "active" ? "active" : "inactive",
          };
          if (employeePassword && shouldSetUserPasswordHash && !String(existingUser.passwordHash || "").trim()) {
            update.passwordHash = await bcrypt.hash(employeePassword, 10);
          }
          await User.findByIdAndUpdate(existingUser._id, { $set: update }, { new: true }).lean();
        }
      }
    } catch (_) {}
    res.status(201).json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Bulk insert (admin only)
router.post("/bulk", authenticate, isAdmin, async (req, res) => {
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (!items.length) return res.status(400).json({ error: "No items provided" });
    const inserted = await Employee.insertMany(items, { ordered: false });
    res.status(201).json({ ok: true, inserted: inserted.length });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Send invitations (admin only)
router.post("/invite", authenticate, isAdmin, async (req, res) => {
  try {
    const emails = Array.isArray(req.body?.emails) ? req.body.emails : [];
    res.json({ ok: true, count: emails.length });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Get by id
router.get("/:id", authenticate, async (req, res) => {
  try {
    const userRole = String(req.user.role || "").toLowerCase();
    const userEmail = req.user.email;
    
    // Get current user's employee record
    const currentEmployee = await Employee.findOne({ email: userEmail }).lean();
    
    // Admin and finance_manager can see any profile
    if (userRole === 'admin' || userRole === 'finance_manager') {
      const doc = await Employee.findById(req.params.id).lean();
      if (!doc) return res.status(404).json({ error: "Not found" });
      return res.json(doc);
    }
    
    // Marketing manager can only see marketers
    if (userRole === 'marketing_manager') {
      const doc = await Employee.findById(req.params.id).lean();
      if (!doc) return res.status(404).json({ error: "Not found" });
      const empRole = String(doc.role || "").toLowerCase();
      const empDept = String(doc.department || "").toLowerCase();
      if (empRole !== 'marketer' && empDept !== 'marketing') {
        return res.status(403).json({ error: "Access denied" });
      }
      return res.json(doc);
    }
    
    // Sales manager can only see sales people
    if (userRole === 'sales_manager') {
      const doc = await Employee.findById(req.params.id).lean();
      if (!doc) return res.status(404).json({ error: "Not found" });
      const empRole = String(doc.role || "").toLowerCase();
      if (empRole !== 'sales') {
        return res.status(403).json({ error: "Access denied" });
      }
      return res.json(doc);
    }
    
    // Project manager can only see developers
    if (userRole === 'project_manager') {
      const doc = await Employee.findById(req.params.id).lean();
      if (!doc) return res.status(404).json({ error: "Not found" });
      const empRole = String(doc.role || "").toLowerCase();
      const empDept = String(doc.department || "").toLowerCase();
      if (empRole !== 'developer' && empDept !== 'development' && empDept !== 'engineering') {
        return res.status(403).json({ error: "Access denied" });
      }
      return res.json(doc);
    }
    
    // All other roles (staff, finance, marketer, sales, developer) can only see themselves
    if (!currentEmployee) {
      return res.status(404).json({ error: "Employee record not found" });
    }
    if (String(currentEmployee._id) !== String(req.params.id)) {
      return res.status(403).json({ error: "Can only view your own profile" });
    }
    return res.json(currentEmployee);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Update
router.put("/:id", authenticate, async (req, res) => {
  try {
    const userRole = String(req.user.role || "").toLowerCase();
    const userEmail = req.user.email;
    
    // Get target employee first
    const targetEmployee = await Employee.findById(req.params.id).lean();
    if (!targetEmployee) return res.status(404).json({ error: "Not found" });
    
    // Admin and finance_manager can update any employee without needing their own record
    if (userRole === 'admin' || userRole === 'finance_manager') {
      const doc = await Employee.findByIdAndUpdate(req.params.id, req.body, { new: true });
      // Sync to User record
      try {
        const email = String(doc?.email || "").toLowerCase().trim();
        const employeeRole = resolveUserRoleFromEmployee(doc);
        const employeePassword = String(req.body?.password || "").trim();
        const shouldSetUserPasswordHash =
          employeeRole === "developer" ||
          employeeRole === "project_manager" ||
          employeeRole === "sales" ||
          employeeRole === "sales_manager" ||
          employeeRole === "finance" ||
          employeeRole === "finance_manager";

        if (email) {
          const existingUser = await User.findOne({ email }).select("_id passwordHash").lean();

          if (!existingUser?._id) {
            const createDoc = {
              email,
              username: email,
              status: "active",
              createdBy: "employee-update",
              name: doc.name || "",
              avatar: doc.avatar || "",
              role: employeeRole,
            };
            if (employeePassword && shouldSetUserPasswordHash) {
              createDoc.passwordHash = await bcrypt.hash(employeePassword, 10);
            }
            await User.create(createDoc);
          } else {
            const update = {
              name: doc.name || "",
              avatar: doc.avatar || "",
              email: email,
              username: email,
              role: employeeRole,
              status: doc.status === "active" ? "active" : "inactive",
            };
            if (employeePassword && shouldSetUserPasswordHash && !String(existingUser.passwordHash || "").trim()) {
              update.passwordHash = await bcrypt.hash(employeePassword, 10);
            }
            await User.findByIdAndUpdate(existingUser._id, { $set: update }, { new: true }).lean();
          }
        }
      } catch (_) {}
      try {
        await ensureLinkedAccount("employee", doc._id, doc.name || doc.email || "Employee");
      } catch (_) {}
      return res.json(doc);
    }
    
    // For non-admin users, get current user's employee record
    const currentEmployee = await Employee.findOne({ email: userEmail }).lean();
    if (!currentEmployee) {
      return res.status(404).json({ error: "Employee record not found" });
    }
    
    // Marketing manager can only update marketers
    if (userRole === 'marketing_manager') {
      const targetRole = String(targetEmployee.role || "").toLowerCase();
      const targetDept = String(targetEmployee.department || "").toLowerCase();
      if (targetRole !== 'marketer' && targetDept !== 'marketing') {
        return res.status(403).json({ error: "Can only update marketers" });
      }
      const doc = await Employee.findByIdAndUpdate(req.params.id, req.body, { new: true });
      return res.json(doc);
    }
    
    // Sales manager can only update sales people
    if (userRole === 'sales_manager') {
      const targetRole = String(targetEmployee.role || "").toLowerCase();
      if (targetRole !== 'sales') {
        return res.status(403).json({ error: "Can only update sales people" });
      }
      const doc = await Employee.findByIdAndUpdate(req.params.id, req.body, { new: true });
      return res.json(doc);
    }
    
    // Project manager can only update developers
    if (userRole === 'project_manager') {
      const targetRole = String(targetEmployee.role || "").toLowerCase();
      const targetDept = String(targetEmployee.department || "").toLowerCase();
      if (targetRole !== 'developer' && targetDept !== 'development' && targetDept !== 'engineering') {
        return res.status(403).json({ error: "Can only update developers" });
      }
      const doc = await Employee.findByIdAndUpdate(req.params.id, req.body, { new: true });
      return res.json(doc);
    }
    
    // All other roles (staff, finance, marketer, sales, developer) can only update themselves
    if (String(currentEmployee._id) !== String(req.params.id)) {
      return res.status(403).json({ error: "Can only update your own profile" });
    }
    
    // Self-update with limited fields
    const allowedFields = ['phone', 'address', 'bio', 'avatar'];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }
    
    const doc = await Employee.findByIdAndUpdate(req.params.id, updates, { new: true });
    return res.json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/:id/avatar", authenticate, upload.single("avatar"), async (req, res) => {
  try {
    console.log('Avatar upload request:', {
      params: req.params,
      user: req.user?.email,
      userRole: req.user?.role,
      file: req.file ? 'received' : 'none',
      headers: req.headers['content-type']
    });
    
    const userRole = String(req.user.role || "").toLowerCase();
    const userEmail = req.user.email;
    
    // Get current user's employee record
    const currentEmployee = await Employee.findOne({ email: userEmail }).lean();
    if (!currentEmployee) {
      return res.status(404).json({ error: "Employee record not found" });
    }
    
    // Get target employee
    const targetEmployee = await Employee.findById(req.params.id).lean();
    if (!targetEmployee) return res.status(404).json({ error: "Not found" });
    
    // Admin and finance_manager can update any avatar
    if (userRole === 'admin' || userRole === 'finance_manager') {
      // Allow - no additional checks needed
    }
    // Marketing manager can only update marketers' avatars
    else if (userRole === 'marketing_manager') {
      const targetRole = String(targetEmployee.role || "").toLowerCase();
      const targetDept = String(targetEmployee.department || "").toLowerCase();
      if (targetRole !== 'marketer' && targetDept !== 'marketing') {
        return res.status(403).json({ error: "Can only update marketers' avatars" });
      }
    }
    // Sales manager can only update sales people's avatars
    else if (userRole === 'sales_manager') {
      const targetRole = String(targetEmployee.role || "").toLowerCase();
      if (targetRole !== 'sales') {
        return res.status(403).json({ error: "Can only update sales people's avatars" });
      }
    }
    // Project manager can only update developers' avatars
    else if (userRole === 'project_manager') {
      const targetRole = String(targetEmployee.role || "").toLowerCase();
      const targetDept = String(targetEmployee.department || "").toLowerCase();
      if (targetRole !== 'developer' && targetDept !== 'development' && targetDept !== 'engineering') {
        return res.status(403).json({ error: "Can only update developers' avatars" });
      }
    }
    // All other roles (staff, finance, marketer, sales, developer) can only update their own avatar
    else {
      if (String(currentEmployee._id) !== String(req.params.id)) {
        return res.status(403).json({ error: "Can only update your own avatar" });
      }
    }
    
    if (!req.file) {
      console.log('Avatar upload failed: No file received');
      return res.status(400).json({ error: "No file uploaded" });
    }
    const avatarPath = `/uploads/${req.file.filename}`;
    const doc = await Employee.findByIdAndUpdate(
      req.params.id,
      { avatar: avatarPath },
      { new: true }
    );
    if (!doc) return res.status(404).json({ error: "Not found" });
    
    // Sync avatar to User record
    try {
      const email = String(doc?.email || "").toLowerCase().trim();
      if (email) {
        await User.updateOne({ email }, { $set: { avatar: avatarPath } });
      }
    } catch (_) {}
    
    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Delete (admin only)
router.delete("/:id", authenticate, isAdmin, async (req, res) => {
  try {
    const r = await Employee.findByIdAndDelete(req.params.id);
    if (!r) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete("/:id/avatar", authenticate, async (req, res) => {
  try {
    const userRole = String(req.user.role || "").toLowerCase();
    const userEmail = req.user.email;
    
    // Get current user's employee record
    const currentEmployee = await Employee.findOne({ email: userEmail }).lean();
    if (!currentEmployee) {
      return res.status(404).json({ error: "Employee record not found" });
    }
    
    // Get target employee
    const targetEmployee = await Employee.findById(req.params.id).lean();
    if (!targetEmployee) return res.status(404).json({ error: "Employee not found" });
    
    // Admin and finance_manager can delete any avatar
    if (userRole === 'admin' || userRole === 'finance_manager') {
      // Allow - no additional checks needed
    }
    // Marketing manager can only delete marketers' avatars
    else if (userRole === 'marketing_manager') {
      const targetRole = String(targetEmployee.role || "").toLowerCase();
      const targetDept = String(targetEmployee.department || "").toLowerCase();
      if (targetRole !== 'marketer' && targetDept !== 'marketing') {
        return res.status(403).json({ error: "Can only delete marketers' avatars" });
      }
    }
    // Sales manager can only delete sales people's avatars
    else if (userRole === 'sales_manager') {
      const targetRole = String(targetEmployee.role || "").toLowerCase();
      if (targetRole !== 'sales') {
        return res.status(403).json({ error: "Can only delete sales people's avatars" });
      }
    }
    // Project manager can only delete developers' avatars
    else if (userRole === 'project_manager') {
      const targetRole = String(targetEmployee.role || "").toLowerCase();
      const targetDept = String(targetEmployee.department || "").toLowerCase();
      if (targetRole !== 'developer' && targetDept !== 'development' && targetDept !== 'engineering') {
        return res.status(403).json({ error: "Can only delete developers' avatars" });
      }
    }
    // All other roles (staff, finance, marketer, sales, developer) can only delete their own avatar
    else {
      if (String(currentEmployee._id) !== String(req.params.id)) {
        return res.status(403).json({ error: "Can only delete your own avatar" });
      }
    }
    
    // Remove avatar file if it exists
    if (targetEmployee.avatar && targetEmployee.avatar.startsWith("/uploads/")) {
      const fs = require("fs");
      const path = require("path");
      const filePath = path.join(__dirname, "../../..", targetEmployee.avatar);
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (err) {
        console.error("Failed to delete avatar file:", err);
      }
    }
    
    // Update employee record to remove avatar
    await Employee.findByIdAndUpdate(req.params.id, { avatar: "" });
    res.json({ message: "Avatar removed successfully" });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
