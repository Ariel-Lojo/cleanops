import { useState, useEffect, useRef } from "react";
import { sbGet, sbPost, sbPatch, sbDelete, uploadImage, getWA } from "./sb.js";
import { C, Btn, Inp, Txtarea, Tag, Spin, statusCfg } from "./ui.jsx";

// ─── UNITS ────────────────────────────────────────────────────────────────────
function UnitsMgr({ units, onSelect, onRefresh }) {
  const [showF, setShowF] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    await sbPost("units", form);
    setForm({ name: "", description: "" }); setShowF(false); onRefresh();
    setSaving(false);
  };

  const del = async (id) => { if (!confirm("¿Eliminar unidad?")) return; await sbDelete("units", `id=eq.${id}`); onRefresh(); };

  const reset = async (u) => {
    const today = new Date().toISOString().split("T")[0];
    await sbPatch("units", `id=eq.${u.id}`, { status: "pending" });
    await sbPost("checklist_sessions", { unit_id: u.id, date: today });
    onRefresh();
  };

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18}}>
        <h2 style={{fontFamily:"Syne",fontSize:22,fontWeight:700}}>Unidades</h2>
        <Btn onClick={() => setShowF(!showF)} small>+ Nueva</Btn>
      </div>

      {showF && (
        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:18,marginBottom:16,animation:"popIn .3s ease"}}>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <Inp label="Nombre" value={form.name} onChange={v => setForm(p => ({...p,name:v}))} placeholder="Casa da Floresta"/>
            <Txtarea label="Descripción" value={form.description} onChange={v => setForm(p => ({...p,description:v}))} placeholder="Descripción opcional" rows={2}/>
            <div style={{display:"flex",gap:10}}>
              <Btn onClick={save} disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Btn>
              <Btn onClick={() => setShowF(false)} v="ghost">Cancelar</Btn>
            </div>
          </div>
        </div>
      )}

      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {units.length === 0 && <p style={{color:C.muted,textAlign:"center",padding:40}}>Sin unidades. ¡Creá la primera!</p>}
        {units.map(u => {
          const sc = statusCfg[u.status] || statusCfg.pending;
          return (
            <div key={u.id} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:14,display:"flex",alignItems:"center",gap:12}}>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4,flexWrap:"wrap"}}>
                  <span style={{fontFamily:"Syne",fontSize:15,fontWeight:700}}>{u.name}</span>
                  <Tag color={sc.color}>{sc.icon} {sc.label}</Tag>
                </div>
                {u.description && <p style={{fontSize:12,color:C.muted}}>{u.description}</p>}
              </div>
              <div style={{display:"flex",gap:6,flexShrink:0,flexWrap:"wrap"}}>
                <Btn onClick={() => onSelect(u)} v="secondary" small>Tareas</Btn>
                <Btn onClick={() => reset(u)} v="ghost" small>Reset</Btn>
                <Btn onClick={() => del(u.id)} v="danger" small>🗑</Btn>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── TASKS ────────────────────────────────────────────────────────────────────
