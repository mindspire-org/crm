import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { MessagingProvider } from "@/contexts/MessagingContext";
import { Suspense, lazy } from "react";
import { canAccessPath, getCurrentUser } from "@/utils/roleAccess";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";

// Eagerly loaded: Layout and critical auth components
import AuthLayout from "./pages/auth/AuthLayout";
import NotFound from "./pages/NotFound";

// Lazy loaded: All page components
const Dashboard = lazy(() => import("./pages/Dashboard"));
const UserSettings = lazy(() => import("./pages/UserSettings"));
const ClientDashboard = lazy(() => import("./pages/dashboard/ClientDashboard"));
const TeamMemberDashboard = lazy(() => import("./pages/team-member/TeamMemberDashboard"));
const MarketerDashboard = lazy(() => import("./pages/marketer/MarketerDashboard"));
const ClientTickets = lazy(() => import("./pages/client/ClientTickets"));
const ClientTicketDetails = lazy(() => import("./pages/client/ClientTicketDetails"));
const ClientAnnouncements = lazy(() => import("./pages/client/ClientAnnouncements"));
const ClientMessages = lazy(() => import("./pages/client/ClientMessages.tsx"));
const ClientProjects = lazy(() => import("./pages/client/ClientProjects"));
const ClientInvoices = lazy(() => import("./pages/client/ClientInvoices"));
const ClientEstimates = lazy(() => import("./pages/client/ClientEstimates"));
const ClientProposals = lazy(() => import("./pages/client/ClientProposals"));
const ClientContracts = lazy(() => import("./pages/client/ClientContracts"));
const Events = lazy(() => import("./pages/events/Events"));
const Clients = lazy(() => import("./pages/clients/Clients"));
const ClientDetails = lazy(() => import("./pages/clients/ClientDetails"));
const PrimaryContact = lazy(() => import("./pages/clients/PrimaryContact"));
const Portfolio = lazy(() => import("./pages/Portfolio"));
const CrmDashboard = lazy(() => import("./pages/crm/CrmDashboard"));
const Leads = lazy(() => import("./pages/crm/Leads"));
const LeadDetails = lazy(() => import("./pages/crm/LeadDetails"));
const MyCommissions = lazy(() => import("./pages/crm/MyCommissions"));
const MetaAds = lazy(() => import("./pages/crm/MetaAds"));
const Contacts = lazy(() => import("./pages/crm/Contacts"));
const ContactProfile = lazy(() => import("./pages/crm/ContactProfile"));
const Companies = lazy(() => import("./pages/crm/Companies"));
const Pipeline = lazy(() => import("./pages/crm/Pipeline"));
const Employees = lazy(() => import("./pages/hrm/Employees"));
const EmployeeProfile = lazy(() => import("./pages/hrm/EmployeeProfile"));
const Attendance = lazy(() => import("./pages/hrm/Attendance"));
const Leave = lazy(() => import("./pages/hrm/Leave"));
const Payroll = lazy(() => import("./pages/hrm/Payroll"));
const HrmDashboard = lazy(() => import("./pages/hrm/HrmDashboard"));
const Departments = lazy(() => import("./pages/hrm/Departments"));
const Recruitment = lazy(() => import("./pages/hrm/Recruitment"));
const LeadAssignment = lazy(() => import("./pages/admin/LeadAssignment"));
const LeadApprovals = lazy(() => import("./pages/admin/LeadApprovals"));
const CommissionsPage = lazy(() => import("./pages/hrm/CommissionsPage"));
const Announcements = lazy(() => import("./pages/announcements/Announcements"));
const Backups = lazy(() => import("./pages/admin/Backups"));
const AddAnnouncement = lazy(() => import("./pages/announcements/AddAnnouncement"));
const AnnouncementView = lazy(() => import("./pages/announcements/AnnouncementView"));
const Subscriptions = lazy(() => import("./pages/subscriptions/Subscriptions"));
const SubscriptionDetails = lazy(() => import("./pages/subscriptions/SubscriptionDetails"));
const Messaging = lazy(() => import("./pages/messaging"));
const Orders = lazy(() => import("./pages/sales/Orders"));
const Store = lazy(() => import("./pages/sales/Store"));
const Checkout = lazy(() => import("./pages/sales/Checkout"));
const OrderDetailPage = lazy(() => import("./pages/sales/OrderDetailPage"));
const Payments = lazy(() => import("./pages/sales/Payments"));
const Items = lazy(() => import("./pages/sales/Items"));
const Contracts = lazy(() => import("./pages/sales/Contracts"));
const ContractDetail = lazy(() => import("./pages/sales/ContractDetail"));
const ContractPreview = lazy(() => import("./pages/sales/ContractPreview"));
const Expenses = lazy(() => import("./pages/sales/Expenses"));
const RecurringRevenue = lazy(() => import("./pages/sales/RecurringRevenue"));
const EstimateList = lazy(() => import("./pages/prospects/EstimateList"));
const EstimateDetail = lazy(() => import("./pages/prospects/EstimatePreview"));
const EstimateRequests = lazy(() => import("./pages/prospects/EstimateRequests"));
const EstimateForms = lazy(() => import("./pages/prospects/EstimateForms"));
const Proposals = lazy(() => import("./pages/prospects/Proposals"));
const ProposalDetail = lazy(() => import("./pages/prospects/ProposalDetail"));
const ManageUsers = lazy(() => import("./pages/user-management/ManageUsers"));
const RolesPermissions = lazy(() => import("./pages/user-management/RolesPermissions"));
const DeleteRequest = lazy(() => import("./pages/user-management/DeleteRequest"));
const InvoicesSummary = lazy(() => import("./pages/reports/sales/InvoicesSummary"));
const IncomeVsExpenses = lazy(() => import("./pages/reports/finance/IncomeVsExpenses"));
const ExpensesSummary = lazy(() => import("./pages/reports/finance/ExpensesSummary"));
const PaymentsSummary = lazy(() => import("./pages/reports/finance/PaymentsSummary"));
const TimesheetsReport = lazy(() => import("./pages/reports/timesheets/Timesheets"));
const ProjectsTeamMembers = lazy(() => import("./pages/reports/projects/TeamMembers"));
const ProjectsClients = lazy(() => import("./pages/reports/projects/Clients"));
const LeadsConversions = lazy(() => import("./pages/reports/leads/Conversions"));
const LeadsTeamMembers = lazy(() => import("./pages/reports/leads/TeamMembers"));
const TicketsStatistics = lazy(() => import("./pages/reports/tickets/Statistics"));
const ReportsDashboard = lazy(() => import("./pages/reports/ReportsDashboard"));
const Tickets = lazy(() => import("./pages/tickets/Tickets"));
const TicketDetails = lazy(() => import("./pages/tickets/TicketDetails"));
const Files = lazy(() => import("./pages/files/Files"));
const Notes = lazy(() => import("./pages/notes/Notes"));
const MyNotes = lazy(() => import("./pages/notes/MyNotes"));
const HelpSupportHelp = lazy(() => import("./pages/help-support/Help"));
const HelpSupportArticles = lazy(() => import("./pages/help-support/Articles"));
const HelpSupportCategories = lazy(() => import("./pages/help-support/Categories"));
const KnowledgeBaseArticles = lazy(() => import("./pages/help-support/knowledge-base/Articles"));
const KnowledgeBaseCategories = lazy(() => import("./pages/help-support/knowledge-base/Categories"));
const CalendarPage = lazy(() => import("./pages/calendar/Calendar"));
const Overview = lazy(() => import("./pages/projects/Overview"));
const Timeline = lazy(() => import("./pages/projects/Timeline"));
const ProjectOverviewPage = lazy(() => import("./pages/projects/ProjectOverview"));
const Chat = lazy(() => import("./pages/messages/Chat"));
const InvoiceList = lazy(() => import("./pages/invoices/InvoiceList"));
const InvoiceDetailPage = lazy(() => import("./pages/invoices/InvoiceDetailPage"));
const InvoicePreview = lazy(() => import("./pages/invoices/InvoicePreview"));
const EstimatePreview = lazy(() => import("./pages/prospects/EstimatePreview"));
const Tasks = lazy(() => import("./pages/tasks/Tasks"));
const TaskDetails = lazy(() => import("./pages/tasks/TaskDetails"));
const TeamActivity = lazy(() => import("./pages/tasks/TeamActivity"));
const Appointments = lazy(() => import("./pages/appointments/Appointments"));
const AppointmentsBook = lazy(() => import("./pages/public/AppointmentsBook"));
const SettingsPage = lazy(() => import("./pages/settings/Settings"));
const ProfileSettings = lazy(() => import("./pages/profile/ProfileSettings"));
const ResetPasswordPage = lazy(() => import("./pages/auth/ResetPassword"));
const Vouchers = lazy(() => import("./pages/accounting/Vouchers"));
const AccountingDashboard = lazy(() => import("./pages/accounting/AccountingDashboard"));
const Journal = lazy(() => import("./pages/accounting/Journal"));
const Accounts = lazy(() => import("./pages/accounting/Accounts"));
const GeneralLedger = lazy(() => import("./pages/accounting/GeneralLedger"));
const TrialBalance = lazy(() => import("./pages/accounting/TrialBalance"));
const IncomeStatement = lazy(() => import("./pages/accounting/IncomeStatement"));
const BalanceSheet = lazy(() => import("./pages/accounting/BalanceSheet"));
const AccountingSettings = lazy(() => import("./pages/accounting/AccountingSettings"));
const AccountingPeriods = lazy(() => import("./pages/accounting/AccountingPeriods"));
const SubscriptionsRecurring = lazy(() => import("./pages/accounting/SubscriptionsRecurring"));
const ClientLedger = lazy(() => import("./pages/client/ClientLedger"));
const MySalaryLedger = lazy(() => import("./pages/hrm/MySalaryLedger"));
const VendorLedger = lazy(() => import("./pages/accounting/VendorLedger"));
const Vendors = lazy(() => import("./pages/accounting/Vendors"));
const Recovery = lazy(() => import("./pages/accounting/Recovery"));

