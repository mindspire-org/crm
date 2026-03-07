export interface ModuleContent {
  id: string;
  title: string;
  content: string;
  description?: string;
  category: "Hospital" | "Lab" | "Pharmacy" | "Clinic" | "General";
}

export const HMS_MODULES: ModuleContent[] = [
  // Hospital
  { id: "opd", category: "Hospital", title: "OPD", description: "Outpatient Department Management", content: "Comprehensive Outpatient Department management including registration, vitals, and physician notes." },
  { id: "ipd", category: "Hospital", title: "IPD", description: "Inpatient Department Management", content: "Inpatient Department management for admissions, ward tracking, and discharge summaries." },
  { id: "ot", category: "Hospital", title: "OT", description: "Operation Theater Management", content: "Operation Theater scheduling, checklist, and procedure documentation." },
  { id: "emergency", category: "Hospital", title: "Emergency", description: "Emergency & Triage Management", content: "Fast-track emergency room documentation and triage management." },
  { id: "icu", category: "Hospital", title: "ICU", description: "Intensive Care Unit Management", content: "Intensive Care Unit monitoring and critical care documentation." },
  { id: "doctor_portal", category: "Hospital", title: "Doctor Portal", description: "Specialized Doctor Access", content: "Dedicated portal for doctors to view schedules, patient records, and write prescriptions." },
  { id: "nursery", category: "Hospital", title: "Nursery", description: "Neonatal Care Management", content: "Specialized module for neonatal care and nursery management." },

  // Lab
  { id: "laboratory", category: "Lab", title: "Laboratory", description: "Full Lab Information System", content: "Full laboratory information system for test ordering, result entry, and report generation." },
  { id: "diagnostics", category: "Lab", title: "Diagnostics", description: "Diagnostic Procedure Tracking", content: "Management of diagnostic procedures and result tracking." },
  { id: "lab_invoices", category: "Lab", title: "Lab Invoices", description: "Automated Lab Billing", content: "Automated billing for laboratory tests with pricing integration." },

  // Pharmacy
  { id: "pharmacy", category: "Pharmacy", title: "Pharmacy", description: "Pharmacy Inventory & POS", content: "Inventory management and point-of-sale for hospital pharmacy." },
  { id: "indoor_outdoor_pharmacy", category: "Pharmacy", title: "Indoor & Outdoor Pharmacy", description: "Dual Pharmacy Management", content: "Separate tracking for hospitalized patients and walk-in pharmacy sales." },

  // Clinic
  { id: "online_prescription", category: "Clinic", title: "Online Prescription + Chat App", description: "Telemedicine & Chat", content: "Telemedicine module with secure chat and digital prescription delivery." },
  { id: "patient_profile", category: "Clinic", title: "Patient Profile", description: "EHR & Patient History", content: "Comprehensive electronic health record (EHR) and patient history management." },
  { id: "emr_system", category: "Clinic", title: "EMR System", description: "Electronic Medical Records", content: "Unified Electronic Medical Record system for seamless clinical workflows." },

  // General/ERP
  { id: "networking", category: "General", title: "Networking", description: "IT Infrastructure", content: "Infrastructure and network setup for hospital-wide connectivity." },
  { id: "corporate", category: "General", title: "Corporate", description: "Panel & Insurance Management", content: "Management of corporate clients, panels, and insurance providers." },
  { id: "finance", category: "General", title: "Finance", description: "Accounts & Payroll", content: "Accounting, payroll, and financial reporting for the institution." },
  { id: "app_mobile", category: "General", title: "App (Mobile)", description: "Patient & Staff Mobile App", content: "Mobile application for patients and staff for easy access." },
  { id: "erp", category: "General", title: "ERP", description: "Hospital Admin ERP", content: "Enterprise Resource Planning for hospital administration and logistics." },
  { id: "tax_modules", category: "General", title: "Tax Modules (FBR)", description: "FBR Integration", content: "FBR integrated tax calculation and reporting modules." },
  { id: "staff_management", category: "General", title: "Staff Management", description: "HR & Attendance", content: "HR management, attendance, and performance tracking." },
  { id: "equipment_management", category: "General", title: "Equipment Management", description: "Biomedical Asset Tracking", content: "Biomedical equipment tracking and maintenance scheduling." },
  { id: "backup", category: "General", title: "Backup", description: "Data Disaster Recovery", content: "Automated data backup and disaster recovery solutions." },
  { id: "branding_custom", category: "General", title: "Branding Custom", description: "Whitelabel Solutions", content: "Customized branding for reports, invoices, and portals." },
  { id: "customized_dashboard", category: "General", title: "Customized Dashboard", description: "Real-time Analytics", content: "User-specific dashboards with real-time analytics and KPIs." },
  { id: "multiple_layout_mode", category: "General", title: "Multiple Layout Mode", description: "UI Customization", content: "Choice of UI layouts (Dark/Light/Compact) for user preference." },
  { id: "social_media_creation", category: "General", title: "Social Media Creation", description: "Social Media Integration", content: "Integrated tools for institutional social media management." }
];

