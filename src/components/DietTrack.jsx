import { useEffect, useState, useMemo } from "react"; // Added useMemo to imports
import { Plus, Trash2, Trophy, Flame, Beef, Star, Bookmark } from "lucide-react";
import { useAuth } from "../AuthContext";
import { db } from "../firebase";
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, where } from "firebase/firestore";

const PROTEIN_GOAL = 150;

export default function DietTrack() {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [savedMeals, setSavedMeals] = useState([]);
  const [targetCals, setTargetCals] = useState(2400);
  const [showForm, setShowForm] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [saveMeal, setSaveMeal] = useState(false);
  const [name, setName] = useState("");
  const [calories, setCalories] = useState(300);
  const [protein, setProtein] = useState(20);
  const [sugar, setSugar] = useState(5);
  const [workoutLogs, setWorkoutLogs] = useState([]);

  // 🌍 1. User Profiling and Daily Nutrition Logs Hook
  useEffect(() => {
    if (!user) return;

    const logsRef = collection(db, "users", user.uid, "daily_logs");
    const logsQuery = query(logsRef, orderBy("timestamp", "desc"));
    const unsubscribeLogs = onSnapshot(logsQuery, (snapshot) => {
      setLogs(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
    });

    const savedRef = collection(db, "users", user.uid, "saved_meals");
    const unsubscribeSaved = onSnapshot(savedRef, (snapshot) => {
      setSavedMeals(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
    });

    const profileRef = doc(db, "users", user.uid, "profile", "settings");
    const unsubscribeProfile = onSnapshot(profileRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (typeof data.targetCalories === "number") {
          setTargetCals(data.targetCalories);
        }
      }
    });

    return () => {
      unsubscribeLogs();
      unsubscribeSaved();
      unsubscribeProfile();
    };
  }, [user]);

  // 🌍 2. Live Workout Tracker Synchronization Hook (Un-nested successfully)
  useEffect(() => {
    if (!user) {
      setWorkoutLogs([]);
      return;
    }

    const workoutsRef = collection(db, "workout_logs");
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayQuery = query(workoutsRef, where("userId", "==", user.uid));

    const unsubscribeWorkouts = onSnapshot(todayQuery, (snap) => {
      const allLogs = snap.docs.map(doc => doc.data());
      
      const todayEntries = allLogs.filter(log => {
        if (!log.completedAt) return false;
        const date = log.completedAt.toDate ? log.completedAt.toDate() : new Date(log.completedAt);
        return date >= todayStart;
      });
      
      setWorkoutLogs(todayEntries);
    });

    return () => unsubscribeWorkouts();
  }, [user]);

  // Compute live exercise burns from workout tracker page
  const totalExerciseKcalBurned = useMemo(() => {
    return workoutLogs.reduce((sum, entry) => sum + (entry.kcal || 0), 0);
  }, [workoutLogs]);

  // Dynamic Metrics Merged with live fitness calculations
  const totalConsumed = logs.filter((log) => log.type === "food").reduce((sum, log) => sum + (log.calories || 0), 0);
  
  // Combines legacy log tracking burns alongside your modern workout log database stream
  const totalBurned = logs.filter((log) => log.type === "gym").reduce((sum, log) => sum + Math.abs(log.calories || 0), 0) + totalExerciseKcalBurned;
  
  const netCalories = totalConsumed - totalBurned;
  const totalProtein = logs.reduce((sum, log) => sum + (log.protein || 0), 0);
  const proteinGoalMet = totalProtein >= PROTEIN_GOAL;
  const progress = Math.min(Math.max(netCalories / targetCals, 0), 1); // Clamp progression range safely between 0-1
  const R = 90;
  const C = 2 * Math.PI * R;
  const offset = C - progress * C;

  async function addEntry() {
    if (!name.trim()) return;
    const entry = {
      name: name.trim(),
      calories,
      protein,
      sugar,
      type: "food",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      timestamp: serverTimestamp(),
    };

    if (user) {
      const docRef = await addDoc(collection(db, "users", user.uid, "daily_logs"), entry);
      setLogs((prev) => [{ id: docRef.id, ...entry }, ...prev]);
    } else {
      setLogs((prev) => [{ id: Date.now().toString(), ...entry }, ...prev]);
    }

    if (saveMeal) {
      const meal = { name: entry.name, calories, protein, sugar };
      if (user) {
        const mealRef = await addDoc(collection(db, "users", user.uid, "saved_meals"), meal);
        setSavedMeals((prev) => [{ id: mealRef.id, ...meal }, ...prev]);
      } else {
        setSavedMeals((prev) => [{ id: Date.now().toString() + "-meal", ...meal }, ...prev]);
      }
    }

    setName("");
    setCalories(300);
    setProtein(20);
    setSugar(5);
    setSaveMeal(false);
    setShowForm(false);
  }

  async function logSavedMeal(meal) {
    const entry = {
      name: meal.name,
      calories: meal.calories,
      protein: meal.protein,
      sugar: meal.sugar,
      type: "food",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      timestamp: serverTimestamp(),
    };

    if (user) {
      const docRef = await addDoc(collection(db, "users", user.uid, "daily_logs"), entry);
      setLogs((prev) => [{ id: docRef.id, ...entry }, ...prev]);
    } else {
      setLogs((prev) => [{ id: Date.now().toString(), ...entry }, ...prev]);
    }

    setShowSaved(false);
  }

  async function deleteSavedMeal(id) {
    if (user) {
      await deleteDoc(doc(db, "users", user.uid, "saved_meals", id));
    }
    setSavedMeals((prev) => prev.filter((meal) => meal.id !== id));
  }

  async function deleteEntry(id) {
    if (user) {
      await deleteDoc(doc(db, "users", user.uid, "daily_logs", id));
    }
    setLogs((prev) => prev.filter((log) => log.id !== id));
  }

  return (
    <div className="space-y-6" style={{ animation: "fadeSlideUp 0.35s ease forwards" }}>
      <div>
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "Space Grotesk,sans-serif" }}>Diet Tracker</h1>
        <p className="text-white/40 text-sm mt-0.5">Today's nutrition</p>
      </div>

      {proteinGoalMet && (
        <div className="rounded-2xl px-4 py-3 flex items-center gap-3 border border-emerald-500/30"
          style={{ background: "rgba(16,185,129,0.08)", animation: "pulseBadge 2s ease-in-out infinite" }}>
          <Trophy className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <div>
            <p className="text-emerald-400 font-semibold text-sm">Protein Goal Crushed! 🎉</p>
            <p className="text-white/40 text-xs">{totalProtein}g / {PROTEIN_GOAL}g — muscle-building threshold hit</p>
          </div>
        </div>
      )}

      <div className="rounded-3xl p-6 flex flex-col items-center gap-4 border border-white/5"
        style={{ background: "rgba(11,21,41,0.7)", backdropFilter: "blur(16px)" }}>
        <div className="relative">
          <svg width="220" height="220" className="-rotate-90">
            <circle cx="110" cy="110" r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="14" />
            <circle cx="110" cy="110" r={R} fill="none" stroke="#f59e0b" strokeWidth="8" strokeLinecap="round"
              strokeDasharray={C} strokeDashoffset={C - (Math.min(totalBurned / targetCals, 1) * C)}
              style={{ transition: "stroke-dashoffset 1s ease" }} />
            <circle cx="110" cy="110" r={R} fill="none" stroke="url(#rg)" strokeWidth="14" strokeLinecap="round"
              strokeDasharray={C} strokeDashoffset={offset}
              style={{ transition: "stroke-dashoffset 1s ease" }} />
            <defs>
              <linearGradient id="rg" x1="0%" y1="0%" x2="100%" y2="0">
                <stop offset="0%" stopColor="#10b981" /><stop offset="100%" stopColor="#34d399" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ transform: "rotate(0deg)" }}>
            <p className="text-4xl font-bold text-white font-mono">{netCalories}</p>
            <p className="text-white/30 text-xs mt-1">of {targetCals} kcal</p>
            <p className="text-emerald-400 text-xs font-medium mt-0.5">{targetCals - netCalories} left</p>
          </div>
        </div>

        <div className="w-full grid grid-cols-3 gap-3">
          {[
            { label: "Eaten",   val: `${totalConsumed} kcal`, color: "text-emerald-400" },
            { label: "Burned",  val: `${totalBurned} kcal`,   color: "text-amber-400"   },
            { label: "Protein", val: `${totalProtein}g`,      color: "text-blue-400"    },
          ].map(({ label, val, color }) => (
            <div key={label} className="rounded-xl p-3 text-center border border-white/5"
              style={{ background: "rgba(255,255,255,0.04)" }}>
              <p className={`text-sm font-bold ${color} font-mono`}>{val}</p>
              <p className="text-white/25 text-xs mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => { setShowForm((v) => !v); setShowSaved(false); }}
          className="flex items-center justify-center gap-2 py-3.5 rounded-2xl text-white font-semibold text-sm transition-all"
          style={{ background: "linear-gradient(135deg,#10b981,#059669)", boxShadow: "0 0 20px rgba(16,185,129,0.2)" }}>
          <Plus className="w-4 h-4" /> Log Meal
        </button>
        <button onClick={() => { setShowSaved((v) => !v); setShowForm(false); }}
          className="flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-white/10 text-white/70 font-semibold text-sm hover:bg-white/10 transition-all">
          <Bookmark className="w-4 h-4 text-amber-400" /> Saved Meals
        </button>
      </div>

      {showSaved && (
        <div className="rounded-2xl border border-white/10 overflow-hidden" style={{ background: "rgba(11,21,41,0.7)" }}>
          <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
            <p className="text-white font-semibold text-sm">Quick-Log Saved Meals</p>
            <span className="text-white/30 text-xs">{savedMeals.length} meals</span>
          </div>
          {savedMeals.length === 0 ? (
            <p className="text-white/30 text-sm text-center py-6">No saved meals yet. Log a meal and check "Save for later".</p>
          ) : (
            savedMeals.map((meal) => (
              <div key={meal.id} className="flex items-center gap-3 px-4 py-3 border-b border-white/5 last:border-0">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center flex-shrink-0">
                  <Star className="w-4 h-4 text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{meal.name}</p>
                  <p className="text-white/30 text-xs font-mono">P: {meal.protein}g · {meal.calories} kcal</p>
                </div>
                <button onClick={() => logSavedMeal(meal)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/30 transition-colors flex-shrink-0">
                  + Log
                </button>
                <button onClick={() => deleteSavedMeal(meal.id)}
                  className="p-1.5 rounded-lg hover:bg-red-500/20 transition-colors">
                  <Trash2 className="w-3.5 h-3.5 text-white/20 hover:text-red-400" />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {showForm && (
        <div className="rounded-2xl p-5 space-y-5 border border-white/10"
          style={{ background: "rgba(11,21,41,0.7)", animation: "fadeSlideUp 0.35s ease forwards" }}>
          <h3 className="text-white font-semibold">New Food Entry</h3>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Food name…"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/25 text-sm outline-none focus:border-emerald-500/60 transition-colors" />

          {[
            { label: "Calories", val: calories, setVal: setCalories, min: 50, max: 1500, step: 10, color: "text-amber-400" },
            { label: "Protein", val: protein, setVal: setProtein, min: 0, max: 100, step: 1, color: "text-emerald-400" },
            { label: "Sugar", val: sugar, setVal: setSugar, min: 0, max: 80, step: 1, color: "text-blue-400" },
          ].map(({ label, val, setVal, min, max, step, color }) => (
            <div key={label}>
              <div className="flex justify-between text-xs mb-2">
                <span className="text-white/40">{label}</span>
                <span className={`${color} font-bold font-mono`}>{val}{label === "Calories" ? " kcal" : "g"}</span>
              </div>
              <input type="range" min={min} max={max} step={step} value={val}
                onChange={(e) => setVal(Number(e.target.value))}
                className="w-full accent-emerald-500" />
            </div>
          ))}

          <button onClick={() => setSaveMeal((v) => !v)}
            className={`w-full flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all text-sm font-medium ${saveMeal ? "bg-amber-500/15 border-amber-500/30 text-amber-400" : "border-white/10 text-white/40 hover:bg-white/5"}`}>
            <Bookmark className="w-4 h-4" />
            {saveMeal ? "Will save to quick-log meals ✓" : "Save for quick-log next time"}
          </button>

          <button onClick={addEntry}
            className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-colors"
            style={{ background: "linear-gradient(135deg,#10b981,#059669)" }}>
            Add Entry
          </button>
        </div>
      )}

      <div className="space-y-3">
        <h3 className="text-white/40 text-xs font-medium uppercase tracking-wider">Today's Log</h3>
        {logs.length === 0 ? (
          <p className="text-white/30 text-sm text-center py-6">No entries yet. Use the button above to track your meal.</p>
        ) : (
          logs.map((log) => (
            <div key={log.id}
              className={`rounded-2xl px-4 py-3.5 flex items-center gap-3 border ${log.type === "gym" ? "border-amber-500/15" : "border-white/5"}`}
              style={{ background: "rgba(11,21,41,0.6)" }}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${log.type === "gym" ? "bg-amber-500/15" : "bg-emerald-500/15"}`}>
                {log.type === "gym" ? <Flame className="w-5 h-5 text-amber-400" /> : <Beef className="w-5 h-5 text-emerald-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{log.name}</p>
                <p className="text-white/30 text-xs mt-0.5 font-mono">
                  {log.type === "food" ? `P: ${log.protein}g · S: ${log.sugar}g` : "Burn credited"} · {log.time}
                </p>
              </div>
              <p className={`text-sm font-bold flex-shrink-0 font-mono ${log.calories < 0 ? "text-amber-400" : "text-emerald-400"}`}>
                {log.calories < 0 ? "" : "+"}{log.calories} kcal
              </p>
              <button onClick={() => deleteEntry(log.id)}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                <Trash2 className="w-4 h-4 text-white/40" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}