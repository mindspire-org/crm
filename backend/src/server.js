import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoose from "mongoose";
import morgan from "morgan";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import http from "node:http";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { authenticate } from "./middleware/auth.js";
import contactsRouter from "./routes/contacts.js";
import companiesRouter from "./routes/companies.js";
import employeesRouter from "./routes/employees.js";
import attendanceRouter from "./routes/attendance.js";
import leavesRouter from "./routes/leaves.js";
import payrollRouter from "./routes/payroll.js";
import departmentsRouter from "./routes/departments.js";
import foldersRouter from "./routes/folders.js";
import filesRouter from "./routes/files.js";
import notesRouter from "./routes/notes.js";
import commentsRouter from "./routes/comments.js";
import timesheetsRouter from "./routes/timesheets.js";
import milestonesRouter from "./routes/milestones.js";
import feedbackRouter from "./routes/feedback.js";
import noteCategoriesRouter from "./routes/noteCategories.js";
import noteLabelsRouter from "./routes/noteLabels.js";
import projectsRouter from "./routes/projects.js";
import expensesRouter from "./routes/expenses.js";
import jobsRouter from "./routes/jobs.js";
import candidatesRouter from "./routes/candidates.js";
import interviewsRouter from "./routes/interviews.js";
import tasksRouter from "./routes/tasks.js";
import clientsRouter from "./routes/clients.js";
import estimatesRouter from "./routes/estimates.js";
import invoicesRouter from "./routes/invoices.js";
import paymentsRouter from "./routes/payments.js";
import ordersRouter from "./routes/orders.js";
import contractsRouter from "./routes/contracts.js";
import proposalsRouter from "./routes/proposals.js";
import ticketsRouter from "./routes/tickets.js";
import ticketLabelsRouter from "./routes/ticketLabels.js";
import ticketTemplatesRouter from "./routes/ticketTemplates.js";
import eventsApiRouter from "./routes/events.js";
import itemsRouter from "./routes/items.js";
import estimateRequestsRouter from "./routes/estimateRequests.js";
import subscriptionsRouter from "./routes/subscriptions.js";
import subscriptionLabelsRouter from "./routes/subscriptionLabels.js";
import licensesRouter from "./routes/licenses.js";
import messagesRouter from "./routes/messages.js";
import usersRouter from "./routes/users.js";
import announcementsRouter from "./routes/announcements.js";
import clientPortalRouter from "./routes/client.js";
import projectRequestsRouter from "./routes/projectRequests.js";
import authRouter from "./routes/auth.js";
import estimateFormsRouter from "./routes/estimateForms.js";
import leadsRouter from "./routes/leads.js";
import leadLabelsRouter from "./routes/leadLabels.js";
import taskLabelsRouter from "./routes/taskLabels.js";
import remindersRouter from "./routes/reminders.js";
import helpArticlesRouter from "./routes/helpArticles.js";
import helpCategoriesRouter from "./routes/helpCategories.js";
import notificationsRouter from "./routes/notifications.js";
import settingsRouter from "./routes/settings.js";
import rolesRouter from "./routes/roles.js";
import realtimeRouter from "./routes/realtime.js";
import bcrypt from "bcryptjs";
import User from "./models/User.js";
import File from "./models/File.js";
import Role from "./models/Role.js";
import accountsRouter from "./routes/accounts.js";
import journalsRouter from "./routes/journals.js";
import ledgersRouter from "./routes/ledgers.js";
import reportsRouter from "./routes/reports.js";
import accountingSettingsRouter from "./routes/accountingSettings.js";
import accountingPeriodsRouter from "./routes/accountingPeriods.js";
import vendorsRouter from "./routes/vendors.js";
import statementsRouter from "./routes/statements.js";
import deleteAccountRequestsRouter from "./routes/deleteAccountRequests.js";
import recoveryRouter from "./routes/recovery.js";
import commissionsRouter from "./routes/commissions.js";
import appointmentsRouter from "./routes/appointments.js";
import vouchersRouter from "./routes/vouchers.js";
import metaAdsRouter from "./routes/metaAds.js";
import backupsRouter, { performAutoBackup } from "./routes/backups.js";
import nodeCron from "node-cron";
import { startLeadReminderService } from "./services/leadReminders.js";
import { startSubscriptionRenewalReminderService } from "./services/subscriptionRenewals.js";
import { seedCOA } from "./services/coaSeeder.js";
import recoveryCasesRouter from "./routes/recoveryCases.js";

