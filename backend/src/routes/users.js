import { Router } from "express";
import User from "../models/User.js";
import Employee from "../models/Employee.js";
import Client from "../models/Client.js";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import Notification from "../models/Notification.js";
import { authenticate, isAdmin } from "../middleware/auth.js";
import bcrypt from "bcryptjs";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const router = Router();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_ROOT = path.resolve(__dirname, "..", "..");
const uploadDir = path.join(SERVER_ROOT, "uploads");
function normalizeAvatar(v) {
  const raw = String(v || "").trim();
  if (!raw) return "";
  if (raw.startsWith("<")) return ""; // invalid placeholder
  // Already relative and points to uploads
  if (raw.startsWith("/uploads/")) return raw;
  try {
    const u = new URL(raw);
    // If URL path contains /uploads/<file>, return relative path
    if (u.pathname && /\/uploads\//.test(u.pathname)) {
      const idx = u.pathname.indexOf("/uploads/");
      return u.pathname.substring(idx);
    }
  } catch {
    // not a full URL
  }
  return raw;
}

function resolveUserRoleFromEmployee(employee) {
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
  if (r === "staff") return "staff";
  if (dept === "marketing") return "marketer";
  if (dept === "development" || dept === "engineering") return "developer";
  return "staff";
}

const avatarStorage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname || "").toLowerCase();
    cb(null, `avatar_user_${String(req.user?._id || "user")}_${Date.now()}${ext}`);
  },
});
const uploadAvatar = multer({ storage: avatarStorage });

