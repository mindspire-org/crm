import { Router } from "express";
import { authenticate, isAdmin } from "../middleware/auth.js";
import Attendance from "../models/Attendance.js";
import Employee from "../models/Employee.js";
import multer from "multer";
import XLSX from "xlsx";
import mongoose from "mongoose";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Helper: start/end of day
const startOfDay = (d = new Date()) => {
  const x = new Date(d);
  x.setHours(0,0,0,0);
  return x;
};
const endOfDay = (d = new Date()) => {
  const x = new Date(d);
  x.setHours(23,59,59,999);
  return x;
};

// List members with current clock state
router.get("/members", authenticate, async (req, res) => {
  try {
    // Staff can only see their own clock status
    if (req.user.role !== 'admin') {
      const staffEmployee = await Employee.findOne({ email: req.user.email }).lean();
      if (!staffEmployee) return res.status(404).json({ error: "Employee record not found" });
      
      const today = { $gte: startOfDay(), $lte: endOfDay() };
      const todays = await Attendance.find({ date: today }).lean();
      const open = todays.find((t) => String(t.employeeId) === String(staffEmployee._id) && t.clockIn && !t.clockOut);
      const name = staffEmployee.name || `${staffEmployee.firstName || ""} ${staffEmployee.lastName || ""}`.trim();
      const initials = (staffEmployee.initials || name.split(" ").map((w)=>w[0]).join("").slice(0,2)).toUpperCase();
      const avatar = staffEmployee.avatar || "";
      
      return res.json([{
        employeeId: staffEmployee._id,
        name,
        initials,
        avatar,
        avatarUrl: avatar ? (String(avatar).startsWith("http") ? avatar : `${res.req.protocol}://${res.req.get("host")}${avatar.startsWith("/") ? "" : "/"}${avatar}`) : "",
        clockedIn: !!open,
        startTime: open?.clockIn ? new Date(open.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : undefined,
      }]);
    }
    
    // Admins can see all members
    const emps = await Employee.find({}).lean();
    const today = { $gte: startOfDay(), $lte: endOfDay() };
    const todays = await Attendance.find({ date: today }).lean();
    const list = emps.map((e) => {
      const open = todays.find((t) => String(t.employeeId) === String(e._id) && t.clockIn && !t.clockOut);
      const name = e.name || `${e.firstName || ""} ${e.lastName || ""}`.trim();
      const initials = (e.initials || name.split(" ").map((w)=>w[0]).join("").slice(0,2)).toUpperCase();
      const avatar = e.avatar || "";
      return {
        employeeId: e._id,
        name,
        initials,
        avatar,
        avatarUrl: avatar ? (String(avatar).startsWith("http") ? avatar : `${res.req.protocol}://${res.req.get("host")}${avatar.startsWith("/") ? "" : "/"}${avatar}`) : "",
        clockedIn: !!open,
        startTime: open?.clockIn ? new Date(open.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : undefined,
      };
    });
    res.json(list);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Clock in
router.post("/clock-in", authenticate, async (req, res) => {
  try {
    const { employeeId, name } = req.body || {};
    let empId = employeeId;
    
    // If not admin, force use own employee record
    if (req.user.role !== 'admin') {
      const staffEmployee = await Employee.findOne({ email: req.user.email }).lean();
      if (!staffEmployee) return res.status(404).json({ error: "Employee record not found" });
      empId = staffEmployee._id;
    }
    
    if (!empId && name) {
      const emp = await Employee.findOne({ name });
      if (emp) empId = emp._id;
    }
    if (!empId) return res.status(400).json({ error: "employeeId or name required" });

    const now = new Date();
    const date = startOfDay(now);
    
    // Check if already clocked in today without clocking out
    const existing = await Attendance.findOne({ 
      employeeId: empId, 
      date: { $gte: startOfDay(now), $lte: endOfDay(now) }, 
      clockOut: { $exists: false } 
    });
    
    if (existing) return res.json(existing);

    const doc = await Attendance.create({ 
      employeeId: empId, 
      name: name || (await Employee.findById(empId).then(e => e?.name)), 
      date, 
      clockIn: now 
    });
    res.status(201).json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Clock out
router.post("/clock-out", authenticate, async (req, res) => {
  try {
    const { employeeId, name } = req.body || {};
    let empId = employeeId;
    
    // If not admin, force use own employee record
    if (req.user.role !== 'admin') {
      const staffEmployee = await Employee.findOne({ email: req.user.email }).lean();
      if (!staffEmployee) return res.status(404).json({ error: "Employee record not found" });
      empId = staffEmployee._id;
    }
    
    if (!empId && name) {
      const emp = await Employee.findOne({ name });
      if (emp) empId = emp._id;
    }
    if (!empId) return res.status(400).json({ error: "employeeId or name required" });

    const now = new Date();
    const doc = await Attendance.findOneAndUpdate(
      { 
        employeeId: empId, 
        date: { $gte: startOfDay(now), $lte: endOfDay(now) }, 
        clockOut: { $exists: false } 
      },
      { $set: { clockOut: now } },
      { new: true }
    );
    if (!doc) return res.status(404).json({ error: "No open clock-in found for today" });
    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Import Attendance
router.post("/import", authenticate, isAdmin, upload.single("file"), async (req, res) => {
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

        let employee = null;
        if (EmployeeID) {
          const isObjectId = mongoose.Types.ObjectId.isValid(EmployeeID);
          employee = await Employee.findOne({ 
            $or: [
              { employeeId: EmployeeID }, 
              ...(isObjectId ? [{ _id: EmployeeID }] : [])
            ] 
          });
        }
        
        if (!employee && Name) {
          employee = await Employee.findOne({ name: new RegExp(`^${Name}$`, "i") });
        }

        if (!employee) {
          results.errors.push(`Employee not found: ${Name || EmployeeID}`);
          continue;
        }

        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
          results.errors.push(`Invalid date for ${Name}: ${dateStr}`);
          continue;
        }

        const cin = ClockIn ? new Date(`${dateStr} ${ClockIn}`) : null;
        const cout = ClockOut ? new Date(`${dateStr} ${ClockOut}`) : null;

        const filter = {
          employeeId: employee._id,
          date: {
            $gte: new Date(new Date(date).setHours(0, 0, 0, 0)),
            $lte: new Date(new Date(date).setHours(23, 59, 59, 999))
          }
        };

        const update = {
          employeeId: employee._id,
          name: employee.name,
          date: new Date(dateStr),
          clockIn: cin,
          clockOut: cout,
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

router.get("/sample-template", authenticate, isAdmin, (req, res) => {
  const format = req.query.format === "csv" ? "csv" : "xlsx";
  const data = [
    {
      EmployeeID: "EMP001",
      Name: "John Doe",
      Date: "2024-03-20",
      ClockIn: "09:00 AM",
      ClockOut: "05:00 PM",
      Notes: "Regular shift"
    },
    {
      EmployeeID: "EMP002",
      Name: "Jane Smith",
      Date: "2024-03-20",
      ClockIn: "08:30 AM",
      ClockOut: "04:30 PM",
      Notes: "Early start"
    }
  ];
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Attendance");
  
  const filename = `attendance_sample.${format}`;
  const buf = XLSX.write(wb, { type: "buffer", bookType: format });
  
  res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
  if (format === "csv") {
    res.setHeader("Content-Type", "text/csv");
  } else {
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  }
  res.send(buf);
});

// Manual add (admin only)
router.post("/manual", authenticate, isAdmin, async (req, res) => {
  try {
    const { employeeId, name, date, clockIn, clockOut, notes } = req.body || {};
    if (!employeeId && !name) return res.status(400).json({ error: "employeeId or name required" });
    const doc = await Attendance.create({
      employeeId,
      name,
      date: date ? new Date(date) : new Date(),
      clockIn: clockIn ? new Date(clockIn) : undefined,
      clockOut: clockOut ? new Date(clockOut) : undefined,
      notes: notes || "",
    });
    res.status(201).json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// List records (optional filters)
router.get("/records", authenticate, async (req, res) => {
  try {
    const { from, to, employeeId } = req.query;
    const filter = {};
    
    // Staff can only see their own records
    if (req.user.role !== 'admin') {
      const staffEmployee = await Employee.findOne({ email: req.user.email }).lean();
      if (!staffEmployee) return res.status(404).json({ error: "Employee record not found" });
      filter.employeeId = staffEmployee._id;
      // Ignore provided employeeId for staff
    } else if (employeeId) {
      // Admins can filter by employeeId
      filter.employeeId = employeeId;
    }
    
    if (from || to) filter.date = { $gte: from ? new Date(String(from)) : startOfDay(), $lte: to ? new Date(String(to)) : endOfDay() };
    const items = await Attendance.find(filter).sort({ date: -1 }).lean();
    res.json(items);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