function TaskMgr({ unit, onBack, allUnits }) {
  const [tasks, setTasks] = useState([]);
  const [showF, setShowF] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", estimated_minutes: 5, image_url: "" });
  const [saving, setSaving] = useState(false);
  const [imgLoad, setImgLoad] = useState(false);
  const [cloneU, setCloneU] = useState("");
  const fileRef = useRef();

  const load = async () => {
    const d = await sbGet("tasks", `unit_id=eq.${unit.id}&select=*&order=sort_order`);
    setTasks(d || []);
  };
  useEffect(() => { load(); }, []);

  const up = async (file) => {
    setImgLoad(true);
    const url = await uploadImage(file);
    setForm(p => ({ ...p, image_url: url }));
    setImgLoad(false);
  };

  const save = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    const maxO = tasks.length ? Math.max(...tasks.map(t => t.sort_order)) + 1 : 0;
    await sbPost("tasks", { ...form, unit_id: unit.id, sort_order: maxO });
    setForm({ title: "", description: "", estimated_minutes: 5, image_url: "" });
    setShowF(false); load(); setSaving(false);
  };

  const del = async (id) => { await sbDelete("tasks", `id=eq.${id}`); load(); };

  const move = async (task, dir) => {
    const idx = tasks.findIndex(t => t.id === task.id);
    const si = idx + dir;
    if (si < 0 || si >= tasks.length) return;
    const swap = tasks[si];
    await sbPatch("tasks", `id=eq.${task.id}`, { sort_order: swap.sort_order });
    await sbPatch("tasks", `id=eq.${swap.id}`, { sort_order: task.sort_order });
    load();
  };

  const clone = async () => {
    if (!cloneU) return;
    const d = await sbGet("tasks", `unit_id=eq.${cloneU}&select=*&order=sort_order`);
    if (!d) return;
    for (let i = 0; i < d.length; i++) {
      const t = d[i];
      await sbPost("tasks", { title:t.title, description:t.description, image_url:t.image_url, estimated_minutes:t.estimated_minutes, sort_order:tasks.length+i, unit_id:unit.id });
    }
    load();
  };

  const totalMin = tasks.reduce((a, t) => a + (t.estimated_minutes || 0), 0);

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:18}}>
        <Btn onClick={onBack} v="ghost" small>← Volver</Btn>
        <div>
          <h2 style={{fontFamily:"Syne",fontSize:20,fontWeight:700}}>{unit.name}</h2>
          <p style={{fontSize:12,color:C.muted}}>{tasks.length} tareas · {totalMin} min est.</p>
        </div>
      </div>

      {allUnits.filter(u => u.id !== unit.id).length > 0 && (
        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:12,marginBottom:14,display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
          <span style={{fontSize:12,color:C.muted,flexShrink:0}}>Clonar desde:</span>
          <select value={cloneU} onChange={e => setCloneU(e.target.value)}
            style={{flex:1,minWidth:120,background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,padding:8,color:C.text,fontSize:13}}>
            <option value="">— elegir unidad —</option>
            {allUnits.filter(u => u.id !== unit.id).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <Btn onClick={clone} v="secondary" small disabled={!cloneU}>Clonar</Btn>
        </div>
      )}

      <Btn onClick={() => setShowF(!showF)} small style={{marginBottom:14}}>+ Nueva tarea</Btn>

      {showF && (
        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:18,marginBottom:14,animation:"popIn .3s ease"}}>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <Inp label="Título" value={form.title} onChange={v => setForm(p => ({...p,title:v}))} placeholder="Ej: Cambiar sábanas"/>
            <Txtarea label="Descripción" value={form.description} onChange={v => setForm(p => ({...p,description:v}))} placeholder="Detalle de la tarea..."/>
            <Inp label="Tiempo estimado (min)" type="number" value={form.estimated_minutes} onChange={v => setForm(p => ({...p,estimated_minutes:parseInt(v)||5}))}/>
            <div>
              <label style={{fontSize:11,color:C.muted,letterSpacing:"1.5px",textTransform:"uppercase",fontWeight:600,display:"block",marginBottom:8}}>Foto</label>
              {form.image_url && (
                <div style={{position:"relative",marginBottom:10}}>
                  <img src={form.image_url} alt="" style={{width:"100%",height:150,objectFit:"cover",borderRadius:10}}/>
                  <button onClick={() => setForm(p => ({...p,image_url:""}))}
                    style={{position:"absolute",top:8,right:8,background:"rgba(0,0,0,.7)",color:"white",border:"none",borderRadius:"50%",width:28,height:28,cursor:"pointer",fontSize:16}}>×</button>
                </div>
              )}
              <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{display:"none"}}
                onChange={e => e.target.files[0] && up(e.target.files[0])}/>
              <Btn onClick={() => fileRef.current.click()} v="ghost" small disabled={imgLoad}>
                {imgLoad ? "Subiendo..." : "📷 Cargar foto"}
              </Btn>
            </div>
            <div style={{display:"flex",gap:10}}>
              <Btn onClick={save} disabled={saving}>{saving ? "Guardando..." : "Guardar tarea"}</Btn>
              <Btn onClick={() => setShowF(false)} v="ghost">Cancelar</Btn>
            </div>
          </div>
        </div>
      )}

      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {tasks.map((task, i) => (
          <div key={task.id} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,overflow:"hidden",display:"flex"}}>
            {task.image_url && <img src={task.image_url} alt="" style={{width:70,height:70,objectFit:"cover",flexShrink:0}}/>}
            <div style={{flex:1,padding:"10px 12px"}}>
              <p style={{fontWeight:600,fontSize:14,marginBottom:2}}>{task.title}</p>
              {task.description && <p style={{fontSize:11,color:C.muted,marginBottom:4}}>{task.description}</p>}
              <Tag color={C.muted}>⏱ {task.estimated_minutes} min</Tag>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:4,padding:8,justifyContent:"center"}}>
              <button onClick={() => move(task,-1)} disabled={i===0} style={{background:"none",border:"none",color:i===0?C.border:C.muted,cursor:"pointer",fontSize:16}}>↑</button>
              <button onClick={() => move(task,1)} disabled={i===tasks.length-1} style={{background:"none",border:"none",color:i===tasks.length-1?C.border:C.muted,cursor:"pointer",fontSize:16}}>↓</button>
              <button onClick={() => del(task.id)} style={{background:"none",border:"none",color:C.danger,cursor:"pointer",fontSize:14}}>🗑</button>
            </div>
          </div>
        ))}
        {tasks.length === 0 && <p style={{color:C.muted,textAlign:"center",padding:30}}>Sin tareas. ¡Agregá la primera!</p>}
      </div>
    </div>
  );
}

