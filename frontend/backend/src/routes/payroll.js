import { Router } from "express";
import { authenticate, isAdmin } from "../middleware/auth.js";
import Payroll from "../models/Payroll.js";
import Employee from "../models/Employee.js";
import Attendance from "../models/Attendance.js";
import { ensureLinkedAccount, getSettings, postJournal } from "../services/accounting.js";
import multer from "multer";
import * as XLSX from "xlsx";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Helper: Get days in month
const getDaysInMonth = (year, month) => new Date(year, month, 0).getDate();

// 1. Download Sample Attendance Template
router.get("/attendance-template", authenticate, isAdmin, (req, res) => {
  const data = [
    ["EmployeeID", "Name", "Date", "ClockIn", "ClockOut", "Notes"],
    ["EMP001", "John Doe", "2024-03-01", "09:00", "18:00", ""],
    ["EMP001", "John Doe", "2024-03-02", "09:15", "18:05", "Late 15 mins"],
    ["EMP002", "Jane Smith", "2024-03-01", "08:55", "17:30", ""],
  ];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, "Attendance");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  res.setHeader("Content-Disposition", 'attachment; filename="attendance_template.xlsx"');
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.send(buf);
});

// 2. Import Attendance Sheet
router.post("/import-attendance", authenticate, isAdmin, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    const results = { created: 0, updated: 0, errors: [] };

    for (const row of data) {
      try {
        const { EmployeeID, Name, Date: dateStr, ClockIn, ClockOut, Notes } = row;
        if (!dateStr) continue;

        // Find employee by ID or Name
        let employee = await Employee.findOne({ $or: [{ employeeId: EmployeeID }, { name: Name }] });
        if (!employee && EmployeeID) {
          employee = await Employee.findById(EmployeeID).catch(() => null);
        }

        if (!employee) {
          results.errors.push(`Employee not found: ${Name || EmployeeID}`);
          continue;
        }

        const date = new Date(dateStr);
        const clockIn = ClockIn ? new Date(`${dateStr}T${ClockIn}`) : null;
        const clockOut = ClockOut ? new Date(`${dateStr}T${ClockOut}`) : null;

        const filter = {
          employeeId: employee._id,
          date: {
            $gte: new Date(date.setHours(0, 0, 0, 0)),
            $lte: new Date(date.setHours(23, 59, 59, 999))
          }
        };

        const update = {
          employeeId: employee._id,
          name: employee.name,
          date: new Date(dateStr),
          clockIn,
          clockOut,
          notes: Notes || ""
        };

        const existing = await Attendance.findOne(filter);
        if (existing) {
          await Attendance.updateOne(filter, { $set: update });
          results.updated++;
        } else {
          await Attendance.create(update);
          results.created++;
        }
      } catch (err) {
        results.errors.push(`Row error: ${err.message}`);
      }
    }

    res.json({ ok: true, results });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// 3. Run Standard Payroll from Attendance
router.post("/run-calculated", authenticate, isAdmin, async (req, res) => {
  try {
    const period = req.body?.period || new Date().toISOString().slice(0, 7);
    const [year, month] = period.split("-").map(Number);
    const daysInMonth = getDaysInMonth(year, month);
    const allowedLeaves = 2;
    const standardStartTime = "09:00"; // Should be configurable later

    const emps = await Employee.find({ status: "active" }).lean();
    const payrollResults = [];

    for (const emp of emps) {
      const attendance = await Attendance.find({
        employeeId: emp._id,
        date: {
          $gte: new Date(year, month - 1, 1),
          $lte: new Date(year, month, 0, 23, 59, 59)
        }
      }).lean();

      let presentDays = 0;
      let lateMinutes = 0;
      
      attendance.forEach(att => {
        if (att.clockIn) {
          presentDays++;
          // Calc late minutes
          const [sH, sM] = standardStartTime.split(":").map(Number);
          const cin = new Date(att.clockIn);
          const expected = new Date(cin);
          expected.setHours(sH, sM, 0, 0);
          if (cin > expected) {
            lateMinutes += Math.floor((cin - expected) / 60000);
          }
        }
      });

      const absentDays = Math.max(0, daysInMonth - presentDays - allowedLeaves);
      const basic = Number(emp.salary || 0);
      const dayRate = basic / daysInMonth;
      
      // Deduction rules: 1 full day for each absent day beyond 2
      const absentDeduction = absentDays * dayRate;
      
      // Late deduction: standard Pakistan rule: half-day or full-day deduction after X lates
      // We'll implement a flexible deduction: for every 30 minutes of total late time, deduct 1 hour of pay
      const lateDeduction = (lateMinutes / 60) * (dayRate / 8); 

      const net = Math.max(0, basic - absentDeduction - lateDeduction);

      const payrollData = {
        employeeId: emp._id,
        employee: emp.name,
        period,
        basic,
        daysInMonth,
        presentDays,
        absentDays,
        lateMinutes,
        lateDeduction: Math.round(lateDeduction),
        absentDeduction: Math.round(absentDeduction),
        allowedLeaves,
        net: Math.round(net),
        status: "draft"
      };

      await Payroll.findOneAndUpdate(
        { employeeId: emp._id, period },
        { $set: payrollData },
        { upsert: true, new: true }
      );
      payrollResults.push(payrollData);
    }

    res.json({ ok: true, count: payrollResults.length, items: payrollResults });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// List by period with optional search
router.get("/", authenticate, async (req, res) => {
  try {
    const rawPeriod = req.query.period?.toString();
    const period = rawPeriod || new Date().toISOString().slice(0,7);
    const q = req.query.q?.toString().trim();
    let filter = period === "all" ? {} : { period };
    
    // Staff can only see their own payroll
    if (req.user.role === 'staff') {
      const staffEmployee = await Employee.findOne({ email: req.user.email }).lean();
      if (!staffEmployee) return res.status(404).json({ error: "Employee record not found" });
      filter.employeeId = staffEmployee._id;
      // Ignore search filter for staff
    } else if (q) {
      // Admins can search by employee name
      Object.assign(filter, { employee: { $regex: q, $options: "i" } });
    }
    
    const items = await Payroll.find(filter).sort({ period: -1, employee: 1 }).lean();
    res.json(items);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Run payroll for a period from Employees' salary (admin only)
router.post("/run", authenticate, isAdmin, async (req, res) => {
  try {
    const period = req.body?.period || req.query.period || new Date().toISOString().slice(0,7);
    const emps = await Employee.find({}).lean();
    const bulk = emps.map((e) => {
      const name = e.name || `${e.firstName || ""} ${e.lastName || ""}`.trim();
      const basic = Number(e.salary || 0) || 0;
      const allowances = 0;
      const deductions = 0;
      const net = basic + allowances - deductions;
      return {
        updateOne: {
          filter: { employeeId: e._id, period },
          update: { $set: { employeeId: e._id, employee: name, period, basic, allowances, deductions, net, status: "draft" } },
          upsert: true,
        },
      };
    });
    if (bulk.length) await Payroll.bulkWrite(bulk, { ordered: false });
    const items = await Payroll.find({ period }).sort({ employee: 1 }).lean();
    res.json({ ok: true, count: items.length, items });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Update a payroll row
router.put("/:id", authenticate, async (req, res) => {
  try {
    // First get the payroll record to check ownership
    const payroll = await Payroll.findById(req.params.id).lean();
    if (!payroll) return res.status(404).json({ error: "Not found" });
    
    // Staff can only update their own payroll
    if (req.user.role === 'staff') {
      const staffEmployee = await Employee.findOne({ email: req.user.email }).lean();
      if (!staffEmployee) return res.status(404).json({ error: "Employee record not found" });
      if (String(payroll.employeeId) !== String(staffEmployee._id)) {
        return res.status(403).json({ error: "Can only update your own payroll" });
      }
    }
    
    const doc = await Payroll.findByIdAndUpdate(req.params.id, req.body, { new: true });

    // Automation: journals on status transition
    try {
      const prevStatus = payroll.status;
      const newStatus = doc?.status;
      const amt = Number(doc?.net || 0);
      if (amt > 0 && prevStatus !== newStatus) {
        const settings = await getSettings();
        if (newStatus === "processed") {
          // Accrual
          const empAcc = await ensureLinkedAccount("employee", doc.employeeId, doc.employee || "Employee");
          await postJournal({
            date: new Date(),
            memo: `Payroll processed ${doc.period} - ${doc.employee}`,
            lines: [
              { accountCode: settings.salaryExpense, debit: amt, credit: 0 },
              { accountCode: empAcc.code, debit: 0, credit: amt, entityType: "employee", entityId: doc.employeeId },
            ],
            postedBy: "system",
          });
        } else if (newStatus === "paid") {
          // Payment
          const empAcc = await ensureLinkedAccount("employee", doc.employeeId, doc.employee || "Employee");
          const cashOrBank = settings.bankAccount || settings.cashAccount;
          await postJournal({
            date: new Date(),
            memo: `Salary paid ${doc.period} - ${doc.employee}`,
            lines: [
              { accountCode: empAcc.code, debit: amt, credit: 0, entityType: "employee", entityId: doc.employeeId },
              { accountCode: cashOrBank, debit: 0, credit: amt },
            ],
            postedBy: "system",
          });
        }
      }
    } catch (_) {}

    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