const queryClient = new QueryClient();

const getStoredAuthUser = (): { id?: string; _id?: string; email?: string; role?: string; permissions?: string[] } | null => {
  const raw = localStorage.getItem("auth_user") || sessionStorage.getItem("auth_user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const ContractPreviewAccess = () => {
  const hasToken = Boolean(localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token"));
  const location = useLocation();
  const sp = new URLSearchParams(location.search || "");
  const isPrintMode = sp.get("print") === "1";
  const isPdfMode = sp.get("mode") === "pdf";
  return hasToken || isPrintMode || isPdfMode
    ? <ContractPreview />
    : <Navigate to={`/auth?returnTo=${encodeURIComponent(location.pathname + location.search)}`} replace />;
};

const normalizePerms = (p?: any): Set<string> => {
  const out = new Set<string>();
  if (Array.isArray(p)) {
    for (const x of p) {
      const s = String(x || "").trim();
      if (s) out.add(s);
    }
  }
  return out;
};

const getModuleFromPath = (pathname: string): string => {
  if (pathname.startsWith("/crm")) return "crm";
  if (pathname.startsWith("/hrm")) return "hrm";
  if (pathname.startsWith("/projects")) return "projects";
  if (pathname.startsWith("/prospects")) return "prospects";
  if (pathname.startsWith("/sales") || pathname.startsWith("/invoices")) return "sales";
  if (pathname.startsWith("/reports")) return "reports";
  if (pathname.startsWith("/accounting")) return "accounting";
  if (pathname.startsWith("/tickets")) return "tickets";
  if (pathname.startsWith("/events")) return "events";
  if (pathname.startsWith("/clients")) return "clients";
  if (pathname.startsWith("/tasks")) return "tasks";
  if (pathname.startsWith("/messages") || pathname.startsWith("/messaging") || pathname.startsWith("/email") || pathname.startsWith("/calls")) return "messages";
  if (pathname.startsWith("/announcements")) return "announcements";
  if (pathname.startsWith("/subscriptions")) return "subscriptions";
  if (pathname.startsWith("/calendar")) return "calendar";
  if (pathname.startsWith("/notes")) return "notes";
  if (pathname.startsWith("/files")) return "files";
  if (pathname.startsWith("/profile")) return "profile";
  if (pathname.startsWith("/settings")) return "settings";
  if (pathname.startsWith("/user-management")) return "user_management";
  if (pathname.startsWith("/client")) return "client_portal";
  if (pathname === "/") return "dashboard";
  return "other";
};

const RoleGuard = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const user = getCurrentUser();
  const role = String(user?.role || "").trim().toLowerCase();
  if (canAccessPath(location.pathname, user)) return <>{children}</>;
  if (role === "client") return <Navigate to="/client" replace />;
  return <Navigate to="/" replace />;
};

const InvoicePreviewAccess = () => {
  const hasToken = Boolean(localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token"));
  const location = useLocation();
  const sp = new URLSearchParams(location.search || "");
  const isPrintMode = sp.get("print") === "1";
  const isPdfMode = sp.get("mode") === "pdf";
  return hasToken || isPrintMode || isPdfMode
    ? <InvoicePreview />
    : <Navigate to={`/auth?returnTo=${encodeURIComponent(location.pathname + location.search)}`} replace />;
};

const EstimatePreviewAccess = () => {
  const hasToken = Boolean(localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token"));
  const location = useLocation();
  const sp = new URLSearchParams(location.search || "");
  const isPrintMode = sp.get("print") === "1";
  const isPdfMode = sp.get("mode") === "pdf";
  return hasToken || isPrintMode || isPdfMode
    ? <EstimatePreview />
    : <Navigate to={`/auth?returnTo=${encodeURIComponent(location.pathname + location.search)}`} replace />;
};

const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const hasToken = Boolean(localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token"));
  if (hasToken) return <>{children}</>;
  return <Navigate to={`/auth?returnTo=${encodeURIComponent(location.pathname + location.search)}`} replace />;
};

const DashboardByRole = () => {
  const user = getStoredAuthUser();
  const role = user?.role || "admin";
  
  switch (role) {
    case "client":
      return <ClientDashboard />;
    case "marketer":
      return <MarketerDashboard />;
    case "marketing_manager":
    case "marketing manager":
      return <CrmDashboard />;
    case "staff":
      return <TeamMemberDashboard />;
    default:
      return <Dashboard />;
  }
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <PWAInstallPrompt />
      <MessagingProvider>
        <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
          <Suspense fallback={<div className="flex h-screen w-full items-center justify-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>}>
          <Routes>
          {/* Public auth route */}
          <Route path="/auth" element={<AuthLayout />} />

          {/* Public password reset route */}
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Public/print-safe invoice preview */}
          <Route path="/invoices/:id/preview" element={<InvoicePreviewAccess />} />

          {/* Public/print-safe estimate preview */}
          <Route path="/prospects/estimates/:id/preview" element={<EstimatePreviewAccess />} />

          {/* Public/print-safe contract preview */}
          <Route path="/sales/contracts/:id/preview" element={<ContractPreviewAccess />} />

          {/* Public appointment booking form */}
          <Route path="/public/appointments/book" element={<AppointmentsBook />} />

          {/* Protected app */}
          <Route
            element={
              <RequireAuth>
                <RoleGuard>
                  <MainLayout />
                </RoleGuard>
              </RequireAuth>
            }
          >
            <Route path="/" element={<DashboardByRole />} />
            <Route path="/events" element={<Events />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/clients/:id" element={<ClientDetails />} />
            <Route path="/clients/:id/primary-contact" element={<PrimaryContact />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/tasks/:id" element={<TaskDetails />} />
            <Route
              path="/tasks/activity"
              element={getStoredAuthUser()?.role === "admin" ? <TeamActivity /> : <Navigate to="/" replace />}
            />
            {/* CRM Routes */}
            <Route path="/crm" element={<CrmDashboard />} />
            <Route path="/crm/leads" element={<Leads />} />
            <Route path="/crm/leads/:id" element={<LeadDetails />} />
            <Route path="/crm/meta-ads" element={<MetaAds />} />
            <Route path="/crm/commissions" element={<MyCommissions />} />
            <Route path="/crm/pipeline" element={<Pipeline />} />
            <Route path="/crm/contacts" element={<Contacts />} />
            <Route path="/crm/contacts/:id" element={<ContactProfile />} />
            <Route path="/crm/companies" element={<Companies />} />
            {/* HRM Routes */}
            <Route path="/hrm" element={getStoredAuthUser()?.role === "admin" ? <HrmDashboard /> : <Navigate to="/" replace />} />
            <Route path="/hrm/employees" element={getStoredAuthUser()?.role === "admin" ? <Employees /> : <Navigate to="/" replace />} />
            <Route path="/hrm/employees/:id" element={getStoredAuthUser()?.role === "admin" ? <EmployeeProfile /> : <Navigate to="/" replace />} />
            <Route path="/hrm/attendance" element={<Attendance />} />
            <Route path="/hrm/leaves" element={getStoredAuthUser()?.role === "admin" ? <Leave /> : <Navigate to="/" replace />} />
            <Route path="/hrm/payroll" element={getStoredAuthUser()?.role === "admin" ? <Payroll /> : <Navigate to="/" replace />} />
            <Route path="/hrm/departments" element={getStoredAuthUser()?.role === "admin" ? <Departments /> : <Navigate to="/" replace />} />
            <Route path="/hrm/recruitment" element={getStoredAuthUser()?.role === "admin" ? <Recruitment /> : <Navigate to="/" replace />} />
            <Route path="/hrm/commissions" element={getStoredAuthUser()?.role === "admin" ? <CommissionsPage /> : <Navigate to="/" replace />} />
            <Route path="/hrm/my-salary-ledger" element={<MySalaryLedger />} />
            {/* Project Routes */}
            <Route path="/projects" element={<Overview />} />
            <Route path="/projects/overview" element={<Overview />} />
            <Route path="/projects/overview/:id" element={<ProjectOverviewPage />} />
            <Route path="/projects/:id" element={<ProjectOverviewPage />} />
            <Route path="/projects/timeline" element={<Timeline />} />
            {/* Portfolio */}
            <Route path="/portfolio" element={<Portfolio />} />
            {/* Communication */}
            <Route path="/messages" element={<Messaging />} />
            <Route path="/email" element={<Chat />} />
            <Route path="/calls" element={<Chat />} />
            <Route path="/messaging" element={<Messaging />} />
            {/* General */}
            <Route path="/announcements" element={<Announcements />} />
            <Route
              path="/announcements/new"
              element={getStoredAuthUser()?.role === "admin" ? <AddAnnouncement /> : <Navigate to="/announcements" replace />}
            />
            <Route path="/announcements/:id" element={<AnnouncementView />} />
            <Route path="/subscriptions" element={<Subscriptions />} />
            <Route path="/subscriptions/:id" element={<SubscriptionDetails />} />
            <Route path="/orders" element={<Orders />} />
            {/* Alias route so Sidebar link /sales/orders resolves to the same Orders list */}
            <Route path="/sales" element={<Navigate to="/sales/orders" replace />} />
            <Route path="/sales/orders" element={<Orders />} />
            <Route path="/sales/orders/:id" element={<OrderDetailPage />} />
            <Route path="/sales/subscriptions" element={<SubscriptionsRecurring />} />
            <Route path="/sales/recurring" element={<RecurringRevenue />} />
            <Route path="/sales/store" element={<Store />} />
            <Route path="/sales/checkout" element={<Checkout />} />
            <Route path="/sales/payments" element={<Payments />} />
            <Route path="/sales/expenses" element={<Expenses />} />
            <Route path="/sales/items" element={<Items />} />
            <Route path="/sales/contracts" element={<Contracts />} />
            <Route path="/sales/contracts/:id" element={<ContractDetail />} />
            {/* Prospects */}
            <Route path="/prospects/estimates" element={<EstimateList />} />
            <Route path="/prospects/estimates/:id" element={<EstimateDetail />} />
            <Route path="/prospects/estimate-requests" element={<EstimateRequests />} />
            <Route path="/prospects/estimate-forms" element={<EstimateForms />} />
            <Route path="/prospects/proposals" element={<Proposals />} />
            <Route path="/prospects/proposals/:id" element={<ProposalDetail />} />
            {/* User Management */}
            <Route path="/user-management" element={<Navigate to="/user-management/users" replace />} />
            <Route path="/user-management/users" element={<ManageUsers />} />
            <Route path="/user-management/roles" element={<RolesPermissions />} />
            <Route path="/user-management/delete-request" element={<DeleteRequest />} />
            <Route path="/notes" element={<Notes />} />
            <Route path="/my-notes" element={<MyNotes />} />
            <Route path="/files" element={<Files />} />
            <Route path="/tickets" element={<Tickets />} />
            <Route path="/tickets/:id" element={<TicketDetails />} />
            <Route path="/calendar" element={<CalendarPage />} />
            {/* Help & Support */}
            <Route path="/help-support" element={<HelpSupportHelp />} />
            <Route path="/help-support/help" element={<HelpSupportHelp />} />
            <Route path="/help-support/articles" element={<HelpSupportArticles />} />
            <Route path="/help-support/categories" element={<HelpSupportCategories />} />
            <Route path="/help-support/knowledge-base/articles" element={<KnowledgeBaseArticles />} />
            <Route path="/help-support/knowledge-base/categories" element={<KnowledgeBaseCategories />} />
            {/* Invoices */}
            <Route path="/invoices" element={<InvoiceList />} />
            <Route path="/invoices/:id" element={<InvoiceDetailPage />} />

            {/* Appointments (Admin-only via RoleGuard/canAccessPath) */}
            <Route path="/appointments" element={<Appointments />} />
            {/* Reports */}
            <Route path="/reports" element={<ReportsDashboard />} />
            <Route path="/reports/sales/invoices-summary" element={<InvoicesSummary />} />
            <Route path="/reports/finance/income-vs-expenses" element={<IncomeVsExpenses />} />
            <Route path="/reports/finance/expenses-summary" element={<ExpensesSummary />} />
            <Route path="/reports/finance/payments-summary" element={<PaymentsSummary />} />
            <Route path="/reports/timesheets" element={<TimesheetsReport />} />
            <Route path="/reports/projects/team-members" element={<ProjectsTeamMembers />} />
            <Route path="/reports/projects/clients" element={<ProjectsClients />} />
            <Route path="/reports/leads/conversions" element={<LeadsConversions />} />
            <Route path="/reports/leads/team-members" element={<LeadsTeamMembers />} />
            <Route path="/reports/tickets/statistics" element={<TicketsStatistics />} />
            {/* Accounting */}
            <Route path="/accounting" element={<AccountingDashboard />} />
            <Route path="/accounting/accounts" element={<Accounts />} />
            <Route path="/accounting/vouchers" element={<Vouchers />} />
            <Route path="/accounting/journal" element={<Journal />} />
            <Route path="/accounting/ledger" element={<GeneralLedger />} />
            <Route path="/accounting/trial-balance" element={<TrialBalance />} />
            <Route path="/accounting/income-statement" element={<IncomeStatement />} />
            <Route path="/accounting/balance-sheet" element={<BalanceSheet />} />
            <Route path="/accounting/subscriptions" element={<SubscriptionsRecurring />} />
            <Route path="/accounting/recovery" element={<Recovery />} />
            <Route
              path="/accounting/vendors"
              element={getStoredAuthUser()?.role === "admin" ? <Vendors /> : <Navigate to="/" replace />}
            />
            <Route
              path="/accounting/vendor-ledger"
              element={getStoredAuthUser()?.role === "admin" ? <VendorLedger /> : <Navigate to="/" replace />}
            />
            <Route
              path="/accounting/settings"
              element={getStoredAuthUser()?.role === "admin" ? <AccountingSettings /> : <Navigate to="/" replace />}
            />
            <Route
              path="/accounting/periods"
              element={getStoredAuthUser()?.role === "admin" ? <AccountingPeriods /> : <Navigate to="/" replace />}
            />
            {/* Portals */}
            <Route path="/client" element={<ClientDashboard />} />
            <Route
              path="/client/projects"
              element={getStoredAuthUser()?.role === "client" ? <ClientProjects /> : <Navigate to="/" replace />}
            />
            <Route
              path="/client/invoices"
              element={getStoredAuthUser()?.role === "client" ? <ClientInvoices /> : <Navigate to="/" replace />}
            />
            <Route
              path="/client/estimates"
              element={getStoredAuthUser()?.role === "client" ? <ClientEstimates /> : <Navigate to="/" replace />}
            />
            <Route
              path="/client/proposals"
              element={getStoredAuthUser()?.role === "client" ? <ClientProposals /> : <Navigate to="/" replace />}
            />
            <Route
              path="/client/contracts"
              element={getStoredAuthUser()?.role === "client" ? <ClientContracts /> : <Navigate to="/" replace />}
            />
            <Route
              path="/client/ledger"
              element={getStoredAuthUser()?.role === "client" ? <ClientLedger /> : <Navigate to="/" replace />}
            />
            <Route path="/client/messages" element={<ClientMessages />} />
            <Route path="/client/announcements" element={<ClientAnnouncements />} />
            <Route path="/client/tickets" element={<ClientTickets />} />
            <Route path="/client/tickets/:id" element={<ClientTicketDetails />} />
            <Route path="/admin" element={<Dashboard />} />
            <Route 
              path="/admin/lead-approvals" 
              element={getStoredAuthUser()?.role === "admin" ? <LeadApprovals /> : <Navigate to="/" replace />} 
            />
            <Route 
              path="/admin/backups" 
              element={getStoredAuthUser()?.role === "admin" ? <Backups /> : <Navigate to="/" replace />} 
            />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/settings/:section" element={<SettingsPage />} />
            <Route path="/profile" element={<ProfileSettings />} />
            <Route path="/user-settings" element={<UserSettings />} />
          </Route>
          <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
        </BrowserRouter>
      </MessagingProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
