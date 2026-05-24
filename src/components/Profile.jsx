import { useEffect, useState } from "react";
import { User, Ruler, Weight, Target, Save, CheckCircle2 } from "lucide-react";
import { useAuth } from "../AuthContext";
import { db } from "../firebase";
import { doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";

// ── FIREBASE PROFILE STORAGE ───────────────────────────────────────────────────
// Profile is stored in Firestore under `user_profile/{user.uid}`.
// onSnapshot updates the UI live when the logged-in user saves their data.
// ─────────────────────────────────────────────────────────────────────────────

export default function Profile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState({
    name:           "Alex Johnson",
    heightCm:       178,
    weightKg:       80,
    targetCalories: 2400,
    proteinGoal:    150,
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
  if (!user) return;
  
  const fetchProfile = async () => {
    const profileRef = doc(db, "user_profile", user.uid);
    const snap = await getDoc(profileRef);
    if (snap.exists()) {
      setProfile(snap.data());
    }
  };

  fetchProfile();
}, [user]);

  async function save() {
    if (!user) return;
    await setDoc(doc(db, "user_profile", user.uid), profile, { merge: true });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const fields = [
    { key:"heightCm",       label:"Height",          unit:"cm",   icon: Ruler,   min:140, max:220, color:"text-blue-400",    slider:"slider-blue"    },
    { key:"weightKg",       label:"Body Weight",     unit:"kg",   icon: Weight,  min:40,  max:180, color:"text-amber-400",   slider:"slider-amber"   },
    { key:"targetCalories", label:"Calorie Target",  unit:"kcal", icon: Target,  min:1200,max:4000,color:"text-emerald-400", slider:"slider-emerald" },
    { key:"proteinGoal",    label:"Protein Goal",    unit:"g",    icon: User,    min:50,  max:300, color:"text-blue-400",    slider:"slider-blue"    },
  ];

  return (
    <div className="space-y-6 fade-slide-up">
      <div>
        <h1 className="text-2xl font-bold text-white" style={{fontFamily:'Space Grotesk,sans-serif'}}>Profile</h1>
        <p className="text-white/40 text-sm mt-0.5">Your biometric baseline</p>
      </div>

      {/* Avatar card */}
      <div className="glass rounded-3xl p-6 border border-white/5 flex items-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center flex-shrink-0">
          <User className="w-8 h-8 text-white" />
        </div>
        <div className="flex-1">
          <input value={profile.name} onChange={e => setProfile(p => ({...p, name: e.target.value}))}
            className="bg-transparent text-white font-bold text-xl outline-none border-b border-transparent
              focus:border-emerald-500/60 transition-colors pb-0.5 w-full"
            placeholder="Your name" />
          <p className="text-white/40 text-sm mt-1">
            {user?.email || "user@example.com"}
          </p>
        </div>
      </div>

      {/* Metric sliders */}
      <div className="space-y-4">
        {fields.map(({ key, label, unit, icon: Icon, min, max, color, slider }) => (
          <div key={key} className="glass rounded-2xl p-5 border border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon className={`w-4 h-4 ${color}`} />
                <span className="text-white/60 text-sm">{label}</span>
              </div>
              <span className={`${color} font-bold text-lg`}>
                {profile[key]} <span className="text-sm font-normal text-white/30">{unit}</span>
              </span>
            </div>
            <input type="range" min={min} max={max}
              value={profile[key]}
              onChange={e => setProfile(p => ({...p, [key]: +e.target.value}))}
              className={`macro-slider ${slider}`} />
            <div className="flex justify-between text-xs text-white/20">
              <span>{min}{unit}</span><span>{max}{unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Save button */}
      <button onClick={save}
        className={`w-full py-4 rounded-2xl font-bold text-white transition-all micro-btn flex items-center justify-center gap-2
          ${saved
            ? "bg-emerald-500 glow-emerald"
            : "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500"}`}>
        {saved ? <><CheckCircle2 className="w-5 h-5" /> Saved!</> : <><Save className="w-5 h-5" /> Save Profile</>}
      </button>

      {/* Biometric summary */}
      <div className="glass rounded-2xl p-5 border border-white/5 space-y-3">
        <h3 className="text-white/50 text-xs uppercase tracking-wider">BMI Estimate</h3>
        <div className="flex items-center justify-between">
          <p className="text-white/60 text-sm">Body Mass Index</p>
          <p className="text-white font-bold text-lg">
            {(profile.weightKg / ((profile.heightCm/100) ** 2)).toFixed(1)}
          </p>
        </div>
        <div className="h-2 rounded-full bg-white/5 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500"
            style={{ width: `${Math.min(((profile.weightKg / ((profile.heightCm/100)**2)) / 35) * 100, 100)}%`, transition:"width 0.5s ease" }} />
        </div>
        <p className="text-white/30 text-xs text-center">
          {/* 🔥 FIREBASE: This whole card recalculates live as user slides weight/height,
              and those values auto-push to Firestore via setDoc in save() */}
          Updates instantly when you save
        </p>
      </div>
    </div>
  );
}