import { useNavigate } from "react-router-dom";
import { Plus, ChevronRight, Dumbbell } from "lucide-react";
import { useState } from "react";

const MUSCLE_GROUPS = [
  { name: "Arms",       exercises: ["Barbell Curl", "Tricep Pushdown", "Arm Curl", "Cable Bicep Curl" , "Pull-Up Machine" ,"Assisted Dip" ] },
  { name: "Chest",      exercises: ["Seated Chest Press", "Incline Chest Press Machine", "Cable Fly", "Chest Dip"] },
  { name: "Legs",       exercises: ["Squat", "Leg Press", "Romanian Deadlift", "Leg Curl"] },
  { name: "Shoulders",  exercises: ["Seated Shoulder Press", "Lateral Raise", "Front Raise", "Pull"] },
  { name: "Abs & Core", exercises: ["Cable Crunch", "Hanging Leg Raise", "Plank", "Ab Rollout"] },
];

export default function WorkoutSelect() {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(null);
  const [customInput, setCustomInput] = useState("");
  const [customList, setCustomList] = useState([]);

  function selectExercise(exercise) {
    // Pass exercise to GymSession via state
    navigate("/gym", { state: { selectedExercise: exercise } });
  }

  function addCustom() {
    if (!customInput.trim()) return;
    setCustomList(prev => [...prev, customInput.trim()]);
    setCustomInput("");
  }

  return (
    <div className="space-y-6 fade-slide-up">
      <div>
        <h1 className="text-2xl font-bold text-white" style={{fontFamily:'Space Grotesk,sans-serif'}}>Select Exercise</h1>
        <p className="text-white/40 text-sm mt-0.5">Choose a muscle group to begin</p>
      </div>

      {/* Muscle group cards */}
      {MUSCLE_GROUPS.map(group => (
        <div key={group.name} className="glass rounded-2xl border border-white/5 overflow-hidden">
          <button onClick={() => setExpanded(expanded === group.name ? null : group.name)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/15 flex items-center justify-center">
                <Dumbbell className="w-5 h-5 text-blue-400" />
              </div>
              <span className="text-white font-semibold">{group.name}</span>
            </div>
            <ChevronRight className={`w-5 h-5 text-white/40 transition-transform ${expanded === group.name ? "rotate-90" : ""}`} />
          </button>

          {expanded === group.name && (
            <div className="border-t border-white/5 px-5 pb-4 space-y-2 fade-slide-up">
              {group.exercises.map(ex => (
                <button key={ex} onClick={() => selectExercise(ex)}
                  className="w-full text-left px-4 py-2.5 rounded-xl bg-white/5 hover:bg-blue-500/15
                    text-white/70 hover:text-blue-400 text-sm transition-all micro-btn">
                  {ex}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Custom exercise append */}
      <div className="glass rounded-2xl p-5 border border-white/5 space-y-3">
        <h3 className="text-white/60 text-sm font-medium uppercase tracking-wider">Custom Exercise</h3>
        <div className="flex gap-3">
          <input value={customInput} onChange={e => setCustomInput(e.target.value)}
            placeholder="e.g. Smith Machine Squat…"
            onKeyDown={e => e.key === "Enter" && addCustom()}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5
              text-white placeholder:text-white/25 text-sm outline-none focus:border-blue-500/60 transition-colors" />
          <button onClick={addCustom}
            className="px-4 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-400 transition-colors micro-btn">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        {customList.map(ex => (
          <button key={ex} onClick={() => selectExercise(ex)}
            className="w-full text-left px-4 py-2.5 rounded-xl bg-white/5 hover:bg-blue-500/15
              text-white/70 hover:text-blue-400 text-sm transition-all micro-btn">
            {ex}
          </button>
        ))}
      </div>
    </div>
  );
}