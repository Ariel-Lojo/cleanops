export const C = {
  bg: "#0f0f0f", surface: "#1a1a1a", border: "#2a2a2a",
  accent: "#e8c547", text: "#f0ede8", muted: "#888",
  danger: "#e05555", success: "#4caf7d", warning: "#e8914a",
};

export const statusCfg = {
  pending:     { label: "Pendiente",   color: "#888",     icon: "○" },
  in_progress: { label: "En limpieza", color: "#e8914a",  icon: "◐" },
  done:        { label: "Lista",       color: "#4caf7d",  icon: "●" },
};

export const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Instrument+Sans:wght@400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body, #root { min-height: 100vh; background: ${C.bg}; color: ${C.text}; font-family: 'Instrument Sans', sans-serif; }
  input, textarea, select, button { font-family: inherit; }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 4px; }
  @keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
  @keyframes popIn  { from { opacity:0; transform:scale(.85); }       to { opacity:1; transform:scale(1); } }
  @keyframes spin   { to   { transform:rotate(360deg); } }
`;

export const Spin = () => (
  <div style={{width:20,height:20,border:`2px solid #2a2a2a`,borderTop:`2px solid #e8c547`,borderRadius:"50%",animation:"spin .7s linear infinite"}}/>
);

export const Btn = ({ children, onClick, v="primary", disabled, full, small, style={} }) => {
  const vs = {
    primary:   { background: C.accent,                    color: "#0f0f0f" },
    secondary: { background: C.surface,                   color: C.text,    border: `1px solid ${C.border}` },
    danger:    { background: "rgba(224,85,85,.15)",        color: C.danger,  border: `1px solid rgba(224,85,85,.3)` },
    ghost:     { background: "transparent",                color: C.muted,   border: `1px solid ${C.border}` },
    success:   { background: "rgba(76,175,125,.15)",       color: C.success, border: `1px solid rgba(76,175,125,.3)` },
  };
  return (
    <button onClick={disabled ? undefined : onClick} style={{
      display:"inline-flex", alignItems:"center", justifyContent:"center", gap:6,
      padding: small ? "8px 14px" : "12px 22px",
      borderRadius:10, border:"none", cursor: disabled ? "not-allowed" : "pointer",
      fontSize: small ? 12 : 14, fontWeight:600, transition:"all .18s",
      opacity: disabled ? .5 : 1, width: full ? "100%" : "auto",
      ...vs[v], ...style
    }}>{children}</button>
  );
};

export const Inp = ({ label, value, onChange, type="text", placeholder, style={} }) => (
  <div style={{display:"flex",flexDirection:"column",gap:6,...style}}>
    {label && <label style={{fontSize:11,color:C.muted,letterSpacing:"1.5px",textTransform:"uppercase",fontWeight:600}}>{label}</label>}
    <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
      style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"11px 13px",color:C.text,fontSize:14,outline:"none",width:"100%"}}/>
  </div>
);

export const Txtarea = ({ label, value, onChange, placeholder, rows=3 }) => (
  <div style={{display:"flex",flexDirection:"column",gap:6}}>
    {label && <label style={{fontSize:11,color:C.muted,letterSpacing:"1.5px",textTransform:"uppercase",fontWeight:600}}>{label}</label>}
    <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows}
      style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"11px 13px",color:C.text,fontSize:14,outline:"none",width:"100%",resize:"vertical"}}/>
  </div>
);

export const Tag = ({ children, color=C.muted }) => (
  <span style={{fontSize:10,fontWeight:600,letterSpacing:1,textTransform:"uppercase",color,background:`${color}18`,padding:"3px 8px",borderRadius:6}}>{children}</span>
);
