import { useState, useEffect, useRef } from "react";
import { sbGet, sbPost, sbPatch, getWA } from "./sb.js";
import { C, Btn, Txtarea, Tag, Spin, statusCfg } from "./ui.jsx";

// ─── CHECKLIST ────────────────────────────────────────────────────────────────
function ChecklistView({ unit, operator, onBack }) {
  const [tasks, setTasks]   = useState([]);
  const [states, setStates] = useState({});
  const [idx, setIdx]       = useState(0);
  const [session, setSession] = useState(null);
  const [showCmt, setShowCmt] = useState(false);
  const [cmt, setCmt]         = useState("");
  const [pendSt, setPendSt]   = useState(null);
  const [allDone, setAllDone] = useState(false);
  const [sending, setSending] = useState(false);
  const sxRef = useRef(null);

  const load = async () => {
    const td = await sbGet("tasks", `unit_id=eq.${unit.id}&select=*&order=sort_order`);
    setTasks(td || []);

    const today = new Date().toISOString().split("T")[0];
    let sessArr = await sbGet("checklist_sessions", `unit_id=eq.${unit.id}&date=eq.${today}&select=*&order=created_at.desc&limit=1`);
    let sess = sessArr?.[0];
    if (!sess) {
      const ns = await sbPost("checklist_sessions", { unit_id:unit.id, operator_id:operator.id, date:today });
      sess = ns?.[0] || null;
    }
    setSession(sess);

    if (sess) {
      const logs = await sbGet("task_logs", `session_id=eq.${sess.id}&select=*`);
      const st = {};
      (logs || []).forEach(l => { st[l.task_id] = { status:l.status, comment:l.comment }; });
      setStates(st);
    }
    await sbPatch("units", `id=eq.${unit.id}`, { status:"in_progress" });
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (tasks.length > 0)
      setAllDone(tasks.every(t => states[t.id]?.status === "done" || states[t.id]?.status === "problem"));
  }, [states, tasks]);

  const mark = (status) => { setPendSt(status); setShowCmt(true); };

  const confirm = async () => {
    const task = tasks[idx];
    if (!task || !session) return;
    const existing = states[task.id];
    const logData = { session_id:session.id, task_id:task.id, operator_id:operator.id, status:pendSt, comment:cmt||null };
    if (existing) await sbPatch("task_logs", `session_id=eq.${session.id}&task_id=eq.${task.id}`, { status:pendSt, comment:cmt||null });
    else await sbPost("task_logs", logData);
    setStates(p => ({ ...p, [task.id]:{ status:pendSt, comment:cmt } }));
    setShowCmt(false); setCmt(""); setPendSt(null);
    if (idx < tasks.length - 1) setTimeout(() => setIdx(i => i+1), 400);
  };

  const finish = async () => {
    setSending(true);
    await sbPatch("units", `id=eq.${unit.id}`, { status:"done" });
    if (session) await sbPatch("checklist_sessions", `id=eq.${session.id}`, { completed_at:new Date().toISOString() });

    const wa = getWA();
    const today = new Date().toLocaleDateString("es-AR");
    const problems = tasks.filter(t => states[t.id]?.status === "problem");
    const cmts = tasks.filter(t => states[t.id]?.comment);

    let msg = `✅ *${unit.name}* — Lista para check-in\n📅 ${today} | 👤 ${operator.name}\n\n`;
    if (problems.length) {
      msg += `⚠️ *INCIDENCIAS (${problems.length}):*\n`;
      problems.forEach(t => { msg += `• ${t.title}`; if(states[t.id]?.comment) msg += `: ${states[t.id].comment}`; msg += "\n"; });
      msg += "\n";
    }
    const extraCmts = cmts.filter(t => states[t.id]?.status !== "problem");
    if (extraCmts.length) {
      msg += `💬 *COMENTARIOS:*\n`;
      extraCmts.forEach(t => { msg += `• ${t.title}: ${states[t.id].comment}\n`; });
      msg += "\n";
    }
    if (!problems.length && !cmts.length) msg += `Todo en perfecto estado. La unidad está disponible. 🏠`;

    window.open(`https://wa.me/${wa}?text=${encodeURIComponent(msg)}`, "_blank");
    setSending(false);
  };

  const swipe = (dir) => {
    if (dir > 0 && idx < tasks.length-1) setIdx(i=>i+1);
    if (dir < 0 && idx > 0) setIdx(i=>i-1);
  };

  const task   = tasks[idx];
  const tstate = task ? states[task.id] : null;
  const done   = tstate?.status === "done";
  const prob   = tstate?.status === "problem";
  const totalDone = tasks.filter(t => states[t.id]?.status).length;
  const totalMin  = tasks.reduce((a,t) => a+(t.estimated_minutes||0), 0);

  return (
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",maxWidth:500,margin:"0 auto"}}>
      {/* Header */}
      <div style={{padding:"14px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",background:C.surface,borderBottom:`1px solid ${C.border}`}}>
        <Btn onClick={onBack} v="ghost" small>← Volver</Btn>
        <div style={{textAlign:"center"}}>
          <p style={{fontFamily:"Syne",fontSize:14,fontWeight:700}}>{unit.name}</p>
          <p style={{fontSize:10,color:C.muted}}>{totalDone}/{tasks.length} · {totalMin} min</p>
        </div>
        <div style={{width:60}}/>
      </div>

      {/* Progress bar */}
      <div style={{height:3,background:C.border}}>
        <div style={{height:"100%",width:`${tasks.length?(totalDone/tasks.length)*100:0}%`,background:C.accent,transition:"width .5s ease"}}/>
      </div>

      {/* All done */}
      {allDone ? (
        <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:40,animation:"popIn .5s ease",textAlign:"center"}}>
          <div style={{fontSize:72,marginBottom:18}}>🏠✨</div>
          <h2 style={{fontFamily:"Syne",fontSize:26,fontWeight:800,marginBottom:8}}>¡{unit.name} lista!</h2>
          <p style={{color:C.muted,marginBottom:28}}>Todas las tareas completadas</p>
          {tasks.filter(t=>states[t.id]?.status==="problem").length > 0 && (
            <div style={{background:`${C.warning}18`,border:`1px solid ${C.warning}44`,borderRadius:12,padding:"13px 18px",marginBottom:18,width:"100%",textAlign:"left"}}>
              <p style={{color:C.warning,fontWeight:600,fontSize:13,marginBottom:5}}>
                ⚠️ {tasks.filter(t=>states[t.id]?.status==="problem").length} incidencia(s)
              </p>
              {tasks.filter(t=>states[t.id]?.status==="problem").map(t=>(
                <p key={t.id} style={{fontSize:12,color:C.muted}}>• {t.title}{states[t.id]?.comment?`: ${states[t.id].comment}`:""}</p>
              ))}
            </div>
          )}
          <Btn onClick={finish} full disabled={sending} style={{padding:16}}>
            {sending ? "Abriendo WhatsApp..." : "📲 Enviar reporte por WhatsApp"}
          </Btn>
        </div>
      ) : task && (
        <div style={{flex:1,display:"flex",flexDirection:"column"}}>
          {/* Card */}
          <div
            style={{flex:1,position:"relative",overflow:"hidden",margin:14,borderRadius:20,minHeight:320,cursor:"grab",background:C.surface,userSelect:"none"}}
            onTouchStart={e=>sxRef.current=e.touches[0].clientX}
            onTouchEnd={e=>{const dx=e.changedTouches[0].clientX-sxRef.current;if(Math.abs(dx)>50)swipe(dx<0?1:-1);}}
            onMouseDown={e=>sxRef.current=e.clientX}
            onMouseUp={e=>{const dx=e.clientX-sxRef.current;if(Math.abs(dx)>50)swipe(dx<0?1:-1);}}
          >
            {task.image_url
              ? <img src={task.image_url} alt={task.title} style={{width:"100%",height:"100%",objectFit:"cover",filter:done?"brightness(.3) saturate(0)":prob?"brightness(.3) sepia(1)":"brightness(.65)",transition:"filter .4s",position:"absolute",inset:0}}/>
              : <div style={{position:"absolute",inset:0,background:`linear-gradient(135deg,${C.surface},${C.bg})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:60}}>📋</div>
            }
            <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(0,0,0,.85) 0%,transparent 50%)"}}/>

            {(done||prob) && (
              <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",animation:"popIn .4s ease"}}>
                <div style={{width:80,height:80,borderRadius:"50%",background:done?`${C.success}30`:`${C.warning}30`,border:`3px solid ${done?C.success:C.warning}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <span style={{fontSize:34,color:done?C.success:C.warning}}>{done?"✓":"⚠"}</span>
                </div>
              </div>
            )}

            <div style={{position:"absolute",top:13,left:13,background:"rgba(0,0,0,.6)",backdropFilter:"blur(8px)",borderRadius:20,padding:"4px 12px"}}>
              <span style={{fontSize:12,color:"white",fontWeight:600}}>{idx+1} / {tasks.length}</span>
            </div>
            <div style={{position:"absolute",top:13,right:13,background:"rgba(0,0,0,.6)",backdropFilter:"blur(8px)",borderRadius:20,padding:"4px 12px"}}>
              <span style={{fontSize:12,color:C.accent,fontWeight:600}}>⏱ {task.estimated_minutes}min</span>
            </div>

            <div style={{position:"absolute",bottom:0,left:0,right:0,padding:18}}>
              <h3 style={{fontFamily:"Syne",fontSize:21,fontWeight:700,color:"white",marginBottom:5,textDecoration:(done||prob)?"line-through":"none",opacity:(done||prob)?.6:1}}>
                {task.title}
              </h3>
              {task.description && <p style={{fontSize:13,color:"rgba(255,255,255,.75)",lineHeight:1.4}}>{task.description}</p>}
              {tstate?.comment && (
                <div style={{marginTop:8,background:"rgba(0,0,0,.4)",borderRadius:8,padding:"6px 10px"}}>
                  <p style={{fontSize:12,color:"rgba(255,255,255,.6)"}}>💬 {tstate.comment}</p>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div style={{padding:"0 14px 14px",display:"flex",flexDirection:"column",gap:10}}>
            {!showCmt ? (
              <div style={{display:"flex",gap:8}}>
                <Btn onClick={()=>swipe(-1)} v="ghost" disabled={idx===0} style={{flex:1}}>←</Btn>
                <Btn onClick={()=>mark("done")} v={done?"secondary":"success"} style={{flex:2}}>{done?"✓ Hecho":"✅ Listo"}</Btn>
                <Btn onClick={()=>mark("problem")} v={prob?"secondary":"danger"} style={{flex:2}}>{prob?"⚠ Prob.":"⚠️ Problema"}</Btn>
                <Btn onClick={()=>swipe(1)} v="ghost" disabled={idx===tasks.length-1} style={{flex:1}}>→</Btn>
              </div>
            ) : (
              <div style={{background:C.surface,border:`1px solid ${pendSt==="problem"?C.warning:C.success}44`,borderRadius:14,padding:15,animation:"popIn .3s ease"}}>
                <p style={{fontSize:13,color:C.muted,marginBottom:10}}>
                  {pendSt==="problem"?"⚠️ Describí el problema (opcional):":"💬 Comentario opcional:"}
                </p>
                <Txtarea value={cmt} onChange={setCmt} placeholder="Escribí una observación..." rows={2}/>
                <div style={{display:"flex",gap:10,marginTop:12}}>
                  <Btn onClick={confirm} v={pendSt==="problem"?"danger":"success"} style={{flex:1}}>Confirmar</Btn>
                  <Btn onClick={()=>{setShowCmt(false);setCmt("");setPendSt(null);}} v="ghost">Cancelar</Btn>
                </div>
              </div>
            )}
          </div>

          {/* Dots */}
          <div style={{display:"flex",justifyContent:"center",gap:6,padding:"0 20px 18px",flexWrap:"wrap"}}>
            {tasks.map((t,i) => {
              const s = states[t.id]?.status;
              return <button key={t.id} onClick={()=>setIdx(i)} style={{width:i===idx?20:8,height:8,borderRadius:4,border:"none",background:s==="done"?C.success:s==="problem"?C.warning:i===idx?C.accent:C.border,transition:"all .3s",cursor:"pointer",padding:0}}/>;
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── OPERATOR HOME ────────────────────────────────────────────────────────────
export default function OperatorView({ operator }) {
  const [units, setUnits]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel]       = useState(null);

  const load = async () => {
    const ou = await sbGet("operator_units", `operator_id=eq.${operator.id}&select=unit_id`);
    if (!ou?.length) { setLoading(false); return; }
    const ids = ou.map(o => o.unit_id).join(",");
    const d   = await sbGet("units", `id=in.(${ids})&select=*`);
    setUnits(d || []); setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh"}}><Spin/></div>;
  if (sel) return <ChecklistView unit={sel} operator={operator} onBack={()=>{setSel(null);load();}}/>;

  return (
    <div style={{minHeight:"100vh",padding:"24px 20px",animation:"fadeUp .4s ease"}}>
      <div style={{maxWidth:500,margin:"0 auto"}}>
        <div style={{marginBottom:28}}>
          <p style={{fontSize:11,color:C.accent,letterSpacing:2,textTransform:"uppercase",fontWeight:600}}>Bienvenida/o</p>
          <h1 style={{fontFamily:"Syne",fontSize:26,fontWeight:800}}>{operator.name}</h1>
        </div>
        {units.length === 0
          ? <p style={{color:C.muted,textAlign:"center",padding:40}}>No tenés unidades asignadas.</p>
          : (
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <p style={{fontSize:13,color:C.muted,marginBottom:4}}>Seleccioná la unidad a limpiar:</p>
              {units.map(u => {
                const sc = statusCfg[u.status] || statusCfg.pending;
                return (
                  <button key={u.id} onClick={()=>setSel(u)}
                    style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:16,padding:18,textAlign:"left",cursor:"pointer",width:"100%",transition:"border-color .2s"}}>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
                      <div>
                        <p style={{fontFamily:"Syne",fontSize:17,fontWeight:700,color:C.text}}>{u.name}</p>
                        {u.description && <p style={{fontSize:12,color:C.muted,marginTop:3}}>{u.description}</p>}
                      </div>
                      <Tag color={sc.color}>{sc.icon} {sc.label}</Tag>
                    </div>
                  </button>
                );
              })}
            </div>
          )
        }
      </div>
    </div>
  );
}
