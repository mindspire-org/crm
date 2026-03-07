import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, MoreHorizontal, DollarSign, Calendar, User } from "lucide-react";
import { cn } from "@/lib/utils";

type Deal = {
  id: number;
  title: string;
  company: string;
  value: string;
  probability: number;
  owner: { name: string; initials: string };
  dueDate: string;
  tags: string[];
};

type Stage = {
  id: string;
  title: string;
  color: string;
  deals: Deal[];
  totalValue: string;
};

const stages: Stage[] = [
  {
    id: "qualified",
    title: "Qualified",
    color: "bg-chart-1",
    totalValue: "$125,000",
    deals: [
      {
        id: 1,
        title: "Enterprise License",
        company: "Tech Solutions Inc",
        value: "$45,000",
        probability: 60,
        owner: { name: "Sarah J", initials: "SJ" },
        dueDate: "Dec 15",
        tags: ["Enterprise", "Priority"],
      },
      {
        id: 2,
        title: "Cloud Migration",
        company: "Digital Dynamics",
        value: "$32,000",
        probability: 40,
        owner: { name: "Michael C", initials: "MC" },
        dueDate: "Dec 20",
        tags: ["Cloud"],
      },
    ],
  },
  {
    id: "proposal",
    title: "Proposal",
    color: "bg-chart-2",
    totalValue: "$98,500",
    deals: [
      {
        id: 3,
        title: "Annual Contract",
        company: "Growth Partners",
        value: "$28,500",
        probability: 70,
        owner: { name: "Emily D", initials: "ED" },
        dueDate: "Dec 10",
        tags: ["Annual"],
      },
      {
        id: 4,
        title: "Platform Integration",
        company: "Innovate Labs",
        value: "$52,000",
        probability: 55,
        owner: { name: "Robert W", initials: "RW" },
        dueDate: "Dec 18",
        tags: ["Integration", "High Value"],
      },
    ],
  },
  {
    id: "negotiation",
    title: "Negotiation",
    color: "bg-chart-3",
    totalValue: "$156,000",
    deals: [
      {
        id: 5,
        title: "Multi-Year Deal",
        company: "Future Vision",
        value: "$96,000",
        probability: 80,
        owner: { name: "Lisa A", initials: "LA" },
        dueDate: "Dec 8",
        tags: ["Multi-Year", "Strategic"],
      },
      {
        id: 6,
        title: "Expansion Package",
        company: "Smart Systems",
        value: "$60,000",
        probability: 75,
        owner: { name: "David M", initials: "DM" },
        dueDate: "Dec 12",
        tags: ["Expansion"],
      },
    ],
  },
  {
    id: "closing",
    title: "Closing",
    color: "bg-chart-4",
    totalValue: "$78,000",
    deals: [
      {
        id: 7,
        title: "Premium Support",
        company: "Alpha Corp",
        value: "$38,000",
        probability: 90,
        owner: { name: "Sarah J", initials: "SJ" },
        dueDate: "Dec 5",
        tags: ["Support", "Closing Soon"],
      },
      {
        id: 8,
        title: "Starter Package",
        company: "Beta LLC",
        value: "$40,000",
        probability: 95,
        owner: { name: "Michael C", initials: "MC" },
        dueDate: "Dec 6",
        tags: ["Starter"],
      },
    ],
  },
];

function DealCard({ deal }: { deal: Deal }) {
  return (
    <div className="kanban-card group">
      <div className="flex items-start justify-between">
        <h4 className="font-medium text-sm">{deal.title}</h4>
        <Button
          variant="ghost"
          size="icon-sm"
          className="opacity-0 group-hover:opacity-100 transition-opacity -mt-1 -mr-2"
        >
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </div>

      <p className="text-sm text-muted-foreground mt-1">{deal.company}</p>

      {/* Tags */}
      <div className="flex flex-wrap gap-1 mt-3">
        {deal.tags.map((tag) => (
          <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
            {tag}
          </Badge>
        ))}
      </div>

      {/* Deal Info */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <DollarSign className="w-3 h-3" />
            {deal.value}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {deal.dueDate}
          </span>
        </div>
        <Avatar className="w-6 h-6">
          <AvatarFallback className="text-[10px] bg-muted">
            {deal.owner.initials}
          </AvatarFallback>
        </Avatar>
      </div>

      {/* Probability Bar */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-muted-foreground">Probability</span>
          <span className="font-medium">{deal.probability}%</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${deal.probability}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export default function Pipeline() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display">Sales Pipeline</h1>
          <p className="text-muted-foreground mt-1">
            Track deals through your sales process
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Total Pipeline Value:
          </span>
          <span className="text-xl font-bold text-primary">$457,500</span>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 lg:mx-0 lg:px-0">
        {stages.map((stage) => (
          <div key={stage.id} className="flex-shrink-0 w-[320px]">
            <Card className="h-full">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-3 h-3 rounded-full", stage.color)} />
                    <CardTitle className="text-sm font-semibold">
                      {stage.title}
                    </CardTitle>
                    <Badge variant="secondary" className="text-xs">
                      {stage.deals.length}
                    </Badge>
                  </div>
                  <Button variant="ghost" size="icon-sm">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-sm font-semibold text-muted-foreground mt-1">
                  {stage.totalValue}
                </p>
              </CardHeader>
              <CardContent className="p-3 pt-0 space-y-3">
                {stage.deals.map((deal) => (
                  <DealCard key={deal.id} deal={deal} />
                ))}
                <Button
                  variant="ghost"
                  className="w-full justify-start text-muted-foreground hover:text-foreground"
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Deal
                </Button>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}
