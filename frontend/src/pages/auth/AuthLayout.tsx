import { useState } from "react";
import RoleTeamLogin from "./RoleTeamLogin";
import ClientLogin from "./ClientLogin";
import ClientSignup from "./ClientSignup";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Megaphone, Users, Building } from "lucide-react";

export default function AuthLayout() {
  const logoCandidates = ["/HealthSpire%20logo.png"]; 
  const [logoSrc, setLogoSrc] = useState(logoCandidates[0]);
  const onLogoError = () => { const i = logoCandidates.indexOf(logoSrc); if (i < logoCandidates.length - 1) setLogoSrc(logoCandidates[i+1]); };

  // Client portal can switch between Login and Signup without leaving the /auth page.
  const [clientMode, setClientMode] = useState<"login" | "signup">("login");
  return (
    <div className="min-h-screen relative overflow-y-auto bg-[radial-gradient(1000px_circle_at_15%_20%,rgba(99,102,241,0.18),transparent_55%),radial-gradient(900px_circle_at_85%_25%,rgba(14,165,233,0.16),transparent_55%),radial-gradient(900px_circle_at_50%_90%,rgba(34,197,94,0.10),transparent_60%)] flex items-start sm:items-center justify-center p-4 sm:p-6">
      <div className="pointer-events-none absolute inset-0 opacity-40 mix-blend-screen [background-image:linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:56px_56px]" />
      <div className="w-full max-w-5xl relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10 items-stretch">
          <div className="hidden lg:flex relative rounded-3xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 via-sky-400/10 to-emerald-400/10" />
            <div className="relative z-10 flex flex-col justify-between w-full p-10">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-white/90">
                  <span className="text-sm font-medium">HealthSpire CRM</span>
                  <span className="text-xs text-white/70">Secure access portal</span>
                </div>
                <div className="space-y-2">
                  <div className="text-4xl font-semibold tracking-tight text-white">Welcome back</div>
                  <div className="text-sm leading-relaxed text-white/70 max-w-md">
                    Manage clients, leads, projects, and communications from one place with a fast, modern workflow.
                  </div>
                </div>
              </div>

              <div className="relative mt-8">
                <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-tr from-indigo-500/20 via-sky-400/10 to-emerald-400/10 blur-2xl" />
                <div className="relative rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-4 shadow-2xl">
                  <div className="aspect-[4/3] w-full overflow-hidden rounded-2xl">
                    <img
                      src="/CRM%20login.png"
                      alt="CRM 3D illustration"
                      className="h-full w-full object-cover [transform:perspective(1000px)_rotateY(-8deg)_rotateX(2deg)]"
                      loading="lazy"
                    />
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-xs text-white/70">Trusted • Fast • Organized</div>
                    <div className="text-xs text-white/70">Encrypted sessions</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center">
            <div className="w-full max-w-md">
              {/* Logo Section */}
              <div className="flex flex-col items-center justify-center mb-8">
                <img src={logoSrc} onError={onLogoError} alt="HealthSpire" className="h-24 w-auto drop-shadow-[0_14px_30px_rgba(0,0,0,0.35)]" />
              </div>

              {/* Login Card */}
              <Card className="shadow-2xl border border-white/10 bg-white/10 backdrop-blur-xl">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl text-center text-white">Sign in</CardTitle>
                  <div className="text-center text-sm text-white/70">
                    Choose your portal to continue.
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {/*
                    Auth portals:
                    - Admin -> /api/auth/admin/login
                    - Staff/Marketer/Sales/Finance/Developer -> /api/auth/team/login (role-restricted per tab)
                    - Client -> /api/auth/client/login
                  */}
                  <Tabs defaultValue="team" className="w-full">
                    <TabsList className="w-full grid grid-cols-2 mb-6 bg-white/5 h-auto gap-1 p-1">
                      <TabsTrigger value="team" className="flex items-center gap-2 text-white">
                        <Users className="w-4 h-4" />
                        Team Login
                      </TabsTrigger>
                      <TabsTrigger value="client" className="flex items-center gap-2 text-white">
                        <Building className="w-4 h-4" />
                        Client Login
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="team" className="mt-0">
                      <RoleTeamLogin
                        title="Team portal"
                        subtitle="Admin, staff, and team members"
                        allowedRoles={["admin", "staff", "marketer", "marketing_manager", "sales", "sales_manager", "finance", "finance_manager", "developer", "project_manager"]}
                        allowPin={true}
                        wrongRoleMessage="Please use the Client tab for client accounts."
                        redirectTo="/"
                      />
                    </TabsContent>

                    <TabsContent value="client" className="mt-0">
                      {clientMode === "signup" ? (
                        <ClientSignup />
                      ) : (
                        <ClientLogin onSignUp={() => setClientMode("signup")} />
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
