import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Video, Clock, Users, ExternalLink } from "lucide-react";

const meetings = [
  {
    id: 1,
    title: "Product Demo - Tech Corp",
    time: "10:00 AM",
    duration: "45 min",
    attendees: [
      { name: "Sarah J", initials: "SJ" },
      { name: "Michael C", initials: "MC" },
      { name: "Client", initials: "TC" },
    ],
    type: "video",
    isNext: true,
  },
  {
    id: 2,
    title: "Weekly Sales Standup",
    time: "11:30 AM",
    duration: "30 min",
    attendees: [
      { name: "Team", initials: "TM" },
    ],
    type: "video",
    isNext: false,
  },
  {
    id: 3,
    title: "Client Onboarding",
    time: "2:00 PM",
    duration: "60 min",
    attendees: [
      { name: "Emily D", initials: "ED" },
      { name: "New Client", initials: "NC" },
    ],
    type: "video",
    isNext: false,
  },
];

export function UpcomingMeetings() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg font-semibold">Upcoming Meetings</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Today's schedule</p>
        </div>
        <Button variant="outline" size="sm">
          View Calendar
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {meetings.map((meeting) => (
            <div
              key={meeting.id}
              className={`relative p-4 rounded-xl border transition-all ${
                meeting.isNext
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border/50 hover:border-border hover:bg-muted/30"
              }`}
            >
              {meeting.isNext && (
                <div className="absolute -top-2 left-4">
                  <span className="bg-primary text-primary-foreground text-[10px] font-semibold px-2 py-0.5 rounded-full">
                    UP NEXT
                  </span>
                </div>
              )}
              
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <h4 className="font-medium text-sm">{meeting.title}</h4>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {meeting.time}
                    </span>
                    <span>{meeting.duration}</span>
                  </div>
                </div>
                
                {meeting.type === "video" && (
                  <Button 
                    size="sm" 
                    variant={meeting.isNext ? "default" : "outline"}
                    className="gap-1.5"
                  >
                    <Video className="w-3.5 h-3.5" />
                    Join
                  </Button>
                )}
              </div>
              
              {/* Attendees */}
              <div className="flex items-center gap-2 mt-3">
                <div className="flex -space-x-2">
                  {meeting.attendees.slice(0, 3).map((attendee, i) => (
                    <Avatar key={i} className="w-6 h-6 border-2 border-card">
                      <AvatarFallback className="text-[10px] bg-muted">
                        {attendee.initials}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                </div>
                {meeting.attendees.length > 3 && (
                  <span className="text-xs text-muted-foreground">
                    +{meeting.attendees.length - 3} more
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
