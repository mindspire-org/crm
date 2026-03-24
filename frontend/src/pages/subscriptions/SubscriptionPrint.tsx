import { useRef, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { HealthspirePrintTemplate } from "@/components/print/HealthspirePrintTemplate";
import { useSettings } from "@/hooks/useSettings";

export default function SubscriptionPrint() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const pdfTargetRef = useRef<HTMLDivElement | null>(null);

  // Get data from location state or fetch if missing
  const data = location.state?.data;
  const type = location.state?.type || "OVERVIEW"; // OVERVIEW, HISTORY

  useEffect(() => {
    if (!data) {
      // If no data, we might need to fetch it, but for now let's just go back
      // or show an error. The parent should pass the data.
      return;
    }

    const t = window.setTimeout(() => {
      window.print();
    }, 500);
    
    const onAfterPrint = () => {
      navigate(-1);
    };

    window.addEventListener("afterprint", onAfterPrint);
    return () => {
      window.removeEventListener("afterprint", onAfterPrint);
      window.clearTimeout(t);
    };
  }, [data, navigate]);

  if (!data) return <div className="p-8 text-center">No data to print</div>;

  const brand = {
    name: (settings as any)?.company?.name || "HealthSpire",
    address: (settings as any)?.company?.address || "761/D2 Shah Jelani Rd Township Lahore",
    email: (settings as any)?.company?.email || "info@healthspire.org",
    phone: (settings as any)?.company?.phone || "+92 312 7231875",
    website: (settings as any)?.company?.website || "www.healthspire.org",
    logoSrc: (settings as any)?.company?.logo || "/HealthSpire%20logo.png",
  };

  const items = type === "OVERVIEW" ? [
    {
      description: `Subscription: ${data.name || 'N/A'}\nPlan: ${data.planName || 'N/A'}\nStatus: ${data.status}\nNext Billing: ${data.nextBillingDate ? new Date(data.nextBillingDate).toLocaleDateString() : 'N/A'}`,
      qty: 1,
      price: data.amount || 0,
      total: data.amount || 0
    }
  ] : (data.history || []).map((h: any) => ({
    description: `${h.event || 'Event'}\n${h.notes || ''}`,
    qty: 1,
    price: h.amount || 0,
    total: h.amount || 0
  }));

  const totals = [
    { label: "Total Amount", value: `${(data.amount || 0).toLocaleString()} pkr`, bold: true }
  ];

  return (
    <div className="bg-white min-h-screen">
       <HealthspirePrintTemplate
        ref={pdfTargetRef}
        title={type === "OVERVIEW" ? "SUBSCRIPTION OVERVIEW" : "SUBSCRIPTION HISTORY"}
        brand={brand}
        invoiceToLabel="CLIENT:"
        invoiceToValue={data.clientName || data.client?.name || "N/A"}
        numberLabel="Subscription #"
        numberValue={data.subscriptionNumber || data._id || "-"}
        dateLabel="Print Date"
        dateValue={new Date().toLocaleDateString()}
        items={items}
        paymentInformation={(settings as any)?.documents?.subscriptionTerms || ""}
        totals={totals}
      />
    </div>
  );
}
