import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../AuthContext";
import {
  ChevronLeft, ChevronRight, Plus, Dumbbell, Coffee,
  Flame, CheckCircle2, X, Zap
} from "lucide-react";
import { db } from "../firebase";
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, where } from "firebase/firestore";

const DAY_TYPES = [
  { id: "workout",  label: "Workout Day",   color: "text-blue-400",    bg: "bg-blue-500/15",    border: "border-blue-500/30",    icon: Dumbbell },
  { id: "rest",     label: "Rest Day",      color: "text-emerald-400", bg: "bg-emerald-500/15", border: "border-emerald-500/30", icon: Coffee   },
  { id: "cardio",   label: "Cardio Day",    color: "text-amber-400",   bg: "bg-amber-500/15",    border: "border-amber-500/30",   icon: Flame    },
  { id: "off",      label: "Off Day",       color: "text-white/30",    bg: "bg-white/5",         border: "border-white/10",       icon: X        },
  // Added a clean dynamic state layout variant for completed logs
  { id: "completed", label: "Completed Log", color: "text-purple-400",  bg: "bg-purple-500/20",   border: "border-purple-500/40",  icon: CheckCircle2 }
];

const MUSCLE_GROUPS = ["Arms","Chest","Legs","Shoulders","Back","Abs & Core"];
const WEEKDAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTHS   = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function getDaysInMonth(year, month) { return new Date(year, month + 1, 0).getDate(); }
function getFirstDayOfMonth(year, month) { return new Date(year, month, 1).getDay(); }
function toKey(year, month, day) { return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`; }
function todayKey() {
  const d = new Date();
  return toKey(d.getFullYear(), d.getMonth(), d.getDate());
}

export default function WorkoutCalendar() {
  const { user } = useAuth();
  const now = new Date();
  const [viewYear, setViewYear]   = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [plans, setPlans]         = useState({}); 
  const [completedLogs, setCompletedLogs] = useState({});
  const [selected, setSelected]   = useState(null); 
  const [editing, setEditing]     = useState(null); 

  const daysInMonth  = getDaysInMonth(viewYear, viewMonth);
  const firstDay     = getFirstDayOfMonth(viewYear, viewMonth);
  const tk           = todayKey();

  // 🌍 Synchronize manually planned training entries
  useEffect(() => {
    if (!user) {
      setPlans({});
      return;
    }

    const calendarRef = collection(db, "calendar_plans");
    const plansQuery = query(calendarRef, where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(plansQuery, (snap) => {
      const data = {};
      snap.docs.forEach((d) => { data[d.id] = d.data(); });
      setPlans(data);
    });
    return () => unsubscribe();
  }, [user]);

  // 🏋️‍♂️ NEW: Pull history parameters from actual live completed workout sessions
  useEffect(() => {
    if (!user) {
      setCompletedLogs({});
      return;
    }

    const logsRef = collection(db, "workout_logs");
    const logsQuery = query(logsRef, where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(logsQuery, (snap) => {
      const logsMap = {};
      snap.docs.forEach((doc) => {
        const data = doc.data();
        if (data.completedAt) {
          let dateObj = typeof data.completedAt.toDate === "function" ? data.completedAt.toDate() : new Date(data.completedAt);
          if (!isNaN(dateObj.getTime())) {
            const key = toKey(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
            logsMap[key] = {
              type: "completed",
              majorMuscle: data.majorMuscle || "Full Body",
              kcal: data.kcal || 0,
              summary: data.exercisesSummary || "Session logged"
            };
          }
        }
      });
      setCompletedLogs(logsMap);
    });
    return () => unsubscribe();
  }, [user]);

  // Merge datasets on-the-fly: Let actual logs take visual priority over a plan
  const mergedCalendar = useMemo(() => {
    const absoluteGrid = { ...plans };
    Object.keys(completedLogs).forEach((dateKey) => {
      absoluteGrid[dateKey] = {
        type: "completed",
        muscles: completedLogs[dateKey].majorMuscle ? [completedLogs[dateKey].majorMuscle] : [],
        notes: `${completedLogs[dateKey].summary} (-${completedLogs[dateKey].kcal} kcal)`,
        isRealLog: true
      };
    });
    return absoluteGrid;
  }, [plans, completedLogs]);

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }
  const selectedDay = selected ? mergedCalendar[selected] : null;
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }

  function openDay(key) {
    if (mergedCalendar[key]?.isRealLog) return; // Prevent overwriting past raw historical logs manually
    setSelected(key);
    setEditing(plans[key] ? { ...plans[key], muscles: plans[key].muscles || [] }
                         : { type: "workout", muscles: [], notes: "" });
  }

  async function saveDay() {
    if (!user) return;
    try {
      const dayRef = doc(db, "calendar_plans", selected);
      await setDoc(dayRef, { ...editing, userId: user.uid }, { merge: true });
      setSelected(null);
      setEditing(null);
    } catch (error) {
      console.error("Error saving day plan: ", error);
    }
  }

  async function removeDay() {
    if (!selected) return;
    try {
      const dayRef = doc(db, "calendar_plans", selected);
      await deleteDoc(dayRef);
      setSelected(null);
      setEditing(null);
    } catch (error) {
      console.error("Error removing day plan: ", error);
    }
  }

  function getDayMeta(key) {
    const d = mergedCalendar[key];
    if (!d) return null;
    return DAY_TYPES.find(t => t.id === d.type) || null;
  }

  return (
    <div className="space-y-6" style={{ animation: "fadeSlideUp 0.35s ease forwards" }}>
      <div>
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "Space Grotesk,sans-serif" }}>Workout Calendar</h1>
        <p className="text-white/40 text-sm mt-0.5">Plan your training week & track completions</p>
      </div>

      <div className="rounded-3xl p-5 border border-white/5" style={{ background: "rgba(11,21,41,0.7)", backdropFilter: "blur(16px)" }}>
        <div className="flex items-center justify-between mb-5">
          <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-white/10 transition-colors">
            <ChevronLeft className="w-5 h-5 text-white/60" />
          </button>
          <div className="text-center">
            <p className="text-white font-bold text-lg">{MONTHS[viewMonth]}</p>
            <p className="text-white/30 text-xs">{viewYear}</p>
          </div>
          <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-white/10 transition-colors">
            <ChevronRight className="w-5 h-5 text-white/60" />
          </button>
        </div>

        <div className="grid grid-cols-7 mb-2">
          {WEEKDAYS.map(d => <p key={d} className="text-center text-white/25 text-xs font-medium py-1">{d}</p>)}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, idx) => {
            const day = idx + 1;
            const key = toKey(viewYear, viewMonth, day);
            const meta = getDayMeta(key);
            const isToday = key === tk;
            const Icon = meta?.icon;

            return (
              <button key={day} onClick={() => openDay(key)}
                className={`aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all
                  ${isToday ? "ring-1 ring-blue-500" : ""}
                  ${meta ? `${meta.bg} ${meta.border} border` : "hover:bg-white/5 border border-transparent"}`}>
                <span className={`text-sm font-semibold leading-none ${isToday ? "text-blue-400" : meta ? meta.color : "text-white/50"}`}>
                  {day}
                </span>
                {Icon && <Icon className={`w-3 h-3 ${meta.color}`} />}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-3 mt-5 pt-4 border-t border-white/5">
          {DAY_TYPES.map(t => (
            <div key={t.id} className="flex items-center gap-1.5">
              <t.icon className={`w-3 h-3 ${t.color}`} />
              <span className="text-white/30 text-xs">{t.label}</span>
            </div>
          ))}
        </div>
      </div>

      <TodayPlan calendar={mergedCalendar} tk={tk} />

      {selected && editing && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end">
          <div className="w-full max-w-lg mx-auto rounded-t-3xl border-t border-x border-white/10 flex flex-col"
            style={{ background: "#0b1529", maxHeight: "85vh", animation: "slideUp 0.3s ease" }}>
            <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>

            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0">
              <p className="text-white font-bold">{selected}</p>
              <button onClick={() => { setSelected(null); setEditing(null); }} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                <X className="w-4 h-4 text-white/60" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-5 py-5 space-y-5">
              <div className="space-y-2">
                <p className="text-white/50 text-xs uppercase tracking-wider">Day Type</p>
                <div className="grid grid-cols-2 gap-2">
                  {DAY_TYPES.filter(t => t.id !== "completed").map(t => (
                    <button key={t.id} onClick={() => setEditing(e => ({ ...e, type: t.id }))}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-all
                        ${editing.type === t.id ? `${t.bg} ${t.border}` : "bg-white/5 border-transparent hover:bg-white/10"}`}>
                      <t.icon className={`w-4 h-4 ${t.color}`} />
                      <span className={`text-sm font-medium ${editing.type === t.id ? t.color : "text-white/50"}`}>{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {editing.type === "workout" && (
                <div className="space-y-2">
                  <p className="text-white/50 text-xs uppercase tracking-wider">Muscle Groups</p>
                  <div className="grid grid-cols-3 gap-2">
                    {MUSCLE_GROUPS.map(mg => {
                      const active = editing.muscles?.includes(mg);
                      return (
                        <button key={mg} onClick={() => setEditing(e => ({
                          ...e,
                          muscles: active ? e.muscles.filter(m => m !== mg) : [...(e.muscles || []), mg]
                        }))}
                          className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all
                            ${active ? "bg-blue-500/20 border-blue-500/40 text-blue-400" : "bg-white/5 border-transparent text-white/40 hover:bg-white/10"}`}>
                          {mg}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-white/50 text-xs uppercase tracking-wider">Notes</p>
                <textarea value={editing.notes || ""} onChange={e => setEditing(ed => ({ ...ed, notes: e.target.value }))}
                  placeholder="e.g. Focus on form, deload week…" rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 text-sm outline-none focus:border-blue-500/60 transition-colors resize-none" />
              </div>
            </div>

            <div className="px-5 py-4 border-t border-white/10 flex gap-3 flex-shrink-0">
              {selectedDay && !selectedDay.isRealLog && (
                <button onClick={removeDay} className="px-4 py-3 rounded-xl border border-red-500/30 text-red-400 text-sm font-medium hover:bg-red-500/10 transition-all">
                  Remove
                </button>
              )}
              <button onClick={saveDay} className="flex-1 py-3 rounded-xl text-white font-bold text-sm transition-all" style={{ background: "linear-gradient(135deg,#3b82f6,#2563eb)" }}>
                Save Day
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TodayPlan({ calendar, tk }) {
  const plan = calendar[tk];
  const meta = plan ? DAY_TYPES.find(t => t.id === plan.type) : null;
  const Icon = meta?.icon;
  const muscles = plan?.muscles || [];

  return (
    <div className="space-y-2">
      <h3 className="text-white/50 text-xs uppercase tracking-wider">Today's Plan</h3>
      {plan ? (
        <div className={`rounded-2xl p-4 border ${meta?.border} ${meta?.bg}`}>
          <div className="flex items-center gap-3 mb-2">
            {Icon && <Icon className={`w-5 h-5 ${meta.color}`} />}
            <p className={`font-semibold ${meta.color}`}>{meta?.label}</p>
          </div>
          {muscles.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {muscles.map(m => <span key={m} className="px-2 py-0.5 rounded-lg bg-white/10 text-white/60 text-xs">{m}</span>)}
            </div>
          )}
          {plan.notes && <p className="text-white/40 text-sm">{plan.notes}</p>}
        </div>
      ) : (
        <div className="rounded-2xl p-4 border border-white/5 text-center" style={{ background: "rgba(255,255,255,0.03)" }}>
          <p className="text-white/30 text-sm">No plan set for today. Tap a date on the calendar to plan it.</p>
        </div>
      )}
    </div>
  );
}