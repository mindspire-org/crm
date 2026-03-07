import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown } from "lucide-react";

const teamMembers = [
  {
    id: 1,
    name: "Sarah Johnson",
    role: "Sales Lead",
    initials: "SJ",
    performance: 92,
    trend: "up",
    deals: 24,
    revenue: "$245,000",
  },
  {
    id: 2,
    name: "Michael Chen",
    role: "Account Executive",
    initials: "MC",
    performance: 85,
    trend: "up",
    deals: 18,
    revenue: "$178,500",
  },
  {
    id: 3,
    name: "Emily Davis",
    role: "Sales Rep",
    initials: "ED",
    performance: 78,
    trend: "down",
    deals: 15,
    revenue: "$125,000",
  },
  {
    id: 4,
    name: "Robert Wilson",
    role: "Sales Rep",
    initials: "RW",
    performance: 88,
    trend: "up",
    deals: 21,
    revenue: "$198,750",
  },
];

export function TeamPerformance() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Team Performance</CardTitle>
        <p className="text-sm text-muted-foreground">
          Sales team metrics this quarter
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-5">
          {teamMembers.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <Avatar className="w-10 h-10">
                <AvatarFallback className="bg-gradient-to-br from-primary to-indigo text-primary-foreground text-sm font-semibold">
                  {member.initials}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <p className="font-medium text-sm">{member.name}</p>
                    <p className="text-xs text-muted-foreground">{member.role}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {member.trend === "up" ? (
                      <TrendingUp className="w-4 h-4 text-success" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-destructive" />
                    )}
                    <span className="text-sm font-semibold">{member.performance}%</span>
                  </div>
                </div>
                
                <Progress 
                  value={member.performance} 
                  className="h-1.5"
                />
                
                <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                  <span>{member.deals} deals closed</span>
                  <span className="font-medium text-foreground">{member.revenue}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
