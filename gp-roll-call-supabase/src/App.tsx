import { supabase } from "../utils/supabase-client";
import { useAuth } from "./hooks/useAuth";
import "./App.css";
import Button from "./components/ui/Button/Button";
import Login from "./components/Login/Login";

function App() {
  const { session, loading } = useAuth();

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (loading) return <div>Loading...</div>;

  return session ? (
    <div>
      <h1>Welcome, {session.user.email}</h1>
      <Button onClick={handleLogout}>Logout</Button>
    </div>
  ) : (
    <Login />
  );
}

export default App;
