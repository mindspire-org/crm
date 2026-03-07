import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Mail, Phone } from "lucide-react";

const leads = [
  {
    id: 1,
    name: "Sarah Johnson",
    company: "Tech Solutions Inc",
    email: "sarah@techsolutions.com",
    status: "hot",
    value: "$45,000",
    initials: "SJ",
    color: "from-chart-1 to-chart-2",
  },
  {
    id: 2,
    name: "Michael Chen",
    company: "Digital Dynamics",
    email: "m.chen@digitaldyn.com",
    status: "warm",
    value: "$28,500",
    initials: "MC",
    color: "from-chart-3 to-chart-4",
  },
  {
    id: 3,
    name: "Emily Davis",
    company: "Growth Partners",
    email: "emily@growthpartners.io",
    status: "new",
    value: "$32,000",
    initials: "ED",
    color: "from-chart-2 to-chart-3",
  },
  {
    id: 4,
    name: "Robert Wilson",
    company: "Innovate Labs",
    email: "rwilson@innovatelabs.co",
    status: "cold",
    value: "$18,750",
    initials: "RW",
    color: "from-chart-4 to-chart-5",
  },
];

const statusColors = {
  hot: "destructive",
  warm: "warning",
  new: "default",
  cold: "secondary",
} as const;

export function RecentLeads() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg font-semibold">Recent Leads</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Latest prospects in pipeline
          </p>
        </div>
        <Button variant="outline" size="sm">
          View All
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {leads.map((lead) => (
            <div
              key={lead.id}
              className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarFallback
                    className={`bg-gradient-to-br ${lead.color} text-primary-foreground text-sm font-semibold`}
                  >
                    {lead.initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-sm">{lead.name}</p>
                  <p className="text-xs text-muted-foreground">{lead.company}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={statusColors[lead.status]} className="capitalize">
                  {lead.status}
                </Badge>
                <span className="text-sm font-semibold text-foreground">
                  {lead.value}
                </span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon-sm">
                    <Mail className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon-sm">
                    <Phone className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
