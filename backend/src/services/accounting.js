import Account from "../models/Account.js";
import AccountingSettings from "../models/AccountingSettings.js";
import AccountingPeriod from "../models/AccountingPeriod.js";
import JournalEntry from "../models/JournalEntry.js";

function last6(id = "") {
  const s = String(id);
  return s.slice(-6).toUpperCase();
}

export async function getSettings() {
  let s = await AccountingSettings.findOne({}).lean();
  if (!s) {
    s = (await AccountingSettings.create({})).toObject();
  }
  return s;
}

export async function ensureLinkedAccount(entityType, entityId, displayName) {
  const settings = await getSettings();
  let parent = settings.arParent;
  let type = "asset";
  if (entityType === "employee") {
    parent = settings.salaryPayableParent;
    type = "liability";
  } else if (entityType === "vendor") {
    parent = settings.apParent;
    type = "liability";
  }
  const code = `${parent}-${last6(entityId)}`;
  let acc = await Account.findOne({ code }).lean();
  if (!acc) {
    acc = (
      await Account.create({
        code,
        name: `${displayName} (${entityType})`,
        type,
        parentCode: parent,
        isActive: true,
      })
    ).toObject();
  }
  return acc;
}

export async function resolveAccountByCode(code) {
  if (!code) return null;
  const acc = await Account.findOne({ code }).lean();
  return acc;
}

export async function assertNotLocked(date) {
  const d = new Date(date);
  const locked = await AccountingPeriod.findOne({ locked: true, start: { $lte: d }, end: { $gte: d } }).lean();
  if (locked) {
    throw new Error(`Accounting period locked: ${locked.name || locked.start?.toISOString()?.slice(0,10)} - ${locked.end?.toISOString()?.slice(0,10)}`);
  }
}

export async function postJournal({ date, memo = "", refNo = "", currency = "PKR", lines = [], postedBy = "system", adjusting = false }) {
  const when = date ? new Date(date) : new Date();
  await assertNotLocked(when);
  // Resolve accountId for any line with accountCode
  for (const l of lines) {
    if (!l.accountId && l.accountCode) {
      const acc = await Account.findOne({ code: l.accountCode }).lean();
      if (!acc) throw new Error(`Account not found: ${l.accountCode}`);
      l.accountId = acc._id;
      l.accountCode = acc.code;
    }
    l.debit = Number(l.debit || 0);
    l.credit = Number(l.credit || 0);
  }
  const doc = await JournalEntry.create({
    date: when,
    memo: String(memo || ""),
    refNo: String(refNo || ""),
    currency: String(currency || "PKR"),
    postedAt: new Date(),
    postedBy: String(postedBy || "system"),
    adjusting: Boolean(adjusting) || false,
    lines,
  });
  return doc;
}
