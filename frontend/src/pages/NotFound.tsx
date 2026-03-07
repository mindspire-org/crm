import { useLocation, useNavigate, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Home, Search } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950">
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "radial-gradient(circle at 12% 18%, rgba(99,102,241,0.55) 0, rgba(99,102,241,0) 40%), radial-gradient(circle at 85% 25%, rgba(168,85,247,0.45) 0, rgba(168,85,247,0) 40%), radial-gradient(circle at 45% 90%, rgba(34,197,94,0.25) 0, rgba(34,197,94,0) 45%)",
        }}
      />

      <div className="relative mx-auto flex min-h-screen max-w-5xl items-center px-4 sm:px-6 lg:px-8">
        <div className="w-full">
          <div className="mx-auto max-w-2xl rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-10">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <Badge className="bg-white/10 text-white hover:bg-white/15">404 Not Found</Badge>
                <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
                  This page doesn’t exist
                </h1>
                <p className="mt-3 text-sm leading-relaxed text-white/70 sm:text-base">
                  The link you followed may be broken, or the page may have been removed.
                </p>
              </div>

              <div className="flex shrink-0 items-center justify-start sm:justify-end">
                <div className="relative">
                  <div className="absolute -inset-2 rounded-full bg-gradient-to-tr from-indigo-500/35 via-fuchsia-500/35 to-emerald-500/20 blur-2xl" />
                  <div className="relative rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-center">
                    <div className="text-5xl font-black tracking-tight text-white">404</div>
                    <div className="mt-1 text-xs text-white/60">Route not found</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-xs font-medium text-white/60">Requested path</div>
                  <div className="mt-1 truncate font-mono text-sm text-white/90">{location.pathname}</div>
                </div>
                <div className="hidden shrink-0 items-center gap-2 sm:flex">
                  <Search className="h-4 w-4 text-white/50" />
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button onClick={() => navigate(-1)} variant="secondary" className="bg-white/10 text-white hover:bg-white/15">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Go Back
                </Button>
                <Button asChild className="bg-indigo-500 text-white hover:bg-indigo-500/90">
                  <Link to="/">
                    <Home className="mr-2 h-4 w-4" />
                    Go to Dashboard
                  </Link>
                </Button>
              </div>

              <div className="text-xs text-white/55">
                Tip: check the sidebar navigation for available pages.
              </div>
            </div>
          </div>

          <div className="mx-auto mt-6 max-w-2xl text-center text-xs text-white/45">
            If you believe this is a mistake, contact your administrator.
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
