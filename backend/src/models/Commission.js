import mongoose from "mongoose";

const CommissionSchema = new mongoose.Schema(
  {
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: "Lead", required: true },
    leadName: { type: String, required: true },
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
    employeeName: { type: String, required: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client" },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: "Invoice" },
    saleAmount: { type: Number, required: true, default: 0 },
    commissionRate: { type: Number, required: true, default: 0.05 }, // 5%
    commissionAmount: { type: Number, required: true, default: 0 },
    status: { 
      type: String, 
      enum: ["pending", "approved", "paid", "cancelled"], 
      default: "approved" 
    },
    approvedAt: { type: Date },
    paidAt: { type: Date },
    journalEntryId: { type: mongoose.Schema.Types.ObjectId, ref: "JournalEntry" },
    period: { type: String }, // YYYY-MM for payroll grouping
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

CommissionSchema.index({ employeeId: 1, status: 1 });
CommissionSchema.index({ period: 1 });
CommissionSchema.index({ leadId: 1 });
CommissionSchema.index({ createdAt: -1 });

const Commission = mongoose.models.Commission || mongoose.model("Commission", CommissionSchema);
export default Commission;
