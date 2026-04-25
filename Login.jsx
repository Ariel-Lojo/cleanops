import { useState, useEffect } from "react";
import { sbGet } from "./sb.js";
import { getAdminPass } from "./sb.js";
import { C, Btn, Inp } from "./ui.jsx";

export default function Login({ onAdmin, onOperator }) {
  const [pass, setPass] = useState("");
  const [token, setToken] = useState("");
  const [mode, setMode] = useState("admin");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("op");
    if (p) handleToken(p);
  }, []);

  const handleToken = async (t) => {
    setLoading(true);
    const data = await sbGet("operators", `token=eq.${t}&active=eq.true&select=*`);
    if (data?.length) onOperator(data[0]);
    else setErr("Link inválido o desactivado.");
    setLoading(false);
  };

  return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:24,animation:"fadeUp .4s ease"}}>
      <div style={{maxWidth:360,width:"100%"}}>
        <div style={{textAlign:"center",marginBottom:40}}>
          <div style={{fontSize:44,marginBottom:10}}>🏠</div>
          <h1 style={{fontFamily:"Syne",fontSize:28,fontWeight:800}}>CleanOps</h1>
          <p style={{color:C.muted,fontSize:13,marginTop:4}}>Gestión de limpieza Airbnb</p>
        </div>

        {loading ? (
          <div style={{display:"flex",justifyContent:"center",padding:40}}>
            <div style={{width:24,height:24,border:`2px solid ${C.border}`,borderTop:`2px solid ${C.accent}`,borderRadius:"50%",animation:"spin .7s linear infinite"}}/>
          </div>
        ) : mode === "admin" ? (
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <Inp label="Contraseña admin" type="password" value={pass} onChange={setPass} placeholder="••••••••"/>
            {err && <p style={{color:C.danger,fontSize:12}}>{err}</p>}
            <Btn onClick={() => { if(pass===getAdminPass()) onAdmin(); else setErr("Contraseña incorrecta."); }} full>
              Entrar como Admin
            </Btn>
            <div style={{textAlign:"center",color:C.muted,fontSize:12}}>— o —</div>
            <Btn onClick={() => { setMode("op"); setErr(""); }} v="ghost" full>Soy operario</Btn>
          </div>
        ) : (
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <Inp label="Tu código de acceso" value={token} onChange={setToken} placeholder="abc123xyz"/>
            {err && <p style={{color:C.danger,fontSize:12}}>{err}</p>}
            <Btn onClick={() => handleToken(token)} full>Entrar</Btn>
            <Btn onClick={() => { setMode("admin"); setErr(""); }} v="ghost" full>← Volver</Btn>
          </div>
        )}
      </div>
    </div>
  );
}
