import { supabase } from "../utils/supabase-client";
import { useAuth } from "./hooks/useAuth";
import { Routes, Route } from "react-router-dom";

import "./App.css";
import Button from "./components/ui/Button/Button";

import LoginPage from "./pages/LoginPage/LoginPage";
import HomePage from "./pages/HomePage/HomePage";
import PigPage from "./pages/PigPage/PigPage";
import FamilyTreePage from "./pages/FamilyTreePage/FamilyTreePage.tsx";

function App() {
  const { session, loading } = useAuth();

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (loading) return <div>Loading...</div>;

  if (!session) {
    return <LoginPage />;
  }

  return (
    <div className="wrapper">
      <header>
        <h1>Hayley's Herd</h1>
        <Button onClick={handleLogout}>Logout</Button>
      </header>

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/pigs/:id" element={<PigPage />} />
        <Route path="/tree" element={<FamilyTreePage />} />
      </Routes>
    </div>
  );
}

export default App;