// ─── OPERATORS ────────────────────────────────────────────────────────────────
function OpsMgr({ ops, units, onRefresh }) {
  const [showF, setShowF] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [exp, setExp] = useState(null);
  const [copied, setCopied] = useState("");

  const create = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await sbPost("operators", { name });
    setName(""); setShowF(false); onRefresh(); setSaving(false);
  };

  const toggle = async (op) => { await sbPatch("operators", `id=eq.${op.id}`, { active: !op.active }); onRefresh(); };

  const toggleUnit = async (op, uid) => {
    const assigned = (op.operator_units || []).map(o => o.unit_id);
    if (assigned.includes(uid)) await sbDelete("operator_units", `operator_id=eq.${op.id}&unit_id=eq.${uid}`);
    else await sbPost("operator_units", { operator_id: op.id, unit_id: uid });
    onRefresh();
  };

  const copyLink = (token) => {
    const url = `${window.location.origin}${window.location.pathname}?op=${token}`;
    navigator.clipboard.writeText(url);
    setCopied(token); setTimeout(() => setCopied(""), 2000);
  };

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18}}>
        <h2 style={{fontFamily:"Syne",fontSize:22,fontWeight:700}}>Operarios</h2>
        <Btn onClick={() => setShowF(!showF)} small>+ Nuevo</Btn>
      </div>

      {showF && (
        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:18,marginBottom:14,animation:"popIn .3s ease"}}>
          <Inp label="Nombre" value={name} onChange={setName} placeholder="María García"/>
          <div style={{display:"flex",gap:10,marginTop:12}}>
            <Btn onClick={create} disabled={saving}>{saving ? "Creando..." : "Crear"}</Btn>
            <Btn onClick={() => setShowF(false)} v="ghost">Cancelar</Btn>
          </div>
        </div>
      )}

      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {ops.map(op => {
          const assigned = (op.operator_units || []).map(o => o.unit_id);
          return (
            <div key={op.id} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,overflow:"hidden"}}>
              <div style={{padding:"13px 15px",display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:36,height:36,borderRadius:"50%",background:op.active?C.accent:C.border,display:"flex",alignItems:"center",justifyContent:"center",color:"#0f0f0f",fontWeight:700,fontSize:14,flexShrink:0}}>
                  {op.name[0].toUpperCase()}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <p style={{fontWeight:600,fontSize:14}}>{op.name}</p>
                  <p style={{fontSize:11,color:C.muted}}>{assigned.length} unidades · {op.active?"Activo":"Inactivo"}</p>
                </div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap",flexShrink:0}}>
                  <Btn onClick={() => copyLink(op.token)} v="secondary" small>{copied===op.token?"✓":"🔗"} Link</Btn>
                  <Btn onClick={() => setExp(exp===op.id?null:op.id)} v="ghost" small>{exp===op.id?"▲":"▼"}</Btn>
                  <Btn onClick={() => toggle(op)} v={op.active?"danger":"success"} small>{op.active?"Baja":"Alta"}</Btn>
                </div>
              </div>
              {exp === op.id && (
                <div style={{borderTop:`1px solid ${C.border}`,padding:"13px 15px",animation:"fadeUp .2s ease"}}>
                  <p style={{fontSize:11,color:C.muted,marginBottom:10,letterSpacing:1,textTransform:"uppercase"}}>Unidades asignadas</p>
                  <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                    {units.map(u => {
                      const on = assigned.includes(u.id);
                      return (
                        <button key={u.id} onClick={() => toggleUnit(op, u.id)}
                          style={{padding:"6px 14px",borderRadius:20,border:`1.5px solid ${on?C.accent:C.border}`,background:on?`${C.accent}20`:"transparent",color:on?C.accent:C.muted,fontSize:12,fontWeight:600,cursor:"pointer",transition:"all .2s"}}>
                          {on?"✓ ":""}{u.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── LOGS ─────────────────────────────────────────────────────────────────────
function Logs({ units, ops }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fu, setFu] = useState(""); const [fo, setFo] = useState("");

  const load = async () => {
    setLoading(true);
    const d = await sbGet("task_logs", "select=*,tasks(title,unit_id,units(name)),operators(name),checklist_sessions(date)&order=completed_at.desc&limit=100");
    setLogs(d || []); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = logs.filter(l => {
    if (fu && l.tasks?.unit_id !== fu) return false;
    if (fo && l.operator_id !== fo) return false;
    return true;
  });

  const si = { done:"✅", problem:"⚠️", pending:"○" };

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18}}>
        <h2 style={{fontFamily:"Syne",fontSize:22,fontWeight:700}}>Historial</h2>
        <Btn onClick={load} v="ghost" small>↻ Actualizar</Btn>
      </div>
      <div style={{display:"flex",gap:10,marginBottom:14}}>
        <select value={fu} onChange={e=>setFu(e.target.value)} style={{flex:1,background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:8,color:C.text,fontSize:13}}>
          <option value="">Todas las unidades</option>
          {units.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <select value={fo} onChange={e=>setFo(e.target.value)} style={{flex:1,background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:8,color:C.text,fontSize:13}}>
          <option value="">Todos</option>
          {ops.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
      </div>
      {loading ? <div style={{display:"flex",justifyContent:"center",padding:40}}><Spin/></div> : (
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {filtered.length===0 && <p style={{color:C.muted,textAlign:"center",padding:40}}>Sin registros aún.</p>}
          {filtered.map(l=>(
            <div key={l.id} style={{background:C.surface,border:`1px solid ${l.status==="problem"?C.warning+"44":C.border}`,borderRadius:12,padding:"12px 14px"}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4,flexWrap:"wrap"}}>
                <span style={{fontSize:15}}>{si[l.status]||"○"}</span>
                <span style={{fontWeight:600,fontSize:14}}>{l.tasks?.title||"Tarea eliminada"}</span>
                <Tag color={l.status==="problem"?C.warning:l.status==="done"?C.success:C.muted}>{l.tasks?.units?.name||"—"}</Tag>
              </div>
              <div style={{fontSize:11,color:C.muted,display:"flex",gap:12,flexWrap:"wrap"}}>
                <span>👤 {l.operators?.name||"—"}</span>
                <span>📅 {l.checklist_sessions?.date||new Date(l.completed_at).toLocaleDateString("es-AR")}</span>
                <span>🕐 {new Date(l.completed_at).toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"})}</span>
              </div>
              {l.comment && <p style={{marginTop:8,fontSize:13,color:C.text,background:C.bg,borderRadius:8,padding:"7px 10px"}}>💬 {l.comment}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── CONFIG ───────────────────────────────────────────────────────────────────
function Cfg() {
  const [wa, setWa] = useState(localStorage.getItem("cop_wa")||"5521972579717");
  const [pass, setPass] = useState(localStorage.getItem("cop_pass")||"admin1234");
  const [saved, setSaved] = useState(false);

  const save = () => {
    localStorage.setItem("cop_wa", wa);
    localStorage.setItem("cop_pass", pass);
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <h2 style={{fontFamily:"Syne",fontSize:22,fontWeight:700,marginBottom:22}}>Configuración</h2>
      <div style={{display:"flex",flexDirection:"column",gap:18}}>
        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:18}}>
          <h3 style={{fontFamily:"Syne",fontSize:16,marginBottom:14}}>📱 WhatsApp de notificaciones</h3>
          <Inp label="Número (con código de país, sin +)" value={wa} onChange={setWa} placeholder="5521972579717"/>
          <p style={{fontSize:11,color:C.muted,marginTop:8}}>Los operarios envían el reporte a este número.</p>
        </div>
        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:18}}>
          <h3 style={{fontFamily:"Syne",fontSize:16,marginBottom:14}}>🔐 Contraseña admin</h3>
          <Inp label="Nueva contraseña" type="password" value={pass} onChange={setPass} placeholder="••••••••"/>
          <p style={{fontSize:11,color:C.muted,marginTop:8}}>Se guarda localmente en este dispositivo.</p>
        </div>
        <Btn onClick={save} full>{saved?"✓ Guardado":"Guardar configuración"}</Btn>
      </div>
    </div>
  );
}

// ─── ADMIN ROOT ───────────────────────────────────────────────────────────────
export default function Admin({ onLogout }) {
  const [tab, setTab] = useState("units");
  const [units, setUnits] = useState([]);
  const [ops, setOps] = useState([]);
  const [selUnit, setSelUnit] = useState(null);

  const loadUnits = async () => { const d = await sbGet("units","select=*&order=created_at"); setUnits(d||[]); };
  const loadOps   = async () => { const d = await sbGet("operators","select=*,operator_units(unit_id)&order=created_at"); setOps(d||[]); };

  useEffect(() => { loadUnits(); loadOps(); }, []);

  const nav = [
    { id:"units", icon:"🏠", label:"Unidades" },
    { id:"ops",   icon:"👤", label:"Operarios" },
    { id:"logs",  icon:"📋", label:"Historial" },
    { id:"cfg",   icon:"⚙️", label:"Config" },
  ];

  return (
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column"}}>
      <div style={{background:C.surface,borderBottom:`1px solid ${C.border}`,padding:"13px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:50}}>
        <span style={{fontFamily:"Syne",fontSize:16,fontWeight:700,color:C.accent}}>CleanOps <span style={{color:C.muted,fontSize:11,fontWeight:400}}>Admin</span></span>
        <Btn onClick={onLogout} v="ghost" small>Salir</Btn>
      </div>

      <div style={{flex:1,padding:18,maxWidth:680,margin:"0 auto",width:"100%",animation:"fadeUp .3s ease"}}>
        {tab==="units" && (selUnit
          ? <TaskMgr unit={selUnit} onBack={()=>{setSelUnit(null);loadUnits();}} allUnits={units}/>
          : <UnitsMgr units={units} onSelect={setSelUnit} onRefresh={loadUnits}/>
        )}
        {tab==="ops"   && <OpsMgr ops={ops} units={units} onRefresh={loadOps}/>}
        {tab==="logs"  && <Logs units={units} ops={ops}/>}
        {tab==="cfg"   && <Cfg/>}
      </div>

      <div style={{background:C.surface,borderTop:`1px solid ${C.border}`,display:"flex",position:"sticky",bottom:0}}>
        {nav.map(n => (
          <button key={n.id} onClick={() => { setTab(n.id); setSelUnit(null); }}
            style={{flex:1,padding:"11px 4px",background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3,color:tab===n.id?C.accent:C.muted,transition:"color .2s"}}>
            <span style={{fontSize:18}}>{n.icon}</span>
            <span style={{fontSize:10,fontWeight:600}}>{n.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