dotenv.config();

const isProd = String(process.env.NODE_ENV || "development") === "production";
const jwtSecret = String(process.env.JWT_SECRET || "").trim();
if (isProd && (!jwtSecret || jwtSecret === "dev_secret_change_me")) {
  console.error("Missing or insecure JWT_SECRET in production. Refusing to start.");
  process.exit(1);
}

const execAsync = promisify(exec);

const app = express();
const PORT = process.env.PORT || 5050;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/mindspire";

// CORS configuration: allow Vercel frontend, Render preview, custom domain, and local dev
const defaultOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:5000",
  "http://localhost:5050",
  "https://crm.healthspire.org",
  "https://healthspire-crm.vercel.app",
  "https://healthspire-crm.onrender.com",
];
const envOrigins = (process.env.CORS_ORIGINS || "")
  .split(/[;,\s]+/)
  .map((s) => s.trim())
  .filter(Boolean);
const allowedOrigins = new Set([...defaultOrigins, ...envOrigins]);
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // mobile apps, curl, same-origin
    try {
      const url = new URL(origin);
      const ok =
        allowedOrigins.has(origin) ||
        allowedOrigins.has(`${url.protocol}//${url.host}`) ||
        url.hostname.endsWith(".vercel.app") ||
        url.hostname.endsWith(".onrender.com") ||
        url.hostname === "localhost" ||
        url.hostname === "127.0.0.1";
      return callback(null, ok);
    } catch {
      return callback(null, false);
    }
  },
  credentials: true,
  methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "Accept",
    "X-Requested-With",
  ],
  exposedHeaders: ["Content-Length", "Content-Type"],
};

async function seedDefaultRoles() {
  try {
    const defaults = [
      {
        name: "Admin",
        description: "Full system access",
        permissions: [
          "crm",
          "hrm",
          "projects",
          "prospects",
          "sales",
          "reports",
          "clients",
          "tasks",
          "messages",
          "tickets",
          "announcements",
          "calendar",
          "events",
          "subscriptions",
          "notes",
          "files",
        ],
      },
      {
        name: "Client",
        description: "Client portal access",
        permissions: ["clients", "tickets", "messages", "files"],
      },
      {
        name: "Sales Representative",
        description: "Sales & CRM access",
        permissions: ["crm", "prospects", "sales", "clients", "projects", "tasks"],
      },
      {
        name: "Sales Manager",
        description: "Sales manager access",
        permissions: ["crm", "prospects", "sales", "clients", "projects", "tasks", "reports", "messages"],
      },
      {
        name: "Finance",
        description: "Finance & reporting access",
        permissions: ["reports", "sales", "clients"],
      },
      {
        name: "Project Manager",
        description: "Project manager access",
        permissions: ["crm", "projects", "tasks", "messages", "tickets", "calendar", "events"],
      },
      {
        name: "Marketing Manager",
        description: "Marketing manager access",
        permissions: ["crm", "prospects", "reports", "messages"],
      },
      {
        name: "Developer / Team Mate / Staff",
        description: "Team member access",
        permissions: ["crm", "projects", "tasks", "messages", "tickets", "calendar", "events"],
      },
    ];

    for (const r of defaults) {
      // eslint-disable-next-line no-await-in-loop
      await Role.updateOne(
        { name: r.name },
        { $setOnInsert: { name: r.name }, $set: { description: r.description, permissions: r.permissions } },
        { upsert: true }
      );
    }
  } catch (e) {
    console.error("Role seed error:", e?.message || e);
  }
}

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT_MAX || 60),
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/auth", authLimiter);

