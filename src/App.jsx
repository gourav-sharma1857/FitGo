import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import NavDrawer from "./components/NavDrawer";
import DietTrack from "./components/DietTrack";
import GymSession from "./components/GymSession";
import WorkoutCalendar from "./components/WorkoutCalendar";
import Stats from "./components/Stats";
import Profile from "./components/Profile";
import AuthPage from "./components/AuthPage";
import { AuthProvider, useAuth } from "./AuthContext";
import "./index.css";

function RequireAuth() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="min-h-screen grid place-items-center text-white">Loading your session...</div>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}

function AppLayout() {
  return (
    <>
      <NavDrawer />
      <main className="pt-20 pb-8 px-4 max-w-lg mx-auto">
        <Outlet />
      </main>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<AuthPage />} />
          <Route element={<RequireAuth />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<DietTrack />} />
              <Route path="/gym" element={<GymSession />} />
              <Route path="/calendar" element={<WorkoutCalendar />} />
              <Route path="/stats" element={<Stats />} />
              <Route path="/profile" element={<Profile />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