export const FULL_PROPOSAL_TEMPLATE = `
<div style="text-align:center; margin-bottom:30px;">
  <h1 style="font-size:28px; font-weight:bold; color:#1e3a8a;">HOSPITAL MANAGEMENT SYSTEM</h1>
  <p style="font-size:18px; color:#666;">Proposal for Hospital Digitization</p>
</div>

<p>This Agreement is entered into between HEALTHSPIRE and {{client}} for provision implementation and ongoing support of the Hospital Management Software Offline as outlined in this document.</p>

<h3 style="font-weight:bold; text-decoration:underline; color:#1e3a8a; margin-top:20px;">MODULES</h3>
<ul>
  <li>OPD/ER Prescription Slips</li>
  <li>Consultants' Invoices</li>
  <li>Lab Invoices</li>
  <li>Radiology Invoices</li>
  <li>Procedure Invoices/Bill</li>
</ul>

<p>The HEALTHSPIRE is selling its Hospital Management Software Offline to {{client}}. The total price is PKR {{total}}.</p>

<h3 style="font-weight:bold; text-decoration:underline; color:#1e3a8a; margin-top:20px;">TIME LINE</h3>
<p>The Company will deliver and fully install the Hospital Management Software Offline at {{client}} within 25 working days from the date of this agreement.</p>

<h3 style="font-weight:bold; text-decoration:underline; color:#1e3a8a; margin-top:20px;">1. OPD/ER Prescription Slips</h3>
<p>This module streamlines outpatient and emergency encounters by generating digital prescription slips. It captures patient vitals, clinical notes, and medication orders in real-time. By automating the documentation process, it ensures legible, accurate instructions for patients while maintaining a searchable electronic history for future follow-ups and continuity of care.</p>

<h3 style="font-weight:bold; text-decoration:underline; color:#1e3a8a; margin-top:20px;">2. Consultants' Invoices</h3>
<p>Dedicated to managing professional fees, this module automates the billing process for specialist consultations. It tracks visit types, duration, and specific consultant rates to generate accurate invoices. The system ensures seamless financial reconciliation between the hospital and visiting doctors while providing patients with clear, itemized breakdowns of professional charges.</p>

<h3 style="font-weight:bold; text-decoration:underline; color:#1e3a8a; margin-top:20px;">3. Lab Invoices</h3>
<p>This focused billing component generates precise invoices for clinical laboratory tests. It pulls data directly from test orders to calculate costs based on the hospital's price list, including any applicable discounts or insurance co-pays. The module ensures financial transparency and accelerates the checkout process for patients undergoing diagnostic testing.</p>

<h3 style="font-weight:bold; text-decoration:underline; color:#1e3a8a; margin-top:20px;">4. Radiology Invoices</h3>
<p>Designed specifically for imaging services, this module handles billing for X-rays, MRIs, CT scans, and ultrasounds. It automatically links procedure codes to departmental pricing, ensuring that every scan is accurately billed. The system manages complex diagnostic pricing and provides patients with professional, itemized receipts for their imaging appointments.</p>

<h3 style="font-weight:bold; text-decoration:underline; color:#1e3a8a; margin-top:20px;">5. Procedure Invoices/Bill</h3>
<p>This module manages the financial documentation for medical procedures, ranging from minor dressings to complex surgeries. It aggregates costs for the procedure itself, equipment usage, and facility fees into a single, comprehensive bill. This ensures all surgical or clinical interventions are captured accurately for revenue cycle management and patient clarity.</p>

<div style="margin-top:30px; padding:15px; border:1px solid #e5e7eb; background-color:#f9fafb;">
  <p><strong>Note:</strong> Health Spire (Pvt) Ltd is bound to provide all the mention software modules only other than these modules will be deal separately.</p>
</div>
`;