app.use(express.json({ limit: "15mb" }));
app.use(morgan("dev"));
app.set("etag", false);
app.use((_, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_ROOT = path.resolve(__dirname, "..");
const UPLOAD_DIR = path.join(SERVER_ROOT, "uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}
// Handle missing client avatar files gracefully
app.get(/^\/uploads\/clientavatar_/, (req, res) => {
  const filePath = path.join(UPLOAD_DIR, path.basename(req.path));
  if (!fs.existsSync(filePath)) {
    // Return 204 No Content for missing avatars
    res.status(204).send();
    return;
  }
  res.sendFile(filePath);
});

// Handle missing avatar files gracefully
app.get(/^\/uploads\/avatar_user_/, (req, res) => {
  const filePath = path.join(UPLOAD_DIR, path.basename(req.path));
  if (!fs.existsSync(filePath)) {
    // Return 204 No Content for missing avatars
    res.status(204).send();
    return;
  }
  res.sendFile(filePath);
});

// Handle missing employee avatar files gracefully
app.get(/^\/uploads\/emp_/, (req, res) => {
  const filePath = path.join(UPLOAD_DIR, path.basename(req.path));
  if (!fs.existsSync(filePath)) {
    // Return 204 No Content for missing avatars
    res.status(204).send();
    return;
  }
  res.sendFile(filePath);
});

app.use("/uploads", authenticate, async (req, res, next) => {
  try {
    const filename = path.basename(req.path);
    const filePath = path.join(UPLOAD_DIR, filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found" });
    }
    
    // Skip ownership check for avatars - they have their own endpoints
    if (filename.startsWith("clientavatar_") || filename.startsWith("avatar_user_") || filename.startsWith("emp_")) {
      return res.sendFile(filePath);
    }
    
    // Check if user owns the file (admin can access any)
    if (req.user?.role === "admin") {
      return res.sendFile(filePath);
    }
    
    // Find file record in database
    const fileRecord = await File.findOne({ path: `/uploads/${filename}`, userId: req.user?._id });
    if (!fileRecord) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    res.sendFile(filePath);
  } catch (err) {
    console.error("File access error:", err.message);
    res.status(500).json({ error: "File access failed" });
  }
});

app.get("/", (_req, res) => {
  res.json({ ok: true, name: "Healthspire API", health: "/api/health" });
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, env: process.env.NODE_ENV || "development" });
});

app.get("/api/placeholder/:w/:h", (req, res) => {
  const w = Math.max(1, Math.min(1024, parseInt(String(req.params.w || "64"), 10) || 64));
  const h = Math.max(1, Math.min(1024, parseInt(String(req.params.h || "64"), 10) || 64));
  const svg = `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    `<rect width="100%" height="100%" fill="#e5e7eb"/>` +
    `<path d="M${Math.round(w*0.5)} ${Math.round(h*0.62)}c${Math.round(w*0.18)} 0 ${Math.round(w*0.32)} ${Math.round(h*0.12)} ${Math.round(w*0.32)} ${Math.round(h*0.26)}H${Math.round(w*0.18)}c0-${Math.round(h*0.14)} ${Math.round(w*0.14)}-${Math.round(h*0.26)} ${Math.round(w*0.32)}-${Math.round(h*0.26)}z" fill="#cbd5e1"/>` +
    `<circle cx="${Math.round(w*0.5)}" cy="${Math.round(h*0.38)}" r="${Math.max(6, Math.round(Math.min(w,h)*0.16))}" fill="#cbd5e1"/>` +
    `</svg>`;
  res.setHeader("Content-Type", "image/svg+xml");
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.status(200).send(svg);
});

app.get("/api/debug/routes", (_req, res) => {
  try {
    const stack = app?._router?.stack || [];
    const mounts = stack
      .filter((l) => l && l.name === "router" && l.regexp)
      .map((l) => {
        const s = l.regexp.toString();
        const m = s.match(/\\\/\^\\\\\/(.*?)\\\\\//);
        return m?.[1] ? `/${m[1].replace(/\\\\\//g, "/")}` : s;
      });
    res.json({ mounts });
  } catch (e) {
    res.status(500).json({ error: e.message || "debug failed" });
  }
});

