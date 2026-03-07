import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  UserPlus, 
  FileText, 
  CheckCircle, 
  MessageSquare, 
  CreditCard,
  Calendar
} from "lucide-react";

const activities = [
  {
    id: 1,
    user: "Sarah Johnson",
    initials: "SJ",
    action: "added a new lead",
    target: "Tech Solutions Inc",
    time: "2 minutes ago",
    icon: UserPlus,
    iconColor: "text-success bg-success/10",
  },
  {
    id: 2,
    user: "Michael Chen",
    initials: "MC",
    action: "created invoice",
    target: "INV-2024-0089",
    time: "15 minutes ago",
    icon: FileText,
    iconColor: "text-primary bg-primary/10",
  },
  {
    id: 3,
    user: "Emily Davis",
    initials: "ED",
    action: "completed task",
    target: "Q4 Marketing Review",
    time: "1 hour ago",
    icon: CheckCircle,
    iconColor: "text-success bg-success/10",
  },
  {
    id: 4,
    user: "Robert Wilson",
    initials: "RW",
    action: "left a comment on",
    target: "Project Alpha",
    time: "2 hours ago",
    icon: MessageSquare,
    iconColor: "text-indigo bg-indigo/10",
  },
  {
    id: 5,
    user: "System",
    initials: "SY",
    action: "received payment for",
    target: "INV-2024-0085",
    time: "3 hours ago",
    icon: CreditCard,
    iconColor: "text-success bg-success/10",
  },
  {
    id: 6,
    user: "Lisa Anderson",
    initials: "LA",
    action: "scheduled meeting with",
    target: "Digital Dynamics",
    time: "4 hours ago",
    icon: Calendar,
    iconColor: "text-warning bg-warning/10",
  },
];

export function ActivityFeed() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
        <p className="text-sm text-muted-foreground">
          Latest actions across the platform
        </p>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />
          
          <div className="space-y-6">
            {activities.map((activity) => (
              <div key={activity.id} className="relative flex items-start gap-4 pl-2">
                {/* Icon */}
                <div
                  className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center ${activity.iconColor}`}
                >
                  <activity.icon className="w-4 h-4" />
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-medium">{activity.user}</span>{" "}
                    <span className="text-muted-foreground">{activity.action}</span>{" "}
                    <span className="font-medium text-primary">{activity.target}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {activity.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
