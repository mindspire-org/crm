import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import User from './src/models/User.js';
import Employee from './src/models/Employee.js';
import Client from './src/models/Client.js';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mindspire';
const DEFAULT_PASSWORD = '123';
const DEFAULT_PIN = '0101';
const FORCE_RESET_SEEDED_CREDENTIALS = String(process.env.FORCE_RESET_SEEDED_CREDENTIALS || '').toLowerCase() === 'true';

function normalizeEmail(v: any): string {
  return String(v || '').trim().toLowerCase();
}

function normalizeUsername(v: any): string {
  return String(v || '').trim();
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Define user blocks here — add/remove/update as needed
const userBlocks = [
  // Admin
  {
    email: 'admin@crm.healthspire.org',
    username: 'admin',
    name: 'CRM Admin',
    role: 'admin',
    permissions: ['*'],
    access: { canView: true, canEdit: true, canDelete: true, dataScope: 'all', canSeePrices: true, canSeeFinance: true },
  },
  // Staff
  {
    email: 'staff1@crm.healthspire.org',
    username: 'staff1',
    name: 'Staff One',
    role: 'staff',
    permissions: [],
    access: { canView: true, canEdit: false, canDelete: false, dataScope: 'assigned', canSeePrices: false, canSeeFinance: false },
  },
  {
    email: 'staff2@crm.healthspire.org',
    username: 'staff2',
    name: 'Staff Two',
    role: 'staff',
    permissions: [],
    access: { canView: true, canEdit: false, canDelete: false, dataScope: 'assigned', canSeePrices: false, canSeeFinance: false },
  },
  // Marketer
  {
    email: 'marketer1@crm.healthspire.org',
    username: 'marketer1',
    name: 'Marketer One',
    role: 'marketer',
    permissions: [],
    access: { canView: true, canEdit: true, canDelete: false, dataScope: 'assigned', canSeePrices: false, canSeeFinance: false },
  },
  // Sales
  {
    email: 'sales1@crm.healthspire.org',
    username: 'sales1',
    name: 'Sales One',
    role: 'sales',
    permissions: [],
    access: { canView: true, canEdit: true, canDelete: false, dataScope: 'assigned', canSeePrices: true, canSeeFinance: false },
  },
  // Finance
  {
    email: 'finance1@crm.healthspire.org',
    username: 'finance1',
    name: 'Finance One',
    role: 'finance',
    permissions: [],
    access: { canView: true, canEdit: true, canDelete: false, dataScope: 'assigned', canSeePrices: true, canSeeFinance: true },
  },
  // Developer
  {
    email: 'dev1@crm.healthspire.org',
    username: 'dev1',
    name: 'Developer One',
    role: 'developer',
    permissions: [],
    access: { canView: true, canEdit: false, canDelete: false, dataScope: 'assigned', canSeePrices: false, canSeeFinance: false },
  },
  // Clients (example)
  {
    email: 'client1@crm.healthspire.org',
    username: 'client1',
    name: 'Client One',
    role: 'client',
    permissions: [],
    access: { canView: true, canEdit: false, canDelete: false, dataScope: 'assigned', canSeePrices: false, canSeeFinance: false },
    clientInfo: {
      type: 'org',
      company: 'Client One Company',
      phone: '+1234567890',
    },
  },
  {
    email: 'client2@crm.healthspire.org',
    username: 'client2',
    name: 'Client Two',
    role: 'client',
    permissions: [],
    access: { canView: true, canEdit: false, canDelete: false, dataScope: 'assigned', canSeePrices: false, canSeeFinance: false },
    clientInfo: {
      type: 'person',
      person: 'Client Two Person',
      phone: '+0987654321',
    },
  },
];

async function hashPassword(pwd: string): Promise<string> {
  return bcrypt.hash(pwd, 10);
}

type SeedBlock = {
  email: string;
  username: string;
  name: string;
  role: string;
  permissions: any[];
  access: any;
  clientInfo?: any;
};

type SeedContext = {
  userByEmail: Map<string, any>;
  employeeByEmail: Map<string, any>;
  clientByEmail: Map<string, any>;
  defaultPasswordHash: string;
  defaultPinHash: string;
};

async function upsertUser(block: SeedBlock, ctx: SeedContext) {
  const email = normalizeEmail(block.email);
  const username = normalizeUsername(block.username);
  const existing = ctx.userByEmail.get(email) || null;

  const baseDoc: any = {
    email,
    username,
    name: block.name,
    role: block.role,
    permissions: block.permissions,
    access: block.access,
    status: 'active',
  };

  // Never overwrite credentials for existing users unless missing.
  const needsPassword = FORCE_RESET_SEEDED_CREDENTIALS || !existing || !existing.passwordHash;
  const needsPin = FORCE_RESET_SEEDED_CREDENTIALS || !existing || !existing.pinHash;

  const userDoc: any = {
    ...baseDoc,
    ...(needsPassword ? { passwordHash: ctx.defaultPasswordHash } : {}),
    ...(needsPin ? { pinHash: ctx.defaultPinHash } : {}),
  };

  if (block.role === 'client' && block.clientInfo) {
    // Create or link Client document by email to keep this idempotent.
    let client = ctx.clientByEmail.get(email) || null;
    if (!client) {
      client = await Client.create({
        type: block.clientInfo.type,
        company: block.clientInfo.company || '',
        person: block.clientInfo.person || '',
        email,
        phone: block.clientInfo.phone || '',
        status: 'active',
        createdBy: 'create_users_script',
      });
      ctx.clientByEmail.set(email, client);
    }
    userDoc.clientId = client._id;
  }

  if (existing) {
    // Update only if missing or changed
    const needsUpdate =
      existing.name !== block.name ||
      existing.username !== username ||
      existing.role !== block.role ||
      JSON.stringify(existing.permissions) !== JSON.stringify(block.permissions) ||
      JSON.stringify(existing.access) !== JSON.stringify(block.access) ||
      needsPassword ||
      needsPin ||
      (userDoc.clientId && String(existing.clientId || '') !== String(userDoc.clientId || ''));

    if (needsUpdate) {
      await User.updateOne(
        { _id: existing._id },
        {
          $set: {
            ...userDoc,
            updatedAt: new Date(),
          },
        }
      );
      ctx.userByEmail.set(email, { ...existing, ...userDoc });
      console.log(`🔄 Updated user: ${block.email} (${block.role})`);
    } else {
      console.log(`✅ User already exists: ${block.email} (${block.role})`);
    }
  } else {
    const created = await User.create({
      ...userDoc,
      createdBy: 'create_users_script',
    });
    ctx.userByEmail.set(email, created);
    console.log(`➕ Created user: ${block.email} (${block.role})`);
  }

  // For staff/marketer, ensure Employee record exists. Avoid overwriting passwords.
  if (block.role === 'staff' || block.role === 'marketer') {
    let emp = ctx.employeeByEmail.get(email) || null;
    if (!emp) {
      emp = await Employee.create({
        email,
        name: block.name,
        password: DEFAULT_PASSWORD, // plain text as per existing system
        department: block.role === 'marketer' ? 'Marketing' : 'General',
        disableLogin: false,
        markAsInactive: false,
        createdBy: 'create_users_script',
      });
      ctx.employeeByEmail.set(email, emp);
      console.log(`👥 Created Employee record for: ${block.email}`);
    } else {
      if (FORCE_RESET_SEEDED_CREDENTIALS || !emp.password) {
        await Employee.updateOne({ _id: emp._id }, { $set: { password: DEFAULT_PASSWORD } });
        console.log(`🔄 Set Employee password for: ${block.email}`);
      } else {
        console.log(`✅ Employee record exists: ${block.email}`);
      }
    }
  }
}

async function main() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('🟢 Connected to MongoDB');

    const blocks: SeedBlock[] = userBlocks.map((b: any) => ({
      ...b,
      email: normalizeEmail(b.email),
      username: normalizeUsername(b.username),
    }));

    const emails = blocks.map((b) => b.email);

    // Employee/Client collections may contain mixed-case emails (no unique+lowercase constraint).
    // Query case-insensitively to avoid creating duplicates on reruns.
    const emailRegexes = emails.map((e) => new RegExp(`^${escapeRegExp(e)}$`, 'i'));

    // Load all existing docs once to reduce DB round-trips.
    const existingUsers = await User.find({ email: { $in: emails } }).lean();
    const existingEmployees = await Employee.find({ email: { $in: emailRegexes } }).lean();
    const existingClients = await Client.find({ email: { $in: emailRegexes } }).lean();

    const ctx: SeedContext = {
      userByEmail: new Map(existingUsers.map((u: any) => [String(u.email), u])),
      employeeByEmail: new Map(existingEmployees.map((e: any) => [normalizeEmail(e.email), e])),
      clientByEmail: new Map(existingClients.map((c: any) => [normalizeEmail(c.email), c])),
      defaultPasswordHash: await hashPassword(DEFAULT_PASSWORD),
      defaultPinHash: await hashPassword(DEFAULT_PIN),
    };

    for (const block of blocks) {
      await upsertUser(block, ctx);
    }

    console.log('\n🎉 User creation/update completed!');
    console.log(`🔑 Default password for all users: ${DEFAULT_PASSWORD}`);
    console.log(`🔑 Default PIN for all users: ${DEFAULT_PIN}`);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

main();
