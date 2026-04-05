import "./App.css";
import { supabase } from "../utils/supabase-client";
import { useEffect, useState } from "react";
import Login from "./Login";
import Button from "./components/ui/Button/Button";

const App = () => {
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      },
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // ✅ logged in state derived from Supabase
  if (session) {
    return (
      <div className="welcome">
        <h1>Welcome!</h1>
        <Button onClick={handleLogout}>Sign Out</Button>
      </div>
    );
  }

  return <Login />;
};

export default App;
