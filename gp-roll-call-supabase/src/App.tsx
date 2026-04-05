import { supabase } from "../utils/supabase-client";
import { useAuth } from "./hooks/useAuth";
import "./App.css";
import Button from "./components/ui/Button/Button";
import LoginPage from "./pages/LoginPage/LoginPage";
import HomePage from "./pages/HomePage/HomePage";

function App() {
  const { session, loading } = useAuth();

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (loading) return <div>Loading...</div>;

  return session ? (
    <div className="wrapper">
      <header>
        <h1>Hayley's Herd</h1>
        <Button onClick={handleLogout}>Logout</Button>
      </header>
      <HomePage />
    </div>
  ) : (
    <LoginPage />
  );
}

export default App;
