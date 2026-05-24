import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../AuthContext";
// Added Trash2 alongside ListMinus to handle the deletion interface cleanly
import { TrendingUp, Dumbbell, Flame, Calendar, CheckCircle2, Clock, ChevronDown, ChevronUp, Sparkles, ListMinus, Trash2 } from "lucide-react";
import { db } from "../firebase";
import { collection, onSnapshot, orderBy, query, where, doc, deleteDoc } from "firebase/firestore";

// Helper to reliably format timestamp variants to standard strings
function formatDay(value) {
  if (!value) return "—";
  let date;
  if (typeof value.toDate === "function") {
    date = value.toDate();
  } else if (value instanceof Date) {
    date = value;
  } else {
    date = new Date(value);
  }
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { weekday: "short" });
}

// Helper to extract a standard YYYY-MM-DD format for calendar tracking keys
function getCalendarKey(value) {
  if (!value) return null;
  let date = typeof value.toDate === "function" ? value.toDate() : new Date(value);
  if (isNaN(date.getTime())) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function Stats() {
  const { user } = useAuth();
  const [workoutHistory, setWorkoutHistory] = useState([]);
  const [expandedWorkoutId, setExpandedWorkoutId] = useState(null);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(null);
  const [isDeleting, setIsDeleting] = useState(null); // Track deletion UI states

  // 🌍 Real-time database synchronizer
  useEffect(() => {
    if (!user) {
      setWorkoutHistory([]);
      return;
    }

    const workoutsRef = collection(db, "workout_logs");
    const workoutsQuery = query(workoutsRef, where("userId", "==", user.uid), orderBy("completedAt", "desc"));
    
    const unsubscribeWorkouts = onSnapshot(workoutsQuery, (snap) => {
      setWorkoutHistory(
        snap.docs.map((doc) => {
          const data = doc.data();
          
          const totalSetsCalculated = data.exercises?.reduce((sum, ex) => sum + (ex.sets?.length || 0), 0) || data.setsCount || 0;
          const exercisesListString = data.exercises?.map(ex => ex.name).join(", ") || data.exercisesSummary || "Gym Workout";
          
          // Dynamically detect major muscle groups targeted based on common exercise names
          const muscleGroups = new Set();
          data.exercises?.forEach(ex => {
            const name = ex.name.toLowerCase();
            if (name.includes("bench") || name.includes("press") || name.includes("fly")) muscleGroups.add("Chest");
            if (name.includes("squat") || name.includes("leg") || name.includes("lunge") || name.includes("calf")) muscleGroups.add("Legs");
            if (name.includes("deadlift") || name.includes("row") || name.includes("lat") || name.includes("pull")) muscleGroups.add("Back");
            if (name.includes("curl") || name.includes("extension") || name.includes("pushdown")) muscleGroups.add("Arms");
            if (name.includes("raise") || name.includes("shoulder") || name.includes("deltoid")) muscleGroups.add("Shoulders");
            if (name.includes("crunch") || name.includes("plank") || name.includes("core")) muscleGroups.add("Abs");
          });
          
          const primaryMuscle = muscleGroups.size > 0 ? Array.from(muscleGroups).join(" & ") : data.majorMuscle || "Full Body";

          return {
            id: doc.id,
            ...data,
            setsCount: totalSetsCalculated,
            exercisesSummary: exercisesListString,
            majorMuscle: primaryMuscle,
            durationMinutes: data.durationMinutes || data.duration || 45 // Fallback to uniform duration asset if unavailable
          };
        })
      );
    });

    return () => unsubscribeWorkouts();
  }, [user]);

  // 🗑️ Delete Session Handler Function
  const handleDeleteWorkout = async (workoutId, e) => {
    e.stopPropagation(); // Stop the card header click from toggling expansion states
    
    const confirmDelete = window.confirm("Are you sure you want to permanently delete this workout session? This will recalculate your stats and clear it from your calendar.");
    if (!confirmDelete) return;

    try {
      setIsDeleting(workoutId);
      const workoutDocRef = doc(db, "workout_logs", workoutId);
      await deleteDoc(workoutDocRef);
      
      setWorkoutHistory((prev) => prev.filter((w) => w.id !== workoutId));
      if (expandedWorkoutId === workoutId) {
        setExpandedWorkoutId(null);
      }
      const deletedWorkout = workoutHistory.find((w) => w.id === workoutId);
      if (deletedWorkout && getCalendarKey(deletedWorkout.completedAt) === selectedCalendarDate) {
        setSelectedCalendarDate(null);
      }
    } catch (error) {
      console.error("Error deleting workout log:", error);
      alert("Failed to delete the session. Check your database connections.");
    } finally {
      setIsDeleting(null);
    }
  };

  // Compute a rolling list of the past 7 calendar dates to render the grid matrix
  const pastSevenDays = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i)); // Chronological order
      
      // Extract local YYYY-MM-DD instead of UTC string splits
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const localKey = `${year}-${month}-${day}`;

      return {
        dateStr: d.toLocaleDateString("en-US", { weekday: "short" }),
        key: localKey,
        rawDate: d
      };
    });
  }, []);

  // Map workouts cleanly against their unique calendar keys
  const calendarActivityMap = useMemo(() => {
    const mapping = {};
    workoutHistory.forEach(w => {
      const key = getCalendarKey(w.completedAt);
      if (key) mapping[key] = w;
    });
    return mapping;
  }, [workoutHistory]);

  // Filter list views on-the-fly based on interactive calendar focus points
  const visibleWorkouts = useMemo(() => {
    if (!selectedCalendarDate) return workoutHistory;
    return workoutHistory.filter(w => getCalendarKey(w.completedAt) === selectedCalendarDate);
  }, [workoutHistory, selectedCalendarDate]);

  // High-level aggregate metrics calculated straight from real-time records
  const currentDayBurnTotal = useMemo(() => {
    const todayKey = getCalendarKey(new Date());
    return workoutHistory
      .filter(w => getCalendarKey(w.completedAt) === todayKey)
      .reduce((sum, w) => sum + (w.kcal || 0), 0);
  }, [workoutHistory]);

  const totalSets = useMemo(() => workoutHistory.reduce((sum, w) => sum + (w.setsCount || 0), 0), [workoutHistory]);
  const activeDaysCount = useMemo(() => new Set(workoutHistory.map(w => getCalendarKey(w.completedAt))).size, [workoutHistory]);

  const isDoneToday = useMemo(() => {
    const todayKey = getCalendarKey(new Date());
    return workoutHistory.some(w => getCalendarKey(w.completedAt) === todayKey && (w.kcal || 0) > 0);
  }, [workoutHistory]);

  const toggleExpandWorkout = (id) => {
    setExpandedWorkoutId(expandedWorkoutId === id ? null : id);
  };

  return (
    <div className="space-y-6 animate-fadeSlideUp">
      {/* Header section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
            Performance Dashboard
          </h1>
          <p className="text-white/40 text-sm mt-0.5">Live fitness and recovery tracking telemetry</p>
        </div>

        {isDoneToday && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Today Complete
          </div>
        )}
      </div>

      {/* Main Metric Cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Today's Burn", val: `${Math.round(currentDayBurnTotal)} kcal`, icon: Flame, color: "text-amber-400", bg: "bg-amber-500/10" },
          { label: "Total Sets", val: totalSets, icon: Dumbbell, color: "text-blue-400", bg: "bg-blue-500/10" },
          { label: "Active Volume", val: `${activeDaysCount} Days`, icon: Calendar, color: "text-emerald-400", bg: "bg-emerald-500/10" },
        ].map(({ label, val, icon: Icon, color, bg }) => (
          <div key={label} className="bg-[#0b1529]/70 backdrop-blur-xl rounded-2xl p-4 border border-white/5 text-center">
            <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mx-auto mb-2`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <p className={`text-base font-bold ${color} font-mono`}>{val}</p>
            <p className="text-white/30 text-[11px] mt-0.5 whitespace-nowrap">{label}</p>
          </div>
        ))}
      </div>

      {/* Interactive Activity Calendar Matrix */}
      <div className="bg-[#0b1529]/70 backdrop-blur-xl rounded-3xl p-5 border border-white/5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-400" />
            <h3 className="text-white font-semibold text-sm">Muscle Splits Tracker</h3>
          </div>
          {selectedCalendarDate && (
            <button 
              onClick={() => setSelectedCalendarDate(null)}
              className="text-xs text-blue-400 hover:underline"
            >
              Clear filter view
            </button>
          )}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {pastSevenDays.map(({ dateStr, key }) => {
            const dayWorkout = calendarActivityMap[key];
            const isActive = !!dayWorkout;
            const isSelected = selectedCalendarDate === key;

            return (
              <button
                key={key}
                disabled={!isActive}
                onClick={() => setSelectedCalendarDate(isSelected ? null : key)}
                className={`flex flex-col items-center p-2.5 rounded-xl border transition-all relative ${
                  isSelected 
                    ? "bg-blue-500/20 border-blue-400/60" 
                    : isActive 
                      ? "bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40" 
                      : "bg-white/[0.02] border-white/5 opacity-40 cursor-not-allowed"
                }`}
              >
                <span className="text-[10px] text-white/30 uppercase font-mono">{dateStr}</span>
                <div className={`w-7 h-7 rounded-lg my-1.5 flex items-center justify-center text-xs font-bold font-mono ${
                  isActive ? "bg-emerald-500/20 text-emerald-400" : "bg-white/5 text-white/20"
                }`}>
                  {isActive ? "✓" : "—"}
                </div>
                <span className="text-[9px] text-white/50 font-medium tracking-tight text-center truncate w-full">
                  {isActive ? dayWorkout.majorMuscle.split(" ")[0] : "Rest"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Dynamic Expanding Breakdown Feed */}
      <div className="space-y-3">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-white/50 text-xs uppercase tracking-wider font-semibold">
            {selectedCalendarDate ? "Filtered Workout Logs" : "Logged Activity Timeline"}
          </h3>
          <span className="text-white/30 text-xs font-mono">{visibleWorkouts.length} Session(s)</span>
        </div>

        {visibleWorkouts.length === 0 ? (
          <div className="bg-[#0b1529]/20 rounded-2xl p-8 text-center border border-white/5">
            <ListMinus className="w-8 h-8 text-white/20 mx-auto mb-2" />
            <p className="text-white/40 text-sm">No workout sessions registered for this timeframe.</p>
          </div>
        ) : (
          visibleWorkouts.map((w) => {
            const isExpanded = expandedWorkoutId === w.id;
            const loadingThisDoc = isDeleting === w.id;

            return (
              <div 
                key={w.id} 
                className={`bg-[#0b1529]/40 rounded-2xl border transition-all duration-300 overflow-hidden ${
                  isExpanded ? "border-blue-500/30 shadow-lg shadow-blue-500/5" : "border-white/5"
                } ${loadingThisDoc ? "opacity-40 pointer-events-none" : ""}`}
              >
                {/* Expandable Primary Box Header View */}
                <div 
                  onClick={() => toggleExpandWorkout(w.id)}
                  className="p-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/20 flex items-center justify-center flex-shrink-0 border border-blue-500/10">
                      <Dumbbell className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded-md">
                          {w.majorMuscle}
                        </span>
                        <span className="text-[11px] text-white/30 font-mono">
                          {formatDay(w.completedAt)}
                        </span>
                      </div>
                      <p className="text-white font-medium text-sm truncate mt-1">{w.exercisesSummary}</p>
                    </div>
                  </div>

                  {/* Right Header Status Data */}
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-right hidden sm:block">
                      <div className="flex items-center gap-1 justify-end text-white/50 text-xs">
                        <Clock className="w-3 h-3 text-blue-400" />
                        <span className="font-mono">{w.durationMinutes} mins</span>
                      </div>
                      <p className="text-white/25 text-[10px] uppercase tracking-wide mt-0.5">Duration</p>
                    </div>

                    <div className="text-right">
                      <p className="text-amber-400 font-extrabold text-sm font-mono">-{Math.round(w.kcal || 0)}</p>
                      <p className="text-white/30 text-[10px] uppercase tracking-wide">kcal</p>
                    </div>
                    
                    {/* 🗑️ Inline Trash Deletion Button */}
                    <button
                      onClick={(e) => handleDeleteWorkout(w.id, e)}
                      className="p-2 rounded-lg bg-red-500/5 border border-red-500/10 text-red-400 hover:bg-red-500/20 hover:border-red-500/30 transition-all"
                      title="Delete this log entry"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
                  </div>
                </div>

                {/* Smooth Expanding Detail Section */}
                {isExpanded && (
                  <div className="border-t border-white/5 bg-black/30 p-4 space-y-3 animate-fadeSlideUp">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-white/[0.02] p-2.5 rounded-xl border border-white/5">
                        <span className="text-white/30 block mb-0.5">Total Load Volume</span>
                        <span className="text-white font-medium font-mono">{w.setsCount} Total Sets</span>
                      </div>
                      <div className="bg-white/[0.02] p-2.5 rounded-xl border border-white/5">
                        <span className="text-white/30 block mb-0.5">Intensity Split</span>
                        <span className="text-blue-400 font-medium flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> Progressive Overload
                        </span>
                      </div>
                    </div>

                    {w.exercises && (
                      <div className="space-y-1.5">
                        <p className="text-white/40 text-[11px] font-semibold uppercase tracking-wider pl-1">Exercise Breakdown</p>
                        <div className="space-y-1">
                          {w.exercises.map((ex, exIdx) => (
                            <div key={exIdx} className="text-xs bg-white/[0.01] hover:bg-white/[0.03] transition-colors rounded-xl p-2.5 flex justify-between items-center border border-white/5">
                              <span className="text-white/80 font-medium truncate max-w-[60%]">✦ {ex.name}</span>
                              <div className="flex items-center gap-3 font-mono">
                                <span className="text-white/40 text-[11px]">{ex.sets?.length || 0} sets</span>
                                {ex.sets && ex.sets.length > 0 && (
                                  <span className="text-blue-400 font-semibold bg-blue-500/10 px-2 py-0.5 rounded-md text-[11px]">
                                    {Math.max(...ex.sets.map(s => Number(s.weight || 0)))} lbs max
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}