import { useState, useEffect, useRef } from "react";
import { useAuth } from "../AuthContext";
import { db } from "../firebase";
import { addDoc, collection, doc, onSnapshot, serverTimestamp } from "firebase/firestore";
import {
  Plus, CheckCircle2, Timer, X, Dumbbell, Flame, ChevronRight,
  Clock, Trophy, Play, Pause, Trash2, ArrowUp, ArrowDown, Shuffle, FastForward
} from "lucide-react";

const REST_SECONDS = 60;

const MUSCLE_GROUPS = {
  Arms: [
    "Seated Bicep Curl Machine",
    "Preacher Curl Bench (with EZ-Bar or Dumbbells)",
    "Seated Overhead Tricep Extension Machine",
    "Seated Tricep Press Machine (Dip Machine)",
    "Assisted Tricep Dip Machine",
    "Cable Rope Tricep Pushdown",
    "Cable Straight-Bar Bicep Curl",
    "Cable Hammer Curl (Rope Attachment)",
    "Dumbbell Bicep Curl (Flat/Incline Bench)",
    "Dumbbell Hammer Curl",
    "Dumbbell Skullcrushers"
  ],
  Chest: [
    "Seated Machine Chest Press",
    "Seated Machine Incline Press",
    "Seated Pectoral Fly Machine",
    "Assisted Chest Dip Machine (Leaning Forward)",
    "High-to-Low Cable Fly (Targets Lower Chest)",
    "Low-to-High Cable Fly (Targets Upper Chest)",
    "Smith Machine Flat Bench Press",
    "Smith Machine Incline Bench Press",
    "Dumbbell Flat Bench Press",
    "Dumbbell Incline Bench Press",
    "Dumbbell Bench Flys"
  ],
  Legs: [
    "Seated Leg Press Machine",
    "Angled Leg Press Machine (Linear Press)",
    "Seated Leg Extension Machine (Targets Quads)",
    "Seated Leg Curl Machine (Targets Hamstrings)",
    "Lying Leg Curl Machine",
    "Hip Abductor Machine",
    "Hip Adductor Machine",
    "Seated Calf Raise Machine",
    "Smith Machine Squats",
    "Smith Machine Romanian Deadlifts (RDLs)",
    "Dumbbell Walking Lunges / Goblet Squats"
  ],
  Shoulders: [
    "Seated Machine Shoulder Press",
    "Seated Machine Lateral Raise",
    "Machine Rear Delt Fly",
    "Cable Lateral Raise (Single-Arm)",
    "Cable Face Pulls",
    "Cable Front Raise",
    "Smith Machine Seated Overhead Press",
    "Dumbbell Seated Shoulder Press",
    "Dumbbell Standing Lateral Raise",
    "Dumbbell Shrugs"
  ],
  Back: [
    "Deadlift", "Lat Pulldown", "Seated Row", "Bent-Over Row",
    "Pull-Up", "T-Bar Row", "Single-Arm DB Row", "Cable Row",
    "Face Pull", "Good Morning", "Rack Pull", "Chest-Supported Row"
  ],
  "Abs & Core": [
    "Seated Ab Crunch Machine",
    "Captain’s Chair / Power Tower",
    "Ab Coaster Machine",
    "Cable Woodchoppers",
    "Decline Ab Bench",
    "Floor Mats"
  ],
};

function calcCalories({ totalSets, avgReps, avgWeightLbs, durationMin, bodyWeightKg }) {
  const weightKg = avgWeightLbs * 0.453592;
  const mechanicalWorkJ = totalSets * avgReps * weightKg * 0.7 * 9.81;
  const metabolicEfficiency = 0.22;
  const workKcal = mechanicalWorkJ / (4184 * metabolicEfficiency);
  const stabilizationCost = (bodyWeightKg || 80) * durationMin * 0.0008;
  return +(workKcal + stabilizationCost + 2.5).toFixed(1);
}

