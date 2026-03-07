import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, Clock, AlertCircle } from "lucide-react";

const tasks = [
  {
    id: 1,
    title: "Review Q4 Marketing Strategy",
    project: "Marketing",
    status: "in-progress",
    priority: "high",
    progress: 65,
  },
  {
    id: 2,
    title: "Update CRM Integration",
    project: "Development",
    status: "pending",
    priority: "medium",
    progress: 30,
  },
  {
    id: 3,
    title: "Prepare Client Presentation",
    project: "Sales",
    status: "completed",
    priority: "high",
    progress: 100,
  },
  {
    id: 4,
    title: "HR Policy Documentation",
    project: "Human Resources",
    status: "in-progress",
    priority: "low",
    progress: 45,
  },
];

const statusIcons = {
  "completed": <CheckCircle2 className="w-4 h-4 text-success" />,
  "in-progress": <Clock className="w-4 h-4 text-warning" />,
  "pending": <Circle className="w-4 h-4 text-muted-foreground" />,
};

const priorityColors = {
  high: "bg-destructive",
  medium: "bg-warning",
  low: "bg-muted-foreground",
};

export function TasksOverview() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg font-semibold">Tasks Overview</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Active tasks across projects
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">12 tasks</span>
          <span className="text-success font-medium">3 completed</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="p-3 rounded-lg border border-border/50 hover:border-border hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  {statusIcons[task.status]}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{task.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {task.project}
                    </p>
                  </div>
                </div>
                <div
                  className={`w-2 h-2 rounded-full ${priorityColors[task.priority]}`}
                  title={`${task.priority} priority`}
                />
              </div>
              <div className="mt-3 flex items-center gap-3">
                <Progress value={task.progress} className="h-1.5 flex-1" />
                <span className="text-xs text-muted-foreground w-10">
                  {task.progress}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
