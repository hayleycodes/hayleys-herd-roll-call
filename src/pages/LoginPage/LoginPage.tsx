import { useState } from "react";
import { supabase } from "../../../utils/supabase-client";
import "./LoginPage.css";
import Input from "../../components/ui/Input/Input";
import logo from "../../assets/hh.png";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) setError(error.message);
  };

  return (
    <div className="loginPage">
      <form onSubmit={handleLogin} className="loginForm">
        <img src={logo} alt="Hayley's Herd logo" className="loginLogo" />
        <Input
          type="email"
          placeholder="email"
          value={email}
          onChange={setEmail}
          required
          name="email"
        />

        <Input
          type="password"
          placeholder="password"
          value={password}
          onChange={setPassword}
          required
          name="password"
        />

        {error && <p className="loginError">{error}</p>}

        <button type="submit">login</button>
      </form>
    </div>
  );
};

export default LoginPage;
