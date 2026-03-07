import Account from "../models/Account.js";

const standardCOA = [
  // ASSETS
  { code: "1000", name: "Cash and Cash Equivalents", type: "asset" },
  { code: "1010", name: "Petty Cash", type: "asset", parentCode: "1000" },
  { code: "1020", name: "Bank Account (PKR)", type: "asset", parentCode: "1000" },
  { code: "1030", name: "Bank Account (USD)", type: "asset", parentCode: "1000" },
  { code: "1100", name: "Accounts Receivable (A/R)", type: "asset" },
  { code: "1110", name: "Allowance for Doubtful Accounts", type: "asset", parentCode: "1100" },
  { code: "1200", name: "Undeposited Funds", type: "asset" },
  { code: "1300", name: "Prepaid Expenses", type: "asset" },
  { code: "1400", name: "Other Current Assets", type: "asset" },
  { code: "1500", name: "Fixed Assets", type: "asset" },
  { code: "1510", name: "Computer Equipment", type: "asset", parentCode: "1500" },
  { code: "1520", name: "Office Furniture", type: "asset", parentCode: "1500" },
  { code: "1530", name: "Accumulated Depreciation", type: "asset", parentCode: "1500" },

  // LIABILITIES
  { code: "2000", name: "Accounts Payable (A/P)", type: "liability" },
  { code: "2100", name: "Credit Cards", type: "liability" },
  { code: "2110", name: "Credit Card - Main", type: "liability", parentCode: "2100" },
  { code: "2200", name: "Taxes Payable", type: "liability" },
  { code: "2210", name: "Sales Tax Payable", type: "liability", parentCode: "2200" },
  { code: "2220", name: "Income Tax Payable", type: "liability", parentCode: "2200" },
  { code: "2300", name: "Payroll Liabilities", type: "liability" },
  { code: "2310", name: "Salaries Payable", type: "liability", parentCode: "2300" },
  { code: "2320", name: "Withholding Tax Payable", type: "liability", parentCode: "2300" },
  { code: "2400", name: "Unearned Revenue", type: "liability" },
  { code: "2500", name: "Other Current Liabilities", type: "liability" },

  // EQUITY
  { code: "3000", name: "Owner's Equity", type: "equity" },
  { code: "3100", name: "Retained Earnings", type: "equity" },
  { code: "3200", name: "Opening Balance Equity", type: "equity" },

  // REVENUE
  { code: "4000", name: "Revenue", type: "revenue" },
  { code: "4010", name: "Service Revenue", type: "revenue", parentCode: "4000" },
  { code: "4020", name: "Product Sales", type: "revenue", parentCode: "4000" },
  { code: "4030", name: "Discounts / Credits", type: "revenue", parentCode: "4000" },
  { code: "4200", name: "Other Income", type: "revenue" },
  { code: "4210", name: "Interest Income", type: "revenue", parentCode: "4200" },

  // EXPENSES
  { code: "5000", name: "Cost of Goods Sold", type: "expense" },
  { code: "5100", name: "COGS - Materials", type: "expense", parentCode: "5000" },
  { code: "5200", name: "COGS - Subcontractors", type: "expense", parentCode: "5000" },

  { code: "6000", name: "Operating Expenses", type: "expense" },
  { code: "6010", name: "Rent or Lease", type: "expense", parentCode: "6000" },
  { code: "6020", name: "Payroll Expenses", type: "expense", parentCode: "6000" },
  { code: "6021", name: "Salaries and Wages", type: "expense", parentCode: "6020" },
  { code: "6022", name: "Allowances", type: "expense", parentCode: "6020" },
  { code: "6023", name: "Bonuses", type: "expense", parentCode: "6020" },
  { code: "6024", name: "Employer Taxes", type: "expense", parentCode: "6020" },
  { code: "6030", name: "Utilities", type: "expense", parentCode: "6000" },
  { code: "6040", name: "Internet and Software Subscriptions", type: "expense", parentCode: "6000" },
  { code: "6050", name: "Marketing and Advertising", type: "expense", parentCode: "6000" },
  { code: "6060", name: "Office Supplies", type: "expense", parentCode: "6000" },
  { code: "6070", name: "Travel and Meals", type: "expense", parentCode: "6000" },
  { code: "6080", name: "Bank Service Charges", type: "expense", parentCode: "6000" },
  { code: "6090", name: "Professional Fees", type: "expense", parentCode: "6000" },
  { code: "6100", name: "Commissions Expense", type: "expense", parentCode: "6000" },
  { code: "6110", name: "Repairs and Maintenance", type: "expense", parentCode: "6000" },
  { code: "6120", name: "Depreciation Expense", type: "expense", parentCode: "6000" },
  { code: "7000", name: "Taxes and Licenses", type: "expense" },
  { code: "7010", name: "Taxes and Licenses", type: "expense", parentCode: "7000" },
];

export async function seedCOA() {
  console.log("Seeding Chart of Accounts...");
  for (const item of standardCOA) {
    try {
      const existing = await Account.findOne({ code: item.code });
      if (!existing) {
        await Account.create(item);
        console.log(`Created account: ${item.code} - ${item.name}`);
      }
    } catch (error) {
      console.error(`Error seeding account ${item.code}:`, error.message);
    }
  }
  console.log("COA seeding complete.");
}
