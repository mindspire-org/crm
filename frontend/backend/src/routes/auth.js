import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import crypto from "node:crypto";
import User from "../models/User.js";
import Client from "../models/Client.js";
import Employee from "../models/Employee.js";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import Setting from "../models/Setting.js";
import { validateBody } from "../middleware/validate.js";
import { sendPasswordResetEmail } from "../services/mailer.js";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";
const TOKEN_TTL = process.env.JWT_TTL || "7d";

function escapeRegExp(str) {
  return String(str || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildIdentifierOrQuery(identifier) {
  const raw = String(identifier || "").trim();
  const lc = raw.toLowerCase();
  const exactLc = new RegExp(`^${escapeRegExp(lc)}$`, "i");
  // Determine if identifier looks like an email; only search the appropriate field
  const isEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(raw);
  return {
    identifierRaw: raw,
    identifierLc: lc,
    query: isEmail ? { email: exactLc } : { username: exactLc },
  };
}

const pinSchema = z.preprocess(
  (v) => (v === undefined || v === null ? undefined : String(v)),
  z.string().min(1)
);

const loginBodySchema = z
  .object({
    identifier: z.string().min(1),
    password: z.string().min(1).optional(),
    pin: pinSchema.optional(),
  })
  .passthrough()
  .refine((d) => Boolean(d.password || d.pin), { message: "Missing credentials" });

const clientRegisterSchema = z
  .object({
    companyName: z.string().optional(),
    clientName: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    type: z.string().optional(),
    email: z.string().email(),
    phone: z.string().optional(),
    password: z.string().min(1),
    industry: z.string().optional(),
    autoLogin: z.boolean().optional(),
  })
  .passthrough();

const forgotPasswordSchema = z
  .object({
    email: z.string().email(),
  })
  .passthrough();

const resetPasswordSchema = z
  .object({
    email: z.string().email(),
    token: z.string().min(10),
    newPassword: z.string().min(1),
  })
  .passthrough();

function resolveFrontendBaseUrl(settingsData) {
  const envBase = String(process.env.FRONTEND_URL || "").trim();
  if (envBase) return envBase.replace(/\/$/, "");
  const domain = String(settingsData?.general?.domain || "").trim();
  if (domain) return domain.replace(/\/$/, "");
  return "";
}

// Forgot password (email reset link)
router.post("/forgot-password", validateBody(forgotPasswordSchema), async (req, res) => {
  try {
    const email = String(req.body?.email || "").toLowerCase().trim();

    // Always return ok to avoid user enumeration.
    const okResponse = { ok: true };
    if (!email) return res.json(okResponse);

    const user = await User.findOne({ email }).lean(false);
    if (!user || String(user.status || "").toLowerCase() !== "active") {
      return res.json(okResponse);
    }

    // Generate a random token and store only a hash.
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const ttlMinutes = Math.max(5, Math.min(240, parseInt(String(process.env.RESET_PASSWORD_TTL_MINUTES || "30"), 10) || 30));
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

    user.resetPasswordTokenHash = tokenHash;
    user.resetPasswordTokenExpiresAt = expiresAt;
    await user.save();

    const settingsDoc = await Setting.findOne({ key: "global" }).lean().catch(() => null);
    const base = resolveFrontendBaseUrl(settingsDoc?.data || {});
    if (!base) {
      if ((process.env.NODE_ENV || "development") !== "production") {
        console.warn("[auth/forgot-password] FRONTEND_URL or settings.general.domain is missing; cannot build reset link");
      }
      return res.json(okResponse);
    }
    const link = `${base}/reset-password?email=${encodeURIComponent(email)}&token=${encodeURIComponent(rawToken)}`;

    await sendPasswordResetEmail({ to: email, link });
    return res.json(okResponse);
  } catch (e) {
    // Don't leak details; still respond OK.
    return res.json({ ok: true });
  }
});

// Reset password (token + new password)
router.post("/reset-password", validateBody(resetPasswordSchema), async (req, res) => {
  try {
    const email = String(req.body?.email || "").toLowerCase().trim();
    const token = String(req.body?.token || "").trim();
    const newPassword = String(req.body?.newPassword || "");

    const strong = /^(?=.*[a-zA-Z])(?=.*\d).{8,}$/;
    if (!strong.test(newPassword)) {
      return res.status(400).json({ error: "Weak password" });
    }

    const user = await User.findOne({ email }).lean(false);
    if (!user) return res.status(400).json({ error: "Invalid or expired reset link" });
    if (String(user.status || "").toLowerCase() !== "active") {
      return res.status(403).json({ error: "Inactive user" });
    }

    const expiresAt = user.resetPasswordTokenExpiresAt ? new Date(user.resetPasswordTokenExpiresAt) : null;
    if (!user.resetPasswordTokenHash || !expiresAt || Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() < Date.now()) {
      return res.status(400).json({ error: "Invalid or expired reset link" });
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    if (tokenHash !== String(user.resetPasswordTokenHash || "")) {
      return res.status(400).json({ error: "Invalid or expired reset link" });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    user.passwordHash = hash;
    user.resetPasswordTokenHash = "";
    user.resetPasswordTokenExpiresAt = undefined;
    await user.save();

    // Keep Employee password in sync for staff/marketer roles which authenticate against Employee records.
    const roleLc = String(user.role || "").toLowerCase();
    if (roleLc === "staff" || roleLc === "marketer" || roleLc === "marketing_manager") {
      const emp = await Employee.findOne({ email }).lean(false).catch(() => null);
      if (emp && !emp.disableLogin && !emp.markAsInactive) {
        emp.password = newPassword;
        emp.passwordHash = hash;
        await emp.save().catch(() => {});
      }
    }

    return res.json({ ok: true });
  } catch (e) {
    const isProd = (process.env.NODE_ENV || "development") === "production";
    return res.status(400).json({ error: isProd ? "Reset failed" : e.message || "Reset failed" });
  }
});

// Admin login
router.post("/admin/login", validateBody(loginBodySchema), async (req, res) => {
  try {
    const { identifier, password, pin } = req.body || {};
    if (!identifier || (!password && !pin)) return res.status(400).json({ error: "Missing credentials" });

    const { query } = buildIdentifierOrQuery(identifier);
    const user = await User.findOne(query).lean();
    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    if (user.role !== "admin") return res.status(403).json({ error: "Unauthorized role" });
    if (user.status !== "active") {
      return res.status(403).json({ error: "Inactive user" });
    }

    const ok = pin
      ? Boolean(user.pinHash) && (await bcrypt.compare(String(pin), user.pinHash))
      : Boolean(user.passwordHash) && (await bcrypt.compare(String(password), user.passwordHash));
    if (!ok) {
      await User.updateOne({ _id: user._id }, { $inc: { failedLogins: 1 } }).catch(() => {});
      return res.status(401).json({ error: "Invalid credentials" });
    }

    await User.updateOne({ _id: user._id }, { $set: { failedLogins: 0, lastLoginAt: new Date() } });
    const token = jwt.sign({ uid: user._id, role: user.role }, JWT_SECRET, { expiresIn: TOKEN_TTL });
    res.json({ token, user: { id: user._id, email: user.email, role: user.role, permissions: user.permissions || [] } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Temporary alias to handle older frontend builds pointing to /admin/login1
router.post("/admin/login1", validateBody(loginBodySchema), async (req, res) => {
  try {
    const { identifier, password, pin } = req.body || {};
    if (!identifier || (!password && !pin)) return res.status(400).json({ error: "Missing credentials" });

    const { query } = buildIdentifierOrQuery(identifier);
    const user = await User.findOne(query).lean(false);
    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    if (user.role !== "admin") return res.status(403).json({ error: "Unauthorized role" });
    if (user.status !== "active") {
      return res.status(403).json({ error: "Inactive user" });
    }

    const ok = pin
      ? Boolean(user.pinHash) && (await bcrypt.compare(String(pin), user.pinHash))
      : Boolean(user.passwordHash) && (await bcrypt.compare(String(password), user.passwordHash));
    if (!ok) {
      user.failedLogins = (user.failedLogins || 0) + 1;
      await user.save().catch(() => {});
      return res.status(401).json({ error: "Invalid credentials" });
    }

    await User.updateOne({ _id: user._id }, { $set: { failedLogins: 0, lastLoginAt: new Date() } });
    const token = jwt.sign({ uid: user._id, role: user.role }, JWT_SECRET, { expiresIn: TOKEN_TTL });
    res.json({ token, user: { id: user._id, email: user.email, role: user.role, permissions: user.permissions || [] } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Team login (admin + staff + marketer)
router.post("/team/login", validateBody(loginBodySchema), async (req, res) => {
  try {
    const { identifier, password, pin } = req.body || {};
    if (!identifier || (!password && !pin)) return res.status(400).json({ error: "Missing credentials" });

    const { identifierLc, query } = buildIdentifierOrQuery(identifier);
    let user = await User.findOne(query).lean();

    // If user doesn't exist yet, allow employee login by email and auto-create staff/marketer User.
    if (!user) {
      const emp = identifierLc
        ? await Employee.findOne({ email: new RegExp(`^${escapeRegExp(identifierLc)}$`, "i") }).lean()
        : null;
      if (!emp || emp.disableLogin || emp.markAsInactive) {
        if ((process.env.NODE_ENV || "development") !== "production") {
          console.warn("[auth/team/login] rejected: no user and no active employee", { identifier: identifierLc });
        }
        return res.status(401).json({ error: "Invalid credentials" });
      }
      const passwordRaw = String(password || "");
      const ok = emp.passwordHash
        ? await bcrypt.compare(passwordRaw, String(emp.passwordHash || ""))
        : String(emp.password || "") === passwordRaw;
      if (!ok) {
        if ((process.env.NODE_ENV || "development") !== "production") {
          console.warn("[auth/team/login] rejected: employee password mismatch", { identifier: identifierLc });
        }
        return res.status(401).json({ error: "Invalid credentials" });
      }

      if (!emp.passwordHash && emp.password) {
        const hashed = await bcrypt.hash(String(emp.password), 10);
        await Employee.updateOne({ _id: emp._id }, { $set: { passwordHash: hashed } }).catch(() => {});
      }

      const empRole = String(emp?.role || "").trim().toLowerCase();
      const empDept = String(emp?.department || "").trim().toLowerCase();
      const inferredRole =
        empRole === "project_manager" || empRole === "project manager" || empRole === "sales_manager"
          ? "project_manager"
          : empRole === "sales_manager"
            ? "sales_manager"
            : empRole === "finance_manager"
              ? "finance_manager"
              : empRole === "marketing_manager"
                ? "marketing_manager"
                : empRole === "developer" || empDept === "development" || empDept === "engineering"
          ? "developer"
          : empRole === "sales" || empDept === "sales"
            ? "sales"
            : empRole === "finance" || empDept === "finance"
              ? "finance"
              : empRole === "marketer" || empDept === "marketing"
                ? "marketer"
                : "staff";
      user = await User.findOneAndUpdate(
        { email: identifierLc },
        {
          $setOnInsert: {
            email: identifierLc,
            username: identifierLc,
            status: "active",
            createdBy: "employee-login",
          },
          $set: {
            name: emp.name || `${emp.firstName || ""} ${emp.lastName || ""}`.trim(),
            avatar: emp.avatar || "",
            role: inferredRole,
          },
        },
        { new: true, upsert: true }
      ).lean();
    }

    // If user exists already, reconcile marketer/staff role from Employee.department
    try {
      if (user && (user.role === "staff" || user.role === "marketer")) {
        const email = String(user.email || "").toLowerCase().trim();
        const empRoleSrc = email ? await Employee.findOne({ email: new RegExp(`^${escapeRegExp(email)}$`, "i") }).lean() : null;
        if (empRoleSrc) {
          const inferredRole = String(empRoleSrc.department || "").trim().toLowerCase() === "marketing" ? "marketer" : "staff";
          if (user.role !== inferredRole) {
            await User.updateOne({ _id: user._id }, { $set: { role: inferredRole } });
            user.role = inferredRole;
          }
        }
      }
    } catch {}

    if (
      user.role !== "admin" &&
      user.role !== "staff" &&
      user.role !== "marketer" &&
      user.role !== "marketing_manager" &&
      user.role !== "sales" &&
      user.role !== "sales_manager" &&
      user.role !== "finance" &&
      user.role !== "finance_manager" &&
      user.role !== "developer" &&
      user.role !== "project_manager" &&
      user.role !== "team_member"
    ) {
      return res.status(403).json({ error: "Unauthorized role" });
    }
    if (user.status !== "active") return res.status(403).json({ error: "Inactive user" });

    // Security rule: PIN login is available for all roles if configured in User model.
    if (pin && !user.pinHash) {
      return res.status(400).json({ error: "PIN login is not configured for this account." });
    }

    let ok = false;
    // Check User credentials first (for all roles)
    if (pin) {
      ok = Boolean(user.pinHash) && (await bcrypt.compare(String(pin), user.pinHash));
    } else {
      ok = Boolean(user.passwordHash) && (await bcrypt.compare(String(password), user.passwordHash));
    }

    // Fallback for legacy staff/marketers who only exist in Employee model
    if (!ok && !pin && (user.role === "staff" || user.role === "marketer" || user.role === "marketing_manager" || user.role === "team_member")) {
      const email = String(user.email || "").toLowerCase().trim();
      const emp = email ? await Employee.findOne({ email: new RegExp(`^${escapeRegExp(email)}$`, "i") }).lean(false) : null;
      if (emp && !emp.disableLogin && !emp.markAsInactive) {
        const passwordRaw = String(password || "");
        if (emp.passwordHash) {
          ok = await bcrypt.compare(passwordRaw, String(emp.passwordHash || ""));
        } else {
          ok = String(emp.password || "") === passwordRaw;
          if (ok && emp.password) {
            const hashed = await bcrypt.hash(String(emp.password), 10);
            emp.passwordHash = hashed;
            await emp.save().catch(() => {});
          }
        }
        // If employee login succeeded, sync password hash to User for future logins
        if (ok && !user.passwordHash) {
          const hashed = await bcrypt.hash(String(password), 10);
          await User.updateOne({ _id: user._id }, { $set: { passwordHash: hashed } });
        }
      }
    }

    if (!ok) {
      await User.updateOne({ _id: user._id }, { $inc: { failedLogins: 1 } }).catch(() => {});
      if ((process.env.NODE_ENV || "development") !== "production") {
        console.warn("[auth/team/login] rejected: password mismatch", { identifier: identifierLc, role: user?.role, email: user?.email });
      }
      return res.status(401).json({ error: "Invalid credentials" });
    }

    await User.updateOne({ _id: user._id }, { $set: { failedLogins: 0, lastLoginAt: new Date() } });
    const token = jwt.sign({ uid: user._id, role: user.role }, JWT_SECRET, { expiresIn: TOKEN_TTL });
    res.json({ token, user: { id: user._id, email: user.email, role: user.role, name: user.name || "", permissions: user.permissions || [] } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Client login (supports email or username, password or PIN)
router.post("/client/login", validateBody(loginBodySchema), async (req, res) => {
  try {
    const { identifier, password, pin } = req.body || {};
    if (!identifier || (!password && !pin)) return res.status(400).json({ error: "Missing credentials" });

    const { query } = buildIdentifierOrQuery(identifier);
    query.role = "client";
    const user = await User.findOne(query).lean();
    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    if (user.status !== "active") return res.status(403).json({ error: "Inactive user" });

    let ok = false;
    if (pin) {
      ok = Boolean(user.pinHash) && (await bcrypt.compare(String(pin), user.pinHash));
    } else if (password) {
      ok = Boolean(user.passwordHash) && (await bcrypt.compare(String(password), user.passwordHash));
    }

    if (!ok) {
      await User.updateOne({ _id: user._id }, { $inc: { failedLogins: 1 } }).catch(() => {});
      return res.status(401).json({ error: "Invalid credentials" });
    }

    await User.updateOne({ _id: user._id }, { $set: { failedLogins: 0, lastLoginAt: new Date() } });
    const token = jwt.sign({ uid: user._id, role: user.role }, JWT_SECRET, { expiresIn: TOKEN_TTL });

    const client = user.clientId ? await Client.findById(user.clientId).lean() : null;
    res.json({ token, user: { id: user._id, email: user.email, role: user.role, name: user.name || "", permissions: user.permissions || [] }, client });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Client register
router.post("/client/register", validateBody(clientRegisterSchema), async (req, res) => {
  try {
    const { companyName, clientName, firstName, lastName, type, email, phone, password, industry, autoLogin } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const emailLc = String(email).toLowerCase().trim();
    const exists = await User.findOne({ email: emailLc });
    if (exists) return res.status(409).json({ error: "Email already registered" });

    // password rules: 8+ with letters and numbers
    const strong = /^(?=.*[a-zA-Z])(?=.*\d).{8,}$/;
    if (!strong.test(password)) return res.status(400).json({ error: "Weak password" });

    const t = (type === "person" ? "person" : "org");
    const personName = (clientName && String(clientName).trim()) || `${String(firstName||"").trim()} ${String(lastName||"").trim()}`.trim();
    const company = t === "org" ? String(companyName || "").trim() : "";

    if (t === "org" && !company) return res.status(400).json({ error: "Company name required" });
    if (t === "person" && !personName) return res.status(400).json({ error: "Name required" });

    const clientDoc = await Client.create({
      type: t,
      company,
      person: personName,
      email: emailLc,
      phone: phone || "",
      labels: [],
      status: "active",
      createdBy: "self-signup",
    });

    const hash = await bcrypt.hash(password, 10);
    const userDoc = await User.create({
      email: emailLc,
      username: emailLc,
      passwordHash: hash,
      role: "client",
      status: "active",
      clientId: clientDoc._id,
      createdBy: "self-signup",
    });

    // Send welcome message from an admin to the new client (best-effort)
    try {
      const admin = await User.findOne({ role: { $regex: /^admin$/i }, status: { $regex: /^active$/i } })
        .sort({ createdAt: 1 })
        .select("_id")
        .lean();
      if (admin?._id) {
        const participants = [admin._id, userDoc._id];
        let conversation = await Conversation.findOne({
          $and: [
            {
              $or: [
                { projectId: { $exists: false } },
                { projectId: null },
              ],
            },
            { participants: { $all: participants, $size: 2 } },
          ],
        }).lean(false);

        if (!conversation) {
          conversation = await Conversation.create({
            participants,
            isGroup: false,
            createdBy: admin._id,
            admins: [admin._id],
          });
        }

        const displayName = String(personName || company || "").trim() || "there";
        const content = `Welcome to HealthSpire! 👋\n\nHello ${displayName},\n\nThank you for signing up with HealthSpire. We’re excited to have you on board.\n\nOur team is here to support you with your healthcare software needs. Please let us know how we can help you today—whether it’s onboarding, customization, or any questions you may have.\n\nBest regards,\nHealthSpire Admin Team`;

        const created = await Message.create({
          conversationId: conversation._id,
          sender: admin._id,
          content,
          attachments: [],
          readBy: [admin._id],
        });

        await Conversation.updateOne(
          { _id: conversation._id },
          { $set: { lastMessage: created._id }, $currentDate: { updatedAt: true } }
        ).catch(() => {});
      }
    } catch {
      // best-effort
    }

    if (autoLogin) {
      const token = jwt.sign({ uid: userDoc._id, role: userDoc.role }, JWT_SECRET, { expiresIn: TOKEN_TTL });
      return res.status(201).json({ ok: true, token, user: { id: userDoc._id, email: userDoc.email, role: userDoc.role }, client: clientDoc });
    }

    res.status(201).json({ ok: true, client: clientDoc });
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ error: "Email already registered" });
    res.status(500).json({ error: e.message });
  }
});

export default router;
