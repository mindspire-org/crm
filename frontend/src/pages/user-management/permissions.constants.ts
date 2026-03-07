export const PERMISSION_MODULES = [
  {
    id: "crm",
    label: "CRM",
    submodules: [
      { id: "leads", label: "Leads" },
      { id: "pipeline", label: "Pipeline" },
      { id: "prospects", label: "Prospects" },
    ],
  },
  {
    id: "sales",
    label: "Sales",
    submodules: [
      { id: "invoices", label: "Invoices" },
      { id: "payments", label: "Payments" },
      { id: "products", label: "Products" },
    ],
  },
  {
    id: "hrm",
    label: "HRM",
    submodules: [
      { id: "employees", label: "Employees" },
      { id: "payroll", label: "Payroll" },
      { id: "attendance", label: "Attendance" },
    ],
  },
  {
    id: "projects",
    label: "Projects",
    submodules: [
      { id: "list", label: "Project List" },
      { id: "tasks", label: "Tasks" },
      { id: "milestones", label: "Milestones" },
      { id: "files", label: "Files" },
    ],
  },
  {
    id: "finance",
    label: "Finance",
    submodules: [
      { id: "reports", label: "Reports" },
      { id: "expenses", label: "Expenses" },
    ],
  },
  {
    id: "system",
    label: "System",
    submodules: [
      { id: "users", label: "Users" },
      { id: "roles", label: "Roles" },
      { id: "settings", label: "Settings" },
    ],
  },
];

export const ACTIONS = [
  { id: "view", label: "View" },
  { id: "edit", label: "Edit" },
  { id: "delete", label: "Delete" },
];