app.use("/api/contacts", contactsRouter);
app.use("/api/companies", companiesRouter);
app.use("/api/employees", employeesRouter);
app.use("/api/attendance", attendanceRouter);
app.use("/api/leaves", leavesRouter);
app.use("/api/payroll", payrollRouter);
app.use("/api/departments", departmentsRouter);
app.use("/api/folders", foldersRouter);
app.use("/api/files", filesRouter);
app.use("/api/notes", notesRouter);
app.use("/api/comments", commentsRouter);
app.use("/api/timesheets", timesheetsRouter);
app.use("/api/milestones", milestonesRouter);
app.use("/api/feedback", feedbackRouter);
app.use("/api/note-categories", noteCategoriesRouter);
app.use("/api/note-labels", noteLabelsRouter);
app.use("/api/projects", projectsRouter);
app.use("/api/expenses", expensesRouter);
app.use("/api/jobs", jobsRouter);
app.use("/api/candidates", candidatesRouter);
app.use("/api/interviews", interviewsRouter);
app.use("/api/tasks", tasksRouter);
app.use("/api/clients", clientsRouter);
app.use("/api/estimates", estimatesRouter);
app.use("/api/invoices", invoicesRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/items", itemsRouter);
app.use("/api/contracts", contractsRouter);
app.use("/api/proposals", proposalsRouter);
app.use("/api/leads", leadsRouter);
app.use("/api/lead-labels", leadLabelsRouter);
app.use("/api/task-labels", taskLabelsRouter);
app.use("/api/ticket-labels", ticketLabelsRouter);
app.use("/api/ticket-templates", ticketTemplatesRouter);
app.use("/api/reminders", remindersRouter);
app.use("/api/appointments", appointmentsRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/realtime", realtimeRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/messages", messagesRouter);
app.use("/api/tickets", ticketsRouter);
app.use("/api/events", eventsApiRouter);
app.use("/api/estimate-requests", estimateRequestsRouter);
app.use("/api/subscriptions", subscriptionsRouter);
app.use("/api/subscription-labels", subscriptionLabelsRouter);
app.use("/api/licenses", licensesRouter);
// Backward/alternative path alias to avoid 404s from different frontends
app.use("/api/subscriptionlabels", subscriptionLabelsRouter);
app.use("/api/users", usersRouter);
app.use("/api/roles", rolesRouter);
app.use("/api/announcements", announcementsRouter);
app.use("/api/client", clientPortalRouter);
app.use("/api/project-requests", projectRequestsRouter);
app.use("/api/auth", authRouter);
app.use("/api/estimate-forms", estimateFormsRouter);
app.use("/api/delete-account-requests", deleteAccountRequestsRouter);
// Backward/alternative path alias to avoid 404s from different frontends
app.use("/api/estimateforms", estimateFormsRouter);
// Help & Support
app.use("/api/help/articles", helpArticlesRouter);
app.use("/api/help/categories", helpCategoriesRouter);
// Accounting core
app.use("/api/accounts", accountsRouter);
app.use("/api/journals", journalsRouter);
app.use("/api/ledgers", ledgersRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/accounting", accountingSettingsRouter);
app.use("/api/accounting-periods", accountingPeriodsRouter);
app.use("/api/vendors", vendorsRouter);
app.use("/api/statements", statementsRouter);
app.use("/api/accounting/recovery", recoveryRouter);
app.use("/api/accounting/recovery/cases", recoveryCasesRouter);
app.use("/api/vouchers", vouchersRouter);
app.use("/api/backups", backupsRouter);
app.use("/api/commissions", commissionsRouter);
app.use("/api/meta", metaAdsRouter);

async function seedAdmin() {
  try {
    const email = String(process.env.ADMIN_EMAIL || "admin@crm.healthspire.org").toLowerCase().trim();
    const username = String(process.env.ADMIN_USERNAME || "admin").trim() || "admin";
    const password = String(process.env.ADMIN_PASSWORD || "123");
    const isProd = String(process.env.NODE_ENV || "development") === "production";
    const seedEnabled = !isProd || String(process.env.SEED_ADMIN_ENABLED || "").trim() === "1";
    if (!seedEnabled) {
      return;
    }
    const forceResetEnv = String(process.env.SEED_ADMIN_FORCE_RESET || "").trim();
    // Only force reset when explicitly asked. In development we still auto-repair
    // missing credentials to prevent being locked out.
    const forceReset = forceResetEnv === "1";

    const usernameLc = String(username).toLowerCase().trim();
    const existing = await User.findOne({ $or: [{ username: usernameLc }, { email }] });
    if (!existing) {
      const passwordHash = await bcrypt.hash(password, 10);
      await User.create({
        email,
        username: usernameLc,
        passwordHash,
        role: "admin",
        status: "active",
        createdBy: "seed",
      });
      console.log(`Seeded default admin: ${email} / ${password}`);
      return;
    }

    const hasPassword = Boolean(String(existing.passwordHash || "").trim());
    const shouldRepairMissingPassword = !hasPassword;

    if (forceReset || (!isProd && shouldRepairMissingPassword)) {
      const passwordHash = await bcrypt.hash(password, 10);
      await User.updateOne(
        { _id: existing._id },
        { $set: { passwordHash, role: "admin", status: "active", username: usernameLc, email } }
      );
      console.log(`${forceReset ? "Reset" : "Repaired"} admin password: ${email} / ${password}`);
      return;
    }

    console.log(`Admin user already exists: ${email}`);
  } catch (err) {
    console.error("Admin seed error:", err.message);
  }
}

mongoose
  .connect(MONGODB_URI, { 
    dbName: process.env.MONGODB_DB || "mindspire",
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000
  })
  .then(() => {
    console.log("MongoDB connected");
    (async () => {
      await seedAdmin();
      await seedDefaultRoles();
      await seedCOA();
      startLeadReminderService();
      startSubscriptionRenewalReminderService();
      
      // Auto-backup every 12 hours
      nodeCron.schedule('0 */12 * * *', () => {
        console.log('[Cron] Triggering 12-hour auto-backup...');
        performAutoBackup();
      });

      const isDev = (process.env.NODE_ENV || "development") !== "production";

      const freePort = async (port) => {
        if (!isDev) return;
        if (process.platform === "win32") {
          const { stdout } = await execAsync(`powershell -NoProfile -Command "(Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue).OwningProcess"`).catch(() => ({ stdout: "" }));
          const pids = (stdout || "")
            .split(/\r?\n/)
            .map((s) => s.trim())
            .filter(Boolean)
            .map((s) => parseInt(s, 10))
            .filter((n) => Number.isFinite(n));
          for (const pid of pids) {
            // Only kill node/nodemon to avoid terminating other apps that might legitimately use 5000.
            // eslint-disable-next-line no-await-in-loop
            const { stdout: nameOut } = await execAsync(
              `powershell -NoProfile -Command "(Get-Process -Id ${pid} -ErrorAction SilentlyContinue).ProcessName"`
            ).catch(() => ({ stdout: "" }));
            const proc = (nameOut || "").trim().toLowerCase();
            if (proc === "node" || proc === "nodemon") {
              // eslint-disable-next-line no-await-in-loop
              await execAsync(`taskkill /F /PID ${pid}`).catch(() => null);
            }
          }
          return;
        }

        await execAsync(`lsof -ti tcp:${port} | xargs kill -9`).catch(() => null);
      };

      const delay = (ms) => new Promise((r) => setTimeout(r, ms));

      const listenWithRetry = async (retriesLeft = 8) => {
        const server = http.createServer(app);
        server.on("error", async (err) => {
          const code = err?.code;
          if (code === "EADDRINUSE" && isDev && retriesLeft > 0) {
            try {
              await freePort(PORT);
              await delay(800);
              await listenWithRetry(retriesLeft - 1);
            } catch (e) {
              console.error("Failed to recover from port conflict:", e?.message || e);
              process.exit(1);
            }
            return;
          }
          console.error("Server error:", code || "unknown", err?.message || err);
          if (code === "EADDRINUSE" && isDev && retriesLeft <= 0) {
            console.error(`Port ${PORT} is still in use after retries. Try closing other backend terminals.`);
          }
          process.exit(1);
        });

        server.listen(PORT, () => {
          console.log(`Server listening on http://localhost:${PORT}`);
        });
      };

      await freePort(PORT);
      await delay(500);
      await listenWithRetry();
    })();
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  });
