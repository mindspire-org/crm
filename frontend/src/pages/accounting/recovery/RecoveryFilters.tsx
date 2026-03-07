import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";

export type RecoveryFilterState = {
  q: string;
  status: string;
  ownerUserId: string;
  overdueOnly: boolean;
  nextFollowUpFrom: string;
  nextFollowUpTo: string;
};

export function RecoveryFilters(props: {
  value: RecoveryFilterState;
  ownerOptions: Array<{ id: string; label: string }>;
  loading?: boolean;
  onChange: (next: RecoveryFilterState) => void;
  onApply: () => void;
  onClear: () => void;
}) {
  const { value, ownerOptions, onChange, onApply, onClear, loading } = props;

  return (
    <Card className="shadow-xl bg-card/40 backdrop-blur-xl hover:shadow-2xl transition-all duration-500 rounded-3xl border border-white/10 dark:border-white/5">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Search className="w-5 h-5 text-indigo-600" />
          Filters
          <Badge className="ml-auto bg-indigo-100 text-indigo-800">Live</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-4">
            <Label className="text-sm font-medium">Search (invoice # / client / project)</Label>
            <Input value={value.q} onChange={(e) => onChange({ ...value, q: e.target.value })} placeholder="Type to search..." />
          </div>

          <div className="md:col-span-3">
            <Label className="text-sm font-medium">Recovery status</Label>
            <Select value={value.status} onValueChange={(v) => onChange({ ...value, status: v })}>
              <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="PartiallyPaid">Partially Paid</SelectItem>
                <SelectItem value="Overdue">Overdue</SelectItem>
                <SelectItem value="InFollowUp">In Follow-up</SelectItem>
                <SelectItem value="PaymentPromised">Payment Promised</SelectItem>
                <SelectItem value="Dispute">Dispute</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-3">
            <Label className="text-sm font-medium">Recovery owner</Label>
            <Select value={value.ownerUserId || "__all__"} onValueChange={(v) => onChange({ ...value, ownerUserId: v === "__all__" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All</SelectItem>
                {ownerOptions.map((o) => (
                  <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-2">
            <Label className="text-sm font-medium">Overdue only</Label>
            <Select value={value.overdueOnly ? "1" : "0"} onValueChange={(v) => onChange({ ...value, overdueOnly: v === "1" })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0">No</SelectItem>
                <SelectItem value="1">Yes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-3">
            <Label className="text-sm font-medium">Follow-up from</Label>
            <DatePicker value={value.nextFollowUpFrom} onChange={(v) => onChange({ ...value, nextFollowUpFrom: v })} placeholder="From" />
          </div>
          <div className="md:col-span-3">
            <Label className="text-sm font-medium">Follow-up to</Label>
            <DatePicker value={value.nextFollowUpTo} onChange={(v) => onChange({ ...value, nextFollowUpTo: v })} placeholder="To" />
          </div>

          <div className="md:col-span-6 flex justify-end gap-2">
            <Button onClick={onApply} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700">
              <Search className="w-4 h-4 mr-2" /> Apply
            </Button>
            <Button variant="outline" onClick={onClear}>
              Clear
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
