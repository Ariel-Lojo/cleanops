import { useState, useEffect } from "react";
import { sbGet } from "./sb.js";
import { globalStyles, Spin, C } from "./ui.jsx";
import Login from "./Login.jsx";
import Admin from "./Admin.jsx";
import OperatorView from "./Operator.jsx";

export default function App() {
  const [screen, setScreen]     = useState("loading");
  const [operator, setOperator] = useState(null);

  useEffect(() => {
    // Inject global styles
    const style = document.createElement("style");
    style.textContent = globalStyles;
    document.head.appendChild(style);

    // Check for operator token in URL
    const params = new URLSearchParams(window.location.search);
    if (params.get("op")) { setScreen("login"); return; }

    // Test Supabase connection
    sbGet("units", "select=id&limit=1").then(() => setScreen("login")).catch(() => setScreen("login"));
  }, []);

  if (screen === "loading") {
    return (
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",background:C.bg}}>
        <Spin/>
      </div>
    );
  }

  return (
    <>
      {screen === "login" && (
        <Login
          onAdmin={() => setScreen("admin")}
          onOperator={op => { setOperator(op); setScreen("operator"); }}
        />
      )}
      {screen === "admin"    && <Admin onLogout={() => setScreen("login")}/>}
      {screen === "operator" && operator && <OperatorView operator={operator}/>}
    </>
  );
}