router.get("/me", authenticate, async (req, res) => {
  try {
    const user = typeof req.user?.toObject === "function" ? req.user.toObject() : req.user;
    const role = String(user?.role || "").toLowerCase();

    let client = null;
    let employee = null;

    if (role === "client" && user?.clientId) {
      client = await Client.findById(user.clientId).lean();
    }

    if (
      role === "staff" ||
      role === "marketer" ||
      role === "marketing_manager" ||
      role === "developer" ||
      role === "project_manager" ||
      role === "sales" ||
      role === "sales_manager" ||
      role === "finance" ||
      role === "finance_manager"
    ) {
      const email = String(user?.email || "").toLowerCase().trim();
      if (email) employee = await Employee.findOne({ email }).lean();
    }

    const displayName =
      String(user?.name || "").trim() ||
      (client ? String(client.company || client.person || "").trim() : "") ||
      (employee ? String(employee.name || "").trim() : "") ||
      String(user?.email || "").trim();

    const avatar = normalizeAvatar(
      String(user?.avatar || "").trim() ||
        (client ? String(client.avatar || "").trim() : "") ||
        (employee ? String(employee.avatar || "").trim() : "")
    );

    res.json({
      user: {
        _id: user?._id,
        id: user?._id,
        role: user?.role,
        email: user?.email,
        username: user?.username,
        name: displayName,
        avatar,
        clientId: user?.clientId,
        permissions: user?.permissions || [],
      },
      client,
      employee,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put("/me", authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).lean(false);
    if (!user) return res.status(404).json({ error: "User not found" });

    const role = String(user.role || "").toLowerCase();
    const { name, email, username, currentPassword, newPassword } = req.body || {};

    const updateUser = {};
    const emailNext = typeof email === "string" ? email.toLowerCase().trim() : "";
    const emailPrev = String(user.email || "").toLowerCase().trim();

    if (emailNext && emailNext !== emailPrev) {
      const exists = await User.findOne({ email: emailNext, _id: { $ne: user._id } }).lean();
      if (exists) return res.status(409).json({ error: "Email already in use" });
      updateUser.email = emailNext;
      updateUser.username = emailNext;
    }

    // Handle username update (independent of email)
    const usernameNext = typeof username === "string" ? username.toLowerCase().trim() : "";
    if (usernameNext && usernameNext !== String(user.username || "").toLowerCase().trim()) {
      const usernameExists = await User.findOne({ username: usernameNext, _id: { $ne: user._id } }).lean();
      if (usernameExists) return res.status(409).json({ error: "Username already in use" });
      updateUser.username = usernameNext;
    }

    // Password change
    if (newPassword) {
      const np = String(newPassword);
      if (np.length < 4) return res.status(400).json({ error: "Weak password" });

      const cp = String(currentPassword || "");

      if (role === "staff") {
        const emp = emailPrev ? await Employee.findOne({ email: emailPrev }).lean(false) : null;
        if (!emp || emp.disableLogin || emp.markAsInactive) {
          return res.status(403).json({ error: "Employee login is disabled" });
        }
        if (String(emp.password || "") !== cp) {
          return res.status(401).json({ error: "Current password is incorrect" });
        }
        emp.password = np;
        await emp.save();
      } else {
        if (!user.passwordHash) return res.status(400).json({ error: "Password not set" });
        const ok = await bcrypt.compare(cp, user.passwordHash);
        if (!ok) return res.status(401).json({ error: "Current password is incorrect" });
        const hash = await bcrypt.hash(np, 10);
        updateUser.passwordHash = hash;
      }
    }

    if (Object.keys(updateUser).length) {
      Object.assign(user, updateUser);
      await user.save();
    }

    // Sync to role-specific records
    const emailFinal = String(user.email || "").toLowerCase().trim();
    const nameFinal = String(user.name || "").trim();

    if (role === "client" && user.clientId) {
      const client = await Client.findById(user.clientId).lean(false);
      if (client) {
        if (emailFinal && String(client.email || "").toLowerCase().trim() !== emailFinal) client.email = emailFinal;
        if (nameFinal) {
          if (String(client.type || "org") === "person") client.person = nameFinal;
          else client.company = nameFinal;
        }
        await client.save();
      }
    }

    if (role === "staff" || role === "marketer" || role === "marketing_manager" || role === "developer" || role === "project_manager" || role === "sales" || role === "sales_manager" || role === "finance" || role === "finance_manager") {
      const dept =
        role === "marketer"
          ? "marketing"
          : role === "marketing_manager"
            ? "marketing"
            : role === "developer" || role === "project_manager"
              ? "development"
              : role === "sales" || role === "sales_manager"
                ? "sales"
                : role === "finance" || role === "finance_manager"
                  ? "finance"
                  : "";
      // Get existing employee to preserve fields not in User profile
      const existingEmp = await User.findOne({ email: emailPrev || emailFinal }).lean();
      
      // Build update preserving existing fields
      const empUpdate = {
        $setOnInsert: {
          email: emailFinal,
          status: "active",
          disableLogin: false,
          markAsInactive: false,
        },
        $set: {
          name: nameFinal || emailFinal,
          department: dept,
          role: role,
        }
      };
      
      // If email changed, update it in Employee record too
      if (emailPrev && emailFinal && emailPrev !== emailFinal && existingEmp) {
        empUpdate.$set.email = emailFinal;
      }
      
      await User.findOneAndUpdate(
        { email: emailPrev || emailFinal },
        empUpdate,
        { new: true, upsert: true }
      );
    }

    const refreshed = await User.findById(user._id).select("_id name email username role avatar permissions clientId").lean();
    res.json({ user: refreshed });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/me/avatar", authenticate, uploadAvatar.single("avatar"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No avatar uploaded" });
    const rel = `/uploads/${req.file.filename}`;

    const user = await User.findByIdAndUpdate(req.user._id, { $set: { avatar: rel } }, { new: true })
      .select("_id name email role avatar permissions clientId")
      .lean();

    const role = String(user?.role || "").toLowerCase();
    const email = String(user?.email || "").toLowerCase().trim();

    if (role === "client" && user?.clientId) {
      await Client.updateOne({ _id: user.clientId }, { $set: { avatar: rel } }).catch(() => null);
    }

    if (
      (
        role === "staff" ||
        role === "marketer" ||
        role === "marketing_manager" ||
        role === "developer" ||
        role === "project_manager" ||
        role === "sales" ||
        role === "sales_manager" ||
        role === "finance" ||
        role === "finance_manager"
      ) &&
      email
    ) {
      await Employee.updateOne({ email }, { $set: { avatar: rel } }).catch(() => null);
    }

    res.json({ user: { ...user, avatar: normalizeAvatar(rel) }, avatar: normalizeAvatar(rel) });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get("/admin/list", authenticate, isAdmin, async (_req, res) => {
  try {
    const users = await User.find({})
      .sort({ createdAt: -1 })
      .select("name email username role status permissions access clientId createdAt updatedAt")
      .lean();
    res.json(users);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/admin/create", authenticate, isAdmin, async (req, res) => {
  try {
    const {
      name,
      email,
      username,
      password,
      pin,
      role,
      status,
      permissions,
      access,
    } = req.body || {};
    const emailLc = String(email || "").toLowerCase().trim();
    if (!emailLc) return res.status(400).json({ error: "Email is required" });

    const passwordRaw = String(password || "").trim();
    if (!passwordRaw) return res.status(400).json({ error: "Password is required" });
    if (passwordRaw.length < 4) return res.status(400).json({ error: "Weak password" });

    const nextRole = String(role || "staff").trim().toLowerCase();
    const nextStatus = String(status || "active");

    const accessDefaults = (() => {
      const roleStr = String(nextRole).toLowerCase();
      if (roleStr === "admin") {
        return { canView: true, canEdit: true, canDelete: true, dataScope: "all", canSeePrices: true, canSeeFinance: true };
      }
      if (roleStr === "marketer" || roleStr === "marketing_manager") {
        return { canView: true, canEdit: true, canDelete: false, dataScope: "team", canSeePrices: true, canSeeFinance: false };
      }
      return { canView: true, canEdit: false, canDelete: false, dataScope: "assigned", canSeePrices: false, canSeeFinance: false };
    })();

    const nextAccessRaw = access && typeof access === "object" ? access : {};
    const nextAccess = {
      canView: nextAccessRaw.canView !== undefined ? Boolean(nextAccessRaw.canView) : accessDefaults.canView,
      canEdit: nextAccessRaw.canEdit !== undefined ? Boolean(nextAccessRaw.canEdit) : accessDefaults.canEdit,
      canDelete: nextAccessRaw.canDelete !== undefined ? Boolean(nextAccessRaw.canDelete) : accessDefaults.canDelete,
      dataScope: ["assigned", "all", "team"].includes(String(nextAccessRaw.dataScope || ""))
        ? String(nextAccessRaw.dataScope)
        : accessDefaults.dataScope,
      canSeePrices: nextAccessRaw.canSeePrices !== undefined ? Boolean(nextAccessRaw.canSeePrices) : accessDefaults.canSeePrices,
      canSeeFinance: nextAccessRaw.canSeeFinance !== undefined ? Boolean(nextAccessRaw.canSeeFinance) : accessDefaults.canSeeFinance,
    };

    const nextUsername = String(username || "").trim() || emailLc;
    const nextUsernameLc = String(nextUsername).toLowerCase().trim();
    
    // Check if user already exists
    let existingUser = await User.findOne({ email: emailLc }).lean(false);
    if (existingUser) {
      // Update existing user instead of failing
      existingUser.name = String(name || "").trim();
      existingUser.username = nextUsernameLc;
      existingUser.role = nextRole;
      existingUser.status = nextStatus;
      existingUser.permissions = Array.isArray(permissions) ? permissions.map((x) => String(x)) : [];
      existingUser.access = nextAccess;
      
    if (password) {
      const np = String(password);
      if (np.length < 4) return res.status(400).json({ error: "Weak password" });
      existingUser.passwordHash = await bcrypt.hash(np, 10);
    }
    if (pin) {
      const p = String(pin).trim();
      if (!/^\d{4,8}$/.test(p)) return res.status(400).json({ error: "PIN must be 4-8 digits" });
      existingUser.pinHash = await bcrypt.hash(p, 10);
    }
      
      await existingUser.save();
      var created = existingUser;
    } else {
      // Create new user
      const usernameExists = await User.findOne({ username: nextUsernameLc }).lean();
      if (usernameExists) return res.status(409).json({ error: "Username already in use" });

      const doc = {
        name: String(name || "").trim(),
        email: emailLc,
        username: nextUsernameLc,
        role: nextRole,
        status: nextStatus,
        permissions: Array.isArray(permissions) ? permissions.map((x) => String(x)) : [],
        access: nextAccess,
        createdBy: "admin",
      };

      if (password) {
        const np = String(password);
        if (np.length < 4) return res.status(400).json({ error: "Weak password" });
        doc.passwordHash = await bcrypt.hash(np, 10);
      }
      if (pin) {
        const p = String(pin).trim();
        if (!/^\d{4,8}$/.test(p)) return res.status(400).json({ error: "PIN must be 4-8 digits" });
        doc.pinHash = await bcrypt.hash(p, 10);
      }

      var created = await User.create(doc);
    }

    // Ensure a corresponding Employee record exists for staff/marketer/developer/sales/finance (+ managers)
    if (
      nextRole === "staff" ||
      nextRole === "marketer" ||
      nextRole === "marketing_manager" ||
      nextRole === "developer" ||
      nextRole === "project_manager" ||
      nextRole === "sales" ||
      nextRole === "sales_manager" ||
      nextRole === "finance" ||
      nextRole === "finance_manager"
    ) {
      try {
        const dept =
          nextRole === "marketer"
            ? "marketing"
            : nextRole === "marketing_manager"
              ? "marketing"
              : nextRole === "developer" || nextRole === "project_manager"
              ? "development"
              : nextRole === "sales" || nextRole === "sales_manager"
                ? "sales"
                : nextRole === "finance" || nextRole === "finance_manager"
                  ? "finance"
                  : "";
        await Employee.findOneAndUpdate(
          { email: emailLc },
          {
            $setOnInsert: {
              email: emailLc,
              status: "active",
              disableLogin: false,
              markAsInactive: false,
            },
            $set: {
              name: String(name || "").trim() || emailLc,
              department: dept,
              role: nextRole,
              password: passwordRaw,
              passwordHash: await bcrypt.hash(passwordRaw, 10),
              disableLogin: false,
              markAsInactive: false,
            },
          },
          { new: true, upsert: true }
        );
      } catch (empError) {
        console.warn("Failed to upsert Employee record:", empError.message);
      }
    }

    const out = await User.findById(created._id).select("name email username role status permissions access clientId createdAt updatedAt").lean();
    res.status(201).json(out);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put("/admin/:id", authenticate, isAdmin, async (req, res) => {
  try {
    const { name, email, username, role, status, permissions, access } = req.body || {};
    const update = {};

    if (name !== undefined) update.name = String(name || "").trim();

    if (email !== undefined) {
      const nextEmail = String(email || "").toLowerCase().trim();
      if (!nextEmail) return res.status(400).json({ error: "Email is required" });
      const emailExists = await User.findOne({ email: nextEmail, _id: { $ne: req.params.id } }).lean();
      if (emailExists) return res.status(409).json({ error: "Email already in use" });
      update.email = nextEmail;
    }

    if (username !== undefined) {
      const nextUsername = String(username || "").toLowerCase().trim();
      if (!nextUsername) return res.status(400).json({ error: "Username is required" });
      const usernameExists = await User.findOne({ username: nextUsername, _id: { $ne: req.params.id } }).lean();
      if (usernameExists) return res.status(409).json({ error: "Username already in use" });
      update.username = nextUsername;
    }

    if (role) update.role = String(role).trim().toLowerCase();
    if (status) update.status = status;
    if (Array.isArray(permissions)) update.permissions = permissions.map((x) => String(x));

    if (access !== undefined) {
      const a = access && typeof access === "object" ? access : {};
      const ds = String(a.dataScope || "");
      update.access = {
        canView: a.canView !== undefined ? Boolean(a.canView) : true,
        canEdit: a.canEdit !== undefined ? Boolean(a.canEdit) : false,
        canDelete: a.canDelete !== undefined ? Boolean(a.canDelete) : false,
        dataScope: ["assigned", "all", "team"].includes(ds) ? ds : "assigned",
        canSeePrices: a.canSeePrices !== undefined ? Boolean(a.canSeePrices) : false,
        canSeeFinance: a.canSeeFinance !== undefined ? Boolean(a.canSeeFinance) : false,
      };
    }

    const doc = await User.findByIdAndUpdate(req.params.id, update, { new: true }).select("name email username role status permissions access clientId");
    if (!doc) return res.status(404).json({ error: "Not found" });

    // Ensure Employee linkage stays consistent for staff/marketer/developer/sales/finance (+ managers)
    try {
      const r = String(doc.role || "").toLowerCase();
      const emailLc = String(doc.email || "").toLowerCase().trim();
      if (
        emailLc &&
        (
          r === "staff" ||
          r === "marketer" ||
          r === "marketing_manager" ||
          r === "developer" ||
          r === "project_manager" ||
          r === "sales" ||
          r === "sales_manager" ||
          r === "finance" ||
          r === "finance_manager"
        )
      ) {
        const dept =
          r === "marketer"
            ? "marketing"
            : r === "marketing_manager"
              ? "marketing"
              : r === "developer" || r === "project_manager"
              ? "development"
              : r === "sales" || r === "sales_manager"
                ? "sales"
                : r === "finance" || r === "finance_manager"
                  ? "finance"
                  : "";
        await Employee.findOneAndUpdate(
          { email: emailLc },
          {
            $setOnInsert: {
              email: emailLc,
              status: doc.status === "active" ? "active" : "on-leave",
              disableLogin: false,
              markAsInactive: false,
            },
            $set: {
              name: String(doc.name || "").trim() || emailLc,
              department: dept,
              role: r,
              status: doc.status === "active" ? "active" : "on-leave",
            },
          },
          { new: true, upsert: true }
        );
      }
    } catch (empError) {
      console.warn("Failed to sync Employee record:", empError.message);
    }

    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put("/admin/:id/credentials", authenticate, isAdmin, async (req, res) => {
  try {
    const { password, pin } = req.body || {};
    const user = await User.findById(req.params.id).lean(false);
    if (!user) return res.status(404).json({ error: "User not found" });

    const update = {};
    if (password) {
      const np = String(password);
      if (np.length < 4) return res.status(400).json({ error: "Weak password" });
      update.passwordHash = await bcrypt.hash(np, 10);
    }

    if (pin) {
      const p = String(pin).trim();
      if (!/^\d{4,8}$/.test(p)) return res.status(400).json({ error: "PIN must be 4-8 digits" });
      update.pinHash = await bcrypt.hash(p, 10);
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ error: "Nothing to update" });
    }

    Object.assign(user, update);
    await user.save();

    // Update corresponding Employee record for staff/marketer/developer/sales/finance (+ managers) users
    const userRoleLc = String(user.role || "").toLowerCase();
    if (
      (
        userRoleLc === "staff" ||
        userRoleLc === "marketer" ||
        userRoleLc === "marketing_manager" ||
        userRoleLc === "developer" ||
        userRoleLc === "project_manager" ||
        userRoleLc === "sales" ||
        userRoleLc === "sales_manager" ||
        userRoleLc === "finance" ||
        userRoleLc === "finance_manager"
      ) &&
      password
    ) {
      try {
        const email = String(user.email || "").toLowerCase().trim();
        if (email) {
          const passwordHash = await bcrypt.hash(String(password), 10);
          await Employee.updateOne(
            { email },
            { 
              $set: { 
                password: password,
                passwordHash,
                disableLogin: false,
                markAsInactive: false 
              } 
            }
          );
        }
      } catch (empError) {
        console.warn("Failed to update Employee password:", empError.message);
        // Don't fail the request if Employee update fails
      }
    }

    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete("/admin/:id", authenticate, isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Prevent deleting yourself
    if (String(user._id) === String(req.user._id)) {
      return res.status(400).json({ error: "Cannot delete your own account" });
    }

    const userId = String(user._id);

    // === CLEANUP CONVERSATIONS AND MESSAGES ===
    try {
      // Find all conversations where this user is a participant
      const conversations = await Conversation.find({ participants: user._id }).lean();

      for (const convo of conversations) {
        const convoId = convo._id;
        const participantCount = Array.isArray(convo.participants) ? convo.participants.length : 0;
        const isOneToOne = participantCount === 2;

        if (isOneToOne) {
          // For 1:1 conversations, delete the entire conversation and all its messages
          await Message.deleteMany({ conversationId: convoId });
          await Conversation.findByIdAndDelete(convoId);
        } else {
          // For group conversations, remove user from participants and admins
          await Conversation.findByIdAndUpdate(convoId, {
            $pull: { participants: user._id, admins: user._id }
          });

          // If user was the creator, clear createdBy to avoid orphaned references
          if (String(convo.createdBy) === userId) {
            await Conversation.findByIdAndUpdate(convoId, { $unset: { createdBy: 1 } });
          }

          // Update lastMessage if it was from this user (find previous non-deleted message)
          if (convo.lastMessage) {
            const lastMsg = await Message.findById(convo.lastMessage).lean();
            if (lastMsg && String(lastMsg.sender) === userId) {
              const prevMsg = await Message.findOne({
                conversationId: convoId,
                sender: { $ne: user._id },
                isDeleted: { $ne: true }
              })
                .sort({ createdAt: -1 })
                .lean();
              await Conversation.findByIdAndUpdate(convoId, {
                lastMessage: prevMsg?._id || null
              });
            }
          }
        }
      }

      // Delete all messages sent by this user
      await Message.deleteMany({ sender: user._id });

      // Delete all notifications for this user
      await Notification.deleteMany({ userId: user._id });

      // Delete notifications that reference this user as a target (e.g., message notifications)
      await Notification.deleteMany({ "meta.conversationId": { $in: conversations.map(c => c._id) } });

    } catch (cleanupError) {
      // Log but don't fail the user deletion if cleanup has issues
      console.warn("Conversation/message cleanup warning:", cleanupError.message);
    }

    // Remove avatar file if it exists
    if (user.avatar && user.avatar.startsWith("/uploads/")) {
      try {
        const filePath = path.join(uploadDir, path.basename(user.avatar));
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (err) {
        console.error("Failed to delete avatar file:", err);
      }
    }

    // Delete corresponding Employee record for staff/marketer/developer/sales/finance users
    const userRoleLc = String(user.role || "").toLowerCase();
    if (userRoleLc === "staff" || userRoleLc === "marketer" || userRoleLc === "developer" || userRoleLc === "sales" || userRoleLc === "finance") {
      try {
        const email = String(user.email || "").toLowerCase().trim();
        if (email) {
          await Employee.deleteOne({ email });
        }
      } catch (empError) {
        console.warn("Failed to delete Employee record:", empError.message);
        // Don't fail the request if Employee deletion fails
      }
    }

    // Delete the user
    await User.findByIdAndDelete(req.params.id);

    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get("/", authenticate, async (req, res) => {
  try {
    const search = String(req.query.search || "").trim();
    const limitRaw = Number(req.query.limit || 20);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 50) : 20;

    const role = String(req.user?.role || "").toLowerCase();
    const allowedRoles = (() => {
      const internal = new Set([
        "admin",
        "staff",
        "marketer",
        "marketing_manager",
        "sales",
        "sales_manager",
        "finance",
        "finance_manager",
        "developer",
        "project_manager",
      ]);
      if (role === "admin") return internal;
      // Keep non-admin visibility limited to reduce unintended exposure.
      if (role === "staff") return new Set(["admin", "staff"]);
      if (role === "marketer" || role === "marketing_manager") return new Set(["admin", "marketer", "marketing_manager"]);
      if (role === "sales" || role === "sales_manager") return new Set(["admin", "sales", "sales_manager"]);
      if (role === "finance" || role === "finance_manager") return new Set(["admin", "finance", "finance_manager"]);
      if (role === "developer" || role === "project_manager") return new Set(["admin", "developer", "project_manager"]);
      return new Set();
    })();

    if (!allowedRoles.size) {
      return res.status(403).json({ error: "Access denied" });
    }

    const searchFilter = search
      ? { $or: [{ name: { $regex: search, $options: "i" } }, { email: { $regex: search, $options: "i" } }] }
      : {};

    const users = await User.find({ status: "active", role: { $in: Array.from(allowedRoles) }, ...searchFilter })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select("_id name email avatar role")
      .lean();

    const byId = new Map();
    for (const u of users) {
      if (!u?._id) continue;
      byId.set(String(u._id), {
        _id: u._id,
        name: u.name,
        email: u.email,
        avatar: normalizeAvatar(u.avatar),
        role: u.role,
      });
    }

    const empFilter = search
      ? {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
            { department: { $regex: search, $options: "i" } },
            { role: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    const employees = await Employee.find(empFilter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    for (const emp of employees) {
      const email = String(emp?.email || "").toLowerCase().trim();
      if (!email) continue;

      const userRole = resolveUserRoleFromEmployee(emp);

      // eslint-disable-next-line no-await-in-loop
      let user = await User.findOne({ email }).select("_id name email avatar role status").lean();

      // Create missing user only; never touch role/status for existing users
      if (!user) {
        // eslint-disable-next-line no-await-in-loop
        const created = await User.create({
          email,
          username: email,
          role: userRole,
          status: "active",
          createdBy: "employee-sync",
          name: emp.name || `${emp.firstName || ""} ${emp.lastName || ""}`.trim(),
          avatar: emp.avatar || "",
        });
        user = created?.toObject ? created.toObject() : created;
      } else {
        // eslint-disable-next-line no-await-in-loop
        user = await User.findByIdAndUpdate(
          user._id,
          {
            $set: {
              name: emp.name || `${emp.firstName || ""} ${emp.lastName || ""}`.trim(),
              avatar: emp.avatar || "",
            },
          },
          { new: true }
        )
          .select("_id name email avatar role status")
          .lean();
      }

      const uStatus = String(user?.status || "").toLowerCase();
      if (uStatus !== "active") continue;

      const uRole = String(user?.role || "").toLowerCase();
      if (!allowedRoles.has(uRole)) continue;

      if (!byId.has(String(user._id))) {
        byId.set(String(user._id), {
          _id: user._id,
          name: user.name,
          email: user.email,
          avatar: normalizeAvatar(user.avatar),
          role: user.role,
        });
      }
    }

    res.json(Array.from(byId.values()).slice(0, limit));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete("/me/avatar", authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Remove avatar file if it exists
    if (user.avatar && user.avatar.startsWith("/uploads/")) {
      try {
        const filePath = path.join(uploadDir, path.basename(user.avatar));
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (err) {
        console.error("Failed to delete avatar file:", err);
      }
    }

    // Update user record to remove avatar
    await User.findByIdAndUpdate(req.user._id, { avatar: "" });

    // Sync to related records
    const role = String(user?.role || "").toLowerCase();
    const email = String(user?.email || "").toLowerCase().trim();

    if (role === "client" && user?.clientId) {
      await Client.updateOne({ _id: user.clientId }, { $set: { avatar: "" } }).catch(() => null);
    }

    if (
      (
        role === "staff" ||
        role === "marketer" ||
        role === "marketing_manager" ||
        role === "developer" ||
        role === "project_manager" ||
        role === "sales" ||
        role === "sales_manager" ||
        role === "finance" ||
        role === "finance_manager"
      ) &&
      email
    ) {
      await Employee.updateOne({ email }, { $set: { avatar: "" } }).catch(() => null);
    }

    res.json({ message: "Avatar removed successfully" });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/fix-avatars", authenticate, async (req, res) => {
  try {
    const users = await User.find({ avatar: { $exists: true, $ne: "" } }).lean();
    let fixedCount = 0;

    for (const user of users) {
      if (user.avatar && user.avatar.startsWith("/uploads/")) {
        const filePath = path.join(uploadDir, path.basename(user.avatar));
        if (!fs.existsSync(filePath)) {
          // Avatar file doesn't exist, clear the reference
          await User.updateOne({ _id: user._id }, { $set: { avatar: "" } });

          // Also update related records
          const role = String(user?.role || "").toLowerCase();
          const email = String(user?.email || "").toLowerCase().trim();

          if (role === "client" && user?.clientId) {
            await Client.updateOne({ _id: user.clientId }, { $set: { avatar: "" } }).catch(() => null);
          }

          if (
            (
              role === "staff" ||
              role === "marketer" ||
              role === "marketing_manager" ||
              role === "developer" ||
              role === "project_manager" ||
              role === "sales" ||
              role === "sales_manager" ||
              role === "finance" ||
              role === "finance_manager"
            ) &&
            email
          ) {
            await Employee.updateOne({ email }, { $set: { avatar: "" } }).catch(() => null);
          }

          fixedCount++;
        }
      }
    }

    res.json({ message: `Fixed ${fixedCount} missing avatar references` });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
