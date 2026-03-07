import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./src/models/User.js";
import Employee from "./src/models/Employee.js";
import Client from "./src/models/Client.js";
import http from "http";
import https from "https";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/mindspire";
const BACKEND_URL = (process.env.BACKEND_URL || "http://localhost:5050").replace(/\/$/, "");

// These are the same seed users as create_users.ts.
const DEFAULT_PASSWORD = "123";
const DEFAULT_PIN = "0101";

function normalizeEmail(v: any): string {
  return String(v || "").trim().toLowerCase();
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

type SeedUser = {
  email: string;
  username: string;
  role: "admin" | "staff" | "marketer" | "sales" | "finance" | "developer" | "client";
  expectedTab: "admin" | "staff" | "marketer" | "team" | "client";
};

const expectedUsers: SeedUser[] = [
  { email: "admin@crm.healthspire.org", username: "admin", role: "admin", expectedTab: "admin" },
  { email: "staff1@crm.healthspire.org", username: "staff1", role: "staff", expectedTab: "staff" },
  { email: "staff2@crm.healthspire.org", username: "staff2", role: "staff", expectedTab: "staff" },
  { email: "marketer1@crm.healthspire.org", username: "marketer1", role: "marketer", expectedTab: "marketer" },
  { email: "sales1@crm.healthspire.org", username: "sales1", role: "sales", expectedTab: "team" },
  { email: "finance1@crm.healthspire.org", username: "finance1", role: "finance", expectedTab: "team" },
  { email: "dev1@crm.healthspire.org", username: "dev1", role: "developer", expectedTab: "team" },
  { email: "client1@crm.healthspire.org", username: "client1", role: "client", expectedTab: "client" },
  { email: "client2@crm.healthspire.org", username: "client2", role: "client", expectedTab: "client" },
].map((u) => ({ ...u, email: normalizeEmail(u.email) }));

async function postJson(path: string, body: any) {
  const url = new URL(`${BACKEND_URL}${path}`);
  const payload = Buffer.from(JSON.stringify(body || {}));

  const transport = url.protocol === "https:" ? https : http;

  return await new Promise<{ ok: boolean; status: number; json: any }>((resolve) => {
    const req = transport.request(
      {
        method: "POST",
        hostname: url.hostname,
        port: url.port ? Number(url.port) : url.protocol === "https:" ? 443 : 80,
        path: `${url.pathname}${url.search}`,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": payload.length,
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (d) => chunks.push(Buffer.isBuffer(d) ? d : Buffer.from(String(d))));
        res.on("end", () => {
          const raw = Buffer.concat(chunks).toString("utf8");
          const json = (() => {
            try {
              return raw ? JSON.parse(raw) : {};
            } catch {
              return {};
            }
          })();
          const status = res.statusCode || 0;
          resolve({ ok: status >= 200 && status < 300, status, json });
        });
      }
    );

    req.on("error", () => resolve({ ok: false, status: 0, json: { error: "Request failed" } }));
    req.write(payload);
    req.end();
  });
}