function formatTime(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// ── EXERCISE PICKER MODAL ──
function ExercisePicker({ onSelect, onClose }) {
  const [expanded, setExpanded] = useState(null);
  const [customInput, setCustomInput] = useState("");
  const [customList, setCustomList] = useState([]);

  function addCustom() {
    if (!customInput.trim()) return;
    setCustomList(prev => [...prev, customInput.trim()]);
    setCustomInput("");
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end justify-center">
      <div className="w-full max-w-lg bg-[#0b1529] border border-white/10 rounded-t-3xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0">
          <p className="text-white font-bold text-lg">Select Exercise</p>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 text-white/60"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-5 pt-4 pb-2 flex-shrink-0">
          <div className="flex gap-2">
            <input value={customInput} onChange={e => setCustomInput(e.target.value)}
              placeholder="Custom exercise name…" onKeyDown={e => e.key === "Enter" && addCustom()}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-white/25 text-sm outline-none focus:border-blue-500/60" />
            <button onClick={addCustom} className="px-4 rounded-xl bg-blue-500 text-white"><Plus className="w-4 h-4" /></button>
          </div>
          {customList.map(ex => (
            <button key={ex} onClick={() => onSelect(ex)} className="w-full text-left px-4 py-2 mt-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm">
              ✦ {ex}
            </button>
          ))}
        </div>
        <div className="overflow-y-auto flex-1 px-5 pb-6 space-y-2">
          {Object.entries(MUSCLE_GROUPS).map(([group, exercises]) => (
            <div key={group} className="rounded-2xl border border-white/5 bg-white/[0.01]">
              <button onClick={() => setExpanded(expanded === group ? null : group)} className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-white/5">
                <span className="text-white font-medium text-sm">{group}</span>
                <ChevronRight className={`w-4 h-4 text-white/40 transition-transform ${expanded === group ? "rotate-90" : ""}`} />
              </button>
              {expanded === group && (
                <div className="border-t border-white/5 px-4 pb-3 grid grid-cols-2 gap-2 pt-2 bg-black/20">
                  {exercises.map(ex => (
                    <button key={ex} onClick={() => onSelect(ex)} className="text-left px-3 py-2 rounded-xl bg-white/5 text-white/60 text-xs hover:text-blue-400">
                      {ex}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function GymSession() {
  const { user } = useAuth();
  const [phase, setPhase] = useState("idle"); // idle, setup, active, rest, next_workout_prompt, done
  const [showPicker, setShowPicker] = useState(false);
  const [routine, setRoutine] = useState([]); // Array of { name, targetSets, targetReps, defaultWeight, loggedSets: [] }
  const [activeIdx, setActiveIdx] = useState(0);

  // Live trackers
  const [weight, setWeight] = useState(100);
  const [reps, setReps] = useState(8);
  const [restLeft, setRestLeft] = useState(REST_SECONDS);
  const [restPaused, setRestPaused] = useState(false);
  const [sessionElapsed, setSessionElapsed] = useState(0);
  const [profileData, setProfileData] = useState({ weightKg: 80, heightCm: 178, targetCalories: 2400, proteinGoal: 150 });

  const sessionTimerRef = useRef(null);
  const restTimerRef = useRef(null);

  // Stopwatch effect
  useEffect(() => {
    if (["active", "rest", "next_workout_prompt"].includes(phase)) {
      sessionTimerRef.current = setInterval(() => setSessionElapsed(e => e + 1), 1000);
    }
    return () => clearInterval(sessionTimerRef.current);
  }, [phase]);

  // Rest timer effect
  useEffect(() => {
    if (phase === "rest" && !restPaused) {
      restTimerRef.current = setInterval(() => {
        setRestLeft(prev => {
          if (prev <= 1) {
            clearInterval(restTimerRef.current);
            setPhase("active");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(restTimerRef.current);
    }
    return () => clearInterval(restTimerRef.current);
  }, [phase, restPaused]);

  // ── ROUTINE CREATION & ORDERING ENGINE ──
  function handleAddExerciseToRoutine(name) {
    setRoutine(prev => [...prev, {
      name,
      targetSets: 4,
      targetReps: 10,
      defaultWeight: 100,
      loggedSets: []
    }]);
    setShowPicker(false);
  }

  function modifyRoutineField(index, field, change) {
    setRoutine(prev => prev.map((item, i) => i === index ? { ...item, [field]: Math.max(1, item[field] + change) } : item));
  }

  function moveRoutineItem(index, direction) {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === routine.length - 1) return;
    const nextIdx = direction === "up" ? index - 1 : index + 1;
    const updated = [...routine];
    const target = updated[index];
    updated[index] = updated[nextIdx];
    updated[nextIdx] = target;
    setRoutine(updated);
  }

  function removeRoutineItem(index) {
    setRoutine(prev => prev.filter((_, i) => i !== index));
  }

  // ── WORKOUT EXECUTION LOGIC ──
  function beginConfiguredWorkout() {
    if (routine.length === 0) return;
    setActiveIdx(0);
    setWeight(routine[0].defaultWeight);
    setReps(routine[0].targetReps);
    setPhase("active");
  }

  async function persistSessionToFirestore(finalRoutine) {
    if (!user) return;

    const totalSets = finalRoutine.reduce((sum, ex) => sum + ex.loggedSets.length, 0);
    const totalReps = finalRoutine.reduce((sum, ex) => sum + ex.loggedSets.reduce((acc, set) => acc + set.reps, 0), 0);
    const totalWeightEntries = finalRoutine.reduce((sum, ex) => sum + ex.loggedSets.reduce((acc, set) => acc + set.weight, 0), 0);
    const totalVolume = finalRoutine.reduce((sum, ex) => sum + ex.loggedSets.reduce((acc, set) => acc + set.weight * set.reps, 0), 0);
    const avgWeightLbs = totalSets > 0 ? totalWeightEntries / totalSets : 0;
    const avgReps = totalSets > 0 ? totalReps / totalSets : 0;
    const kcal = calcCalories({ totalSets, avgReps, avgWeightLbs, durationMin: sessionElapsed / 60, bodyWeightKg: profileData.weightKg });

    const exercises = finalRoutine.map((ex) => ({
      name: ex.name,
      targetSets: ex.targetSets,
      targetReps: ex.targetReps,
      defaultWeight: ex.defaultWeight,
      loggedSets: ex.loggedSets,
    }));

    const payload = {
      userId: user.uid,
      completedAt: serverTimestamp(),
      kcal: Math.round(kcal),
      durationMinutes: Math.round(sessionElapsed / 60),
      exercises,
      exercisesSummary: finalRoutine.map((ex) => ex.name).join(", "),
      majorMuscle: finalRoutine.length > 0 ? finalRoutine[0].name : "Full Body",
      totalVolume,
      setsCount: totalSets,
      createdAt: serverTimestamp(),
    };

    await addDoc(collection(db, "workout_logs"), payload);
  }

  async function logSet() {
    const currentEx = routine[activeIdx];
    const updatedSet = { weight, reps };

    const nextRoutine = routine.map((ex, i) =>
      i === activeIdx ? { ...ex, loggedSets: [...ex.loggedSets, updatedSet] } : ex
    );

    setRoutine(nextRoutine);

    const setsCompletedNext = currentEx.loggedSets.length + 1;

    if (setsCompletedNext >= currentEx.targetSets) {
      if (activeIdx < routine.length - 1) {
        setPhase("next_workout_prompt");
      } else {
        clearInterval(sessionTimerRef.current);
        try {
          await persistSessionToFirestore(nextRoutine);
        } catch (error) {
          console.error("Failed saving workout log:", error);
        }
        setPhase("done");
      }
    } else {
      setRestLeft(REST_SECONDS);
      setRestPaused(false);
      setPhase("rest");
    }
  }

  function handleProceedToNextWorkout() {
    const nextIdx = activeIdx + 1;
    setActiveIdx(nextIdx);
    setWeight(routine[nextIdx].defaultWeight);
    setReps(routine[nextIdx].targetReps);
    setPhase("active");
  }

  useEffect(() => {
    if (!user) return;
    const profileRef = doc(db, "user_profile", user.uid);
    const unsubscribe = onSnapshot(profileRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setProfileData({
          weightKg: data.weightKg || 80,
          heightCm: data.heightCm || 178,
          targetCalories: data.targetCalories || 2400,
          proteinGoal: data.proteinGoal || 150,
        });
      }
    });
    return () => unsubscribe();
  }, [user]);

  // Summary Math helpers
  const summaryStats = (() => {
    let vol = 0, sets = 0, totalReps = 0, weightSum = 0;
    routine.forEach(ex => {
      ex.loggedSets.forEach(s => {
        vol += s.weight * s.reps;
        sets++;
        totalReps += s.reps;
        weightSum += s.weight;
      });
    });
    const avgW = sets > 0 ? weightSum / sets : 0;
    const avgReps = sets > 0 ? totalReps / sets : 0;
    const kcal = calcCalories({ totalSets: sets, avgReps, avgWeightLbs: avgW, durationMin: sessionElapsed / 60, bodyWeightKg: profileData.weightKg });
    return { vol, sets, kcal };
  })();

  // ── PHASE 1: IDLE / ENTRY ──
  if (phase === "idle") {
    return (
      <div className="max-w-lg mx-auto px-4 pt-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white font-['Space_Grotesk']">Gym Workspace</h1>
          <p className="text-white/40 text-sm">Establish your agenda before launching tracking.</p>
        </div>
        <div className="rounded-3xl p-8 border border-white/5 bg-[#0b1529]/70 backdrop-blur-xl flex flex-col items-center text-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <Dumbbell className="w-8 h-8 text-blue-400" />
          </div>
          <div>
            <h2 className="text-white font-bold text-lg">Plan Workout Lineup</h2>
            <p className="text-white/30 text-xs mt-2 px-4">Assemble your exercises, target ranges, and track execution progression sequentially.</p>
          </div>
          <button onClick={() => setPhase("setup")} className="w-full py-4 rounded-xl text-white font-semibold bg-gradient-to-r from-blue-500 to-blue-600 shadow-lg shadow-blue-500/10">
            Create Workout Plan
          </button>
        </div>
      </div>
    );
  }

  // ── PHASE 2: PRE-WORKOUT SETUP ROUTINE ──
  if (phase === "setup") {
    return (
      <div className="max-w-lg mx-auto px-4 pt-4 space-y-5 pb-24">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Configure Routine Queue</h1>
            <p className="text-white/40 text-xs mt-0.5">Determine workflow targets and presentation sequence</p>
          </div>
          <button onClick={() => setPhase("idle")} className="p-2 text-white/40 hover:text-white"><X className="w-4 h-4" /></button>
        </div>

        <button onClick={() => setShowPicker(true)} className="w-full py-3 border border-dashed border-white/10 rounded-2xl text-blue-400 text-xs font-semibold bg-blue-500/5 hover:bg-blue-500/10 flex items-center justify-center gap-2">
          <Plus className="w-4 h-4" /> Add Exercise Blocks
        </button>

        <div className="space-y-3">
          {routine.map((item, index) => (
            <div key={index} className="rounded-2xl border border-white/5 bg-[#0b1529]/40 p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-5 h-5 rounded bg-white/5 text-[10px] text-white/40 flex items-center justify-center font-mono">{index + 1}</span>
                  <p className="text-white font-medium text-sm truncate">{item.name}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => moveRoutineItem(index, "up")} disabled={index === 0} className="p-1.5 rounded-lg bg-white/5 text-white/40 disabled:opacity-20"><ArrowUp className="w-3.5 h-3.5" /></button>
                  <button onClick={() => moveRoutineItem(index, "down")} disabled={index === routine.length - 1} className="p-1.5 rounded-lg bg-white/5 text-white/40 disabled:opacity-20"><ArrowDown className="w-3.5 h-3.5" /></button>
                  <button onClick={() => removeRoutineItem(index)} className="p-1.5 rounded-lg bg-red-500/10 text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { field: "targetSets", label: "Sets", step: 1 },
                  { field: "targetReps", label: "Reps", step: 1 },
                  { field: "defaultWeight", label: "Lbs", step: 5 },
                ].map((config) => (
                  <div key={config.field} className="rounded-xl bg-white/[0.02] border border-white/5 p-2 text-center">
                    <p className="text-[10px] text-white/30 uppercase tracking-wider">{config.label}</p>
                    <p className="text-sm font-bold text-white font-mono my-1">{item[config.field]}</p>
                    <div className="flex gap-1">
                      <button onClick={() => modifyRoutineField(index, config.field, -config.step)} className="flex-1 py-0.5 rounded bg-white/5 text-xs text-white/60">-</button>
                      <button onClick={() => modifyRoutineField(index, config.field, config.step)} className="flex-1 py-0.5 rounded bg-white/5 text-xs text-white/60">+</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {routine.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto p-4 bg-[#070e1b] border-t border-white/5">
            <button onClick={beginConfiguredWorkout} className="w-full py-4 rounded-xl text-white font-bold text-sm bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-md">
              Start Active Track ({routine.length} Blocks)
            </button>
          </div>
        )}

        {showPicker && <ExercisePicker onSelect={handleAddExerciseToRoutine} onClose={() => setShowPicker(false)} />}
      </div>
    );
  }

  // ── PHASE 3: ACTIVE TRACKING WORKPLACE ──
  if (phase === "active") {
    const activeEx = routine[activeIdx];
    return (
      <div className="max-w-lg mx-auto px-4 pt-4 space-y-5">
        <div className="flex items-center justify-between">
          <div className="max-w-[70%]">
            <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md uppercase tracking-wider">Exercise {activeIdx + 1} of {routine.length}</span>
            <h1 className="text-lg font-bold text-white truncate mt-1">{activeEx?.name}</h1>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 text-blue-400 font-mono text-xs">
            <Clock className="w-3.5 h-3.5" /> {formatTime(sessionElapsed)}
          </div>
        </div>

        {/* Counter interface board */}
        <div className="rounded-3xl p-6 border border-white/5 bg-[#0b1529]/70 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Set Target: " + activeEx.targetSets, title: "Weight (lbs)", val: weight, setVal: setWeight, steps: [+5, -5], min: 5, color: "text-emerald-400" },
              { label: "Rep Target: " + activeEx.targetReps, title: "Reps", val: reps, setVal: setReps, steps: [+1, -1], min: 1, color: "text-blue-400" },
            ].map((cfg) => (
              <div key={cfg.title} className="space-y-1.5 text-center">
                <span className="text-[9px] px-2 py-0.5 rounded bg-white/5 text-white/40">{cfg.label}</span>
                <p className="text-white/40 text-[10px] uppercase font-semibold mt-1">{cfg.title}</p>
                <p className={`${cfg.color} text-4xl font-bold font-mono`}>{cfg.val}</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {cfg.steps.map(s => (
                    <button key={s} onClick={() => cfg.setVal(v => Math.max(cfg.min, v + s))} className="py-2 text-xs font-bold rounded-xl bg-white/5 text-white/80">
                      {s > 0 ? `+${s}` : s}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <button onClick={logSet} className="w-full py-4 rounded-xl text-white font-bold bg-gradient-to-r from-blue-500 to-blue-600 text-sm">
            Log Set {activeEx.loggedSets.length + 1} Complete
          </button>
        </div>

        {/* Local Feed */}
        <div className="space-y-2">
          <p className="text-white/30 text-xs uppercase tracking-wider font-semibold">Logged Sets History ({activeEx.loggedSets.length})</p>
          {activeEx.loggedSets.map((s, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/[0.02] text-xs">
              <span className="text-blue-400 font-mono font-bold">SET {i + 1}</span>
              <span className="text-white/60">{s.weight} lbs × {s.reps} reps</span>
              <span className="text-emerald-400 font-medium font-mono">{s.weight * s.reps} lbs vol</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── PHASE 4: INTER-SET REST & WEIGHT MODIFICATION CONTROLS ──
  if (phase === "rest") {
    const activeEx = routine[activeIdx];
    const ringR = 60, ringC = 2 * Math.PI * ringR;
    const ringOffset = ringC - (restLeft / REST_SECONDS) * ringC;

    return (
      <div className="max-w-lg mx-auto px-4 pt-4 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-base font-bold text-white">Inter-Set Recovery</h1>
          <span className="text-xs text-white/30 font-mono">{formatTime(sessionElapsed)}</span>
        </div>

        <div className="rounded-3xl p-6 border border-amber-500/10 bg-[#0b1529]/70 flex flex-col items-center gap-5">
          <div className="relative flex items-center justify-center">
            <svg width="140" height="140" className="-rotate-90">
              <circle cx="70" cy="70" r={ringR} fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="8" />
              <circle cx="70" cy="70" r={ringR} fill="none" stroke="#f59e0b" strokeWidth="8" strokeDasharray={ringC} strokeDashoffset={ringOffset} style={{ transition: "stroke-dashoffset 1s linear" }} />
            </svg>
            <div className="absolute text-center">
              <p className="text-3xl font-bold text-amber-400 font-mono">{restLeft}s</p>
              <p className="text-[9px] text-white/30 tracking-widest uppercase">Resting</p>
            </div>
          </div>

          {/* CRITICAL FEATURE REQUIREMENT: Prompt load alterations during break */}
          <div className="w-full text-center border-t border-white/5 pt-3">
            <p className="text-xs font-semibold text-white">Modify settings for Set {activeEx.loggedSets.length + 1}?</p>
            <p className="text-[10px] text-white/30 mt-0.5">Adjust target demands ahead of the countdown termination.</p>
          </div>

          <div className="w-full grid grid-cols-2 gap-3">
            {[
              { label: "Next Weight", val: weight, setVal: setWeight, step: 5 },
              { label: "Next Reps", val: reps, setVal: setReps, step: 1 }
            ].map(cfg => (
              <div key={cfg.label} className="p-3 rounded-xl border border-white/5 bg-white/[0.01] text-center">
                <span className="text-[10px] text-white/40">{cfg.label}</span>
                <p className="text-xl font-bold text-white font-mono my-1">{cfg.val}</p>
                <div className="flex gap-1">
                  <button onClick={() => cfg.setVal(v => Math.max(1, v - cfg.step))} className="flex-1 py-1 rounded bg-white/5 text-xs text-red-400">-</button>
                  <button onClick={() => cfg.setVal(v => Math.max(1, v + cfg.step))} className="flex-1 py-1 rounded bg-white/5 text-xs text-emerald-400">+</button>
                </div>
              </div>
            ))}
          </div>

          <div className="w-full grid grid-cols-2 gap-2.5">
            <button onClick={() => setRestPaused(p => !p)} className="py-2.5 rounded-xl border border-white/10 text-white/60 text-xs">
              {restPaused ? "Resume" : "Pause"}
            </button>
            <button onClick={() => setPhase("active")} className="py-2.5 rounded-xl bg-amber-500 text-white font-bold text-xs">
              Skip to Work Set
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── PHASE 5: DYNAMIC ROUTINE SELECTION PROMPT ──
  if (phase === "next_workout_prompt") {
    const finishedWorkout = routine[activeIdx];
    const incomingWorkout = routine[activeIdx + 1];

    return (
      <div className="max-w-lg mx-auto px-4 pt-4 space-y-6 pb-12">
        <div className="rounded-2xl p-4 border border-emerald-500/20 bg-emerald-500/5 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-emerald-400 text-xs font-bold uppercase tracking-wider">Exercise Complete</p>
            <p className="text-white/70 text-sm font-medium truncate">{finishedWorkout.name}</p>
          </div>
        </div>

        <div className="rounded-3xl p-6 border border-white/10 bg-[#0b1529] space-y-5">
          <div className="text-center">
            <p className="text-white/40 text-xs uppercase tracking-wider font-semibold">Up Next in Plan</p>
            <p className="text-white font-bold text-xl mt-1">{incomingWorkout.name}</p>
            <p className="text-blue-400 text-xs font-mono mt-1">{incomingWorkout.targetSets} Sets × {incomingWorkout.targetReps} Reps @ {incomingWorkout.defaultWeight} lbs</p>
          </div>

          {/* CRITICAL REQ: Queue Manipulation Choices */}
          <div className="space-y-2 border-t border-white/5 pt-4">
            <p className="text-white/30 text-[10px] uppercase font-bold tracking-wide mb-2">Modify Impending Schedule Layout</p>
            
            <button onClick={handleProceedToNextWorkout} className="w-full py-3.5 rounded-xl text-white font-bold text-sm bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center gap-2">
              <Play className="w-4 h-4" /> Start Next Workout Now
            </button>

            <button onClick={() => {
              // Deletion / Skip strategy
              const remaining = [...routine];
              remaining.splice(activeIdx + 1, 1);
              setRoutine(remaining);
              if (activeIdx >= remaining.length - 1) {
                setPhase("done");
              }
            }} className="w-full py-3 rounded-xl border border-red-500/20 text-red-400 text-xs font-semibold hover:bg-red-500/5 flex items-center justify-center gap-2">
              <Trash2 className="w-3.5 h-3.5" /> Remove Next Exercise From Routine
            </button>

            <button onClick={() => {
              // Shift positioning downwards / defer layout sequence
              if (activeIdx + 1 < routine.length - 1) {
                const targetPos = activeIdx + 1;
                const updated = [...routine];
                const tmp = updated[targetPos];
                updated[targetPos] = updated[targetPos + 1];
                updated[targetPos + 1] = tmp;
                setRoutine(updated);
              }
            }} disabled={activeIdx + 1 === routine.length - 1} className="w-full py-3 rounded-xl border border-white/5 text-white/60 text-xs disabled:opacity-20 flex items-center justify-center gap-2">
              <Shuffle className="w-3.5 h-3.5" /> Delay Sequence / Push Back
            </button>

            <button onClick={() => setShowPicker(true)} className="w-full py-3 rounded-xl border border-white/5 text-blue-400 text-xs flex items-center justify-center gap-2">
              <Plus className="w-3.5 h-3.5" /> Swap / Inject Alternate Exercise Block
            </button>
          </div>
        </div>

        {/* Routine List Forecast Layout */}
        <div className="space-y-2">
          <p className="text-white/30 text-xs font-bold uppercase tracking-wide">Upcoming Remainder Schedule Queue</p>
          {routine.slice(activeIdx + 1).map((item, idx) => (
            <div key={idx} className="p-3 rounded-xl border border-white/5 bg-white/[0.01] flex items-center justify-between text-xs text-white/50">
              <span className="truncate">{item.name}</span>
              <span className="font-mono text-white/30">({item.targetSets} sets)</span>
            </div>
          ))}
        </div>

        {showPicker && <ExercisePicker onSelect={(name) => {
          // Re-injection override execution swapping the element
          setRoutine(prev => prev.map((ex, i) => i === activeIdx + 1 ? { ...ex, name } : ex));
          setShowPicker(false);
        }} onClose={() => setShowPicker(false)} />}
      </div>
    );
  }

  // ── PHASE 6: SUMMARY REVIEW PROFILE ──
  if (phase === "done") {
    return (
      <div className="max-w-lg mx-auto px-4 pt-4 space-y-6 pb-12">
        <div className="flex items-center gap-2">
          <Trophy className="w-6 h-6 text-amber-400" />
          <h1 className="text-xl font-bold text-white">Workout Performance Saved!</h1>
        </div>

        <div className="rounded-3xl p-6 border border-white/5 bg-[#0b1529] space-y-4 text-center">
          <div className="grid grid-cols-3 gap-2">
            <div className="p-3 bg-white/5 rounded-xl">
              <Clock className="w-4 h-4 text-blue-400 mx-auto mb-1" />
              <p className="text-base font-bold text-white font-mono">{formatTime(sessionElapsed)}</p>
              <span className="text-[10px] text-white/30">TIME</span>
            </div>
            <div className="p-3 bg-white/5 rounded-xl">
              <Dumbbell className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
              <p className="text-base font-bold text-white font-mono">{summaryStats.sets}</p>
              <span className="text-[10px] text-white/30">SETS DONE</span>
            </div>
            <div className="p-3 bg-white/5 rounded-xl">
              <Flame className="w-4 h-4 text-amber-400 mx-auto mb-1" />
              <p className="text-base font-bold text-white font-mono">{Math.round(summaryStats.kcal)}</p>
              <span className="text-[10px] text-white/30">KCAL BURN</span>
            </div>
          </div>
          <div className="pt-2">
            <p className="text-[10px] text-white/30 uppercase tracking-widest">Aggregate Mass Moved</p>
            <p className="text-2xl font-bold text-emerald-400 font-mono mt-0.5">{summaryStats.vol.toLocaleString()} <span className="text-xs text-white/40">lbs</span></p>
          </div>
        </div>

        <button onClick={() => { setPhase("idle"); setRoutine([]); setSessionElapsed(0); }} className="w-full py-3.5 bg-emerald-500 text-white text-sm font-bold rounded-xl">
          Return to Dashboard
        </button>
      </div>
    );
  }
}