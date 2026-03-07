import { useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RefreshCw } from "lucide-react";
import RecurringRevenue from "@/pages/sales/RecurringRevenue";
import Subscriptions from "@/pages/subscriptions/Subscriptions";

export default function SubscriptionsRecurring() {
  const [tab, setTab] = useState<"dashboard" | "register">("dashboard");
  const title = useMemo(() => "Subscriptions & Recurring", []);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-xs text-muted-foreground">Accounting</div>
          <h1 className="mt-1 text-lg sm:text-xl font-semibold tracking-tight">{title}</h1>
          <div className="mt-1 text-sm text-muted-foreground">Manage renewals, recurring revenue, and billing runs.</div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList className="bg-muted/40">
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="register">Subscriptions Register</TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="mt-4">
              <RecurringRevenue />
            </TabsContent>

            <TabsContent value="register" className="mt-4">
              <Subscriptions />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