async function checkDb() {
  const emails = expectedUsers.map((u) => u.email);
  const emailRegexes = emails.map((e) => new RegExp(`^${escapeRegExp(e)}$`, "i"));

  // Users are unique by schema, but we still verify state.
  const users = await User.find({ email: { $in: emails } }).lean();
  const employees = await Employee.find({ email: { $in: emailRegexes } }).lean();
  const clients = await Client.find({ email: { $in: emailRegexes } }).lean();

  const userByEmail = new Map(users.map((u: any) => [normalizeEmail(u.email), u]));
  const employeeByEmail = new Map(employees.map((e: any) => [normalizeEmail(e.email), e]));
  const clientByEmail = new Map(clients.map((c: any) => [normalizeEmail(c.email), c]));

  const problems: string[] = [];

  // Check duplicates (Employees/Clients may not have unique indexes).
  const dupEmp = await Employee.aggregate([
    { $group: { _id: { $toLower: "$email" }, count: { $sum: 1 } } },
    { $match: { _id: { $in: emails }, count: { $gt: 1 } } },
  ]).catch(() => []);

  const dupClient = await Client.aggregate([
    { $group: { _id: { $toLower: "$email" }, count: { $sum: 1 } } },
    { $match: { _id: { $in: emails }, count: { $gt: 1 } } },
  ]).catch(() => []);

  if (dupEmp.length) {
    problems.push(`Duplicate Employee records found for: ${dupEmp.map((d: any) => `${d._id} (x${d.count})`).join(", ")}`);
  }
  if (dupClient.length) {
    problems.push(`Duplicate Client records found for: ${dupClient.map((d: any) => `${d._id} (x${d.count})`).join(", ")}`);
  }

  for (const u of expectedUsers) {
    const user = userByEmail.get(u.email);
    if (!user) {
      problems.push(`Missing User: ${u.email} (${u.role})`);
      continue;
    }

    if (String(user.role) !== u.role) {
      problems.push(`User role mismatch for ${u.email}: expected ${u.role}, got ${user.role}`);
    }

    if (!user.passwordHash) {
      problems.push(`Missing passwordHash for User: ${u.email}`);
    }

    if (!user.pinHash) {
      problems.push(`Missing pinHash for User: ${u.email}`);
    }

    if (u.role === "staff" || u.role === "marketer") {
      const emp = employeeByEmail.get(u.email);
      if (!emp) problems.push(`Missing Employee record for ${u.email} (${u.role})`);
    }

    if (u.role === "client") {
      if (!user.clientId) {
        problems.push(`Missing clientId link on User: ${u.email}`);
      } else {
        // Ensure linked client exists (best-effort check).
        const linked = await Client.findById(user.clientId).lean().catch(() => null);
        if (!linked) problems.push(`Client link broken for ${u.email}: clientId=${String(user.clientId)}`);
      }

      const client = clientByEmail.get(u.email);
      if (!client) problems.push(`Missing Client record for ${u.email}`);
    }
  }

  return { problems };
}

async function checkLogins() {
  const problems: string[] = [];

  for (const u of expectedUsers) {
    let result: { ok: boolean; status: number; json: any } | null = null;

    if (u.expectedTab === "admin") {
      result = await postJson("/api/auth/admin/login", { identifier: u.email, password: DEFAULT_PASSWORD });
    } else if (u.expectedTab === "client") {
      result = await postJson("/api/auth/client/login", { identifier: u.email, password: DEFAULT_PASSWORD });
    } else {
      // Staff/Marketer/Team all use the /team/login endpoint.
      // Staff/Marketer are password-only in the UI; Sales/Finance/Developer can also use PIN.
      result = await postJson("/api/auth/team/login", { identifier: u.email, password: DEFAULT_PASSWORD });
    }

    if (!result.ok) {
      problems.push(`Login failed for ${u.email} via ${u.expectedTab} tab (HTTP ${result.status}): ${result.json?.error || "unknown error"}`);
      continue;
    }

    const role = String(result.json?.user?.role || "").toLowerCase();
    if (role !== u.role) {
      problems.push(`Login role mismatch for ${u.email}: expected ${u.role}, got ${role}`);
    }

    // Extra check: team tab supports PIN for non-staff/marketer.
    if (u.expectedTab === "team" && (u.role === "sales" || u.role === "finance" || u.role === "developer")) {
      const pinRes = await postJson("/api/auth/team/login", { identifier: u.email, pin: DEFAULT_PIN });
      if (!pinRes.ok) {
        problems.push(`PIN login failed for ${u.email} (HTTP ${pinRes.status}): ${pinRes.json?.error || "unknown error"}`);
      }
    }
  }

  return { problems };
}

async function main() {
  const allProblems: string[] = [];

  try {
    await mongoose.connect(MONGODB_URI);

    const db = await checkDb();
    allProblems.push(...db.problems);

    const logins = await checkLogins();
    allProblems.push(...logins.problems);

    if (allProblems.length) {
      console.error("\n❌ Verification failed:");
      for (const p of allProblems) console.error(`- ${p}`);
      process.exitCode = 1;
    } else {
      console.log("\n✅ Verification OK: all expected users exist and can login via the correct tab/endpoints.");
    }
  } catch (e: any) {
    console.error("❌ verify_users.ts crashed:", e?.message || e);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
}

main();
