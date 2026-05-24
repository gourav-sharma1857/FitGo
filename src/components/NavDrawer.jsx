import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Salad, Dumbbell, BarChart3, User, Menu, X, Zap, CalendarDays } from "lucide-react";
import { useAuth } from "../AuthContext"; // 🔥 Added Auth Context import

const navItems = [
  { label: "Diet Tracker",    path: "/",         icon: Salad,        color: "text-emerald-500" },
  { label: "Gym Session",    path: "/gym",      icon: Dumbbell,     color: "text-blue-400"    },
  { label: "Workout Calendar", path: "/calendar", icon: CalendarDays, color: "text-amber-400"   },
  { label: "Stats",             path: "/stats",    icon: BarChart3,    color: "text-amber-400"   },
  { label: "Profile",           path: "/profile",  icon: User,         color: "text-emerald-400" },
];

export default function NavDrawer() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuth(); // 🔥 Destructured user context

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-5 py-4"
        style={{ background: "rgba(11,21,41,0.92)", backdropFilter: "blur(24px)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <button onClick={() => setOpen(true)} className="p-2 rounded-xl hover:bg-white/10 transition-all">
          <Menu className="w-5 h-5 text-white" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#10b981,#3b82f6)" }}>
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg text-white" style={{ fontFamily: "Space Grotesk,sans-serif" }}>FitCore</span>
        </div>
        <div className="w-8" />
      </header>

      {open && <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />}

      {open && (
        <aside className="fixed top-0 left-0 h-full w-72 z-50 flex flex-col"
          style={{ background: "rgba(11,21,41,0.97)", backdropFilter: "blur(24px)", borderRight: "1px solid rgba(255,255,255,0.08)", animation: "drawerIn 0.3s cubic-bezier(0.4,0,0.2,1) forwards" }}>
          <style>{`@keyframes drawerIn { from { transform:translateX(-100%); } to { transform:translateX(0); } }`}</style>

          <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg,#10b981,#3b82f6)", boxShadow: "0 0 20px rgba(16,185,129,0.2)" }}>
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-bold text-white" style={{ fontFamily: "Space Grotesk,sans-serif" }}>FitCore</p>
                <p className="text-white/30 text-xs">Performance Tracker</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
              <X className="w-4 h-4 text-white/50" />
            </button>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-1.5">
            {navItems.map(({ label, path, icon: Icon, color }) => {
              const active = location.pathname === path;
              return (
                <Link key={path} to={path} onClick={() => setOpen(false)}
                  className={`flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all group
                    ${active ? "bg-white/10 border border-white/10" : "hover:bg-white/5 border border-transparent"}`}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-white/5">
                    <Icon className={`w-5 h-5 ${color}`} />
                  </div>
                  <span className={`font-medium text-sm ${active ? "text-white" : "text-white/50 group-hover:text-white"} transition-colors`}>
                    {label}
                  </span>
                  {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                </Link>
              );
            })}
          </nav>

          <div className="px-6 py-5" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
            {/* 🔥 Updated with real context data */}
            <p className="text-xs text-white/40 text-center truncate px-2">
              {user?.email || "Not signed in"}
            </p>
            <p className="text-[10px] text-white/15 text-center mt-0.5">Firestore real-time sync</p>
          </div>
        </aside>
      )}
    </>
  );
}