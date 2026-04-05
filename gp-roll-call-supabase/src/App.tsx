import { useCallback, useEffect, useState } from "react";
import "./App.css";
import { supabase } from "../utils/supabase-client";

function App() {
  const [error, setError] = useState("");
  const [pigList, setPigList] = useState<{ name: string | null }[]>([]);

  const getPigList = useCallback(async () => {
    const { data, error } = await supabase.from("pigs").select("name");
    console.log(data);
    console.log(error);

    if (error) {
      setError(error.message);
    } else {
      setPigList(data);
    }
  }, []);

  useEffect(() => {
    getPigList();
  }, [getPigList]);

  return (
    <div>
      {pigList.map((pig) => (
        <h2 key={pig.name}>{pig.name}</h2>
      ))}
    </div>
  );
}

export default App;
