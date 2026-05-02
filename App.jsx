import React from 'react';
import { useState, useEffect, useRef } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "https://oncoprev-backend-production.up.railway.app";
const ANTHROPIC_MODEL = "claude-opus-4-5";

const palette = {
  bg: "#0a0f1e", surface: "#111827", card: "#1a2233", border: "#2a3a55",
  accent: "#00c9a7", accent2: "#4f8ef7", accent3: "#f97316", text: "#e2e8f0",
  muted: "#64748b", danger: "#ef4444", warn: "#f59e0b", success: "#22c55e",
};

const inputStyle = { background: "#1a2233", border: "1.5px solid #2a3a55", borderRadius: 10, color: "#e2e8f0", padding: "10px 14px", fontSize: 14, width: "100%", outline: "none", boxSizing: "border-box" };
const labelStyle = { fontSize: 12, fontWeight: 600, color: "#64748b", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6, display: "block" };
const cardStyle = { background: "#1a2233", border: "1px solid #2a3a55", borderRadius: 16, padding: "24px", marginBottom: 20 };

function GlowDot({ color = "#00c9a7" }) {
  return <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: color, boxShadow: `0 0 8px ${color}`, marginRight: 8 }} />;
}

function Spinner() {
  return <div style={{ width: 28, height: 28, border: "3px solid #2a3a55", borderTop: "3px solid #00c9a7", borderRadius: "50%", animation: "spin 0.8s linear infinite", display: "inline-block" }} />;
}

function RiskGauge({ score }) {
  const color = score < 30 ? "#22c55e" : score < 60 ? "#f59e0b" : "#ef4444";
  const label = score < 30 ? "RISCO BAIXO" : score < 60 ? "RISCO MODERADO" : "RISCO ELEVADO";
  const circumference = Math.PI * 60;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div style={{ textAlign: "center" }}>
      <svg width={160} height={100} viewBox="0 0 160 100">
        <path d="M 20 90 A 60 60 0 0 1 140 90" fill="none" stroke="#2a3a55" strokeWidth={14} strokeLinecap="round" />
        <path d="M 20 90 A 60 60 0 0 1 140 90" fill="none" stroke={color} strokeWidth={14} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} style={{ transition: "stroke-dashoffset 1.2s ease" }} />
        <text x={80} y={76} textAnchor="middle" fill={color} fontSize={24} fontWeight={700} fontFamily="monospace">{score}%</text>
      </svg>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.15em", color, marginTop: -8 }}>{label}</div>
    </div>
  );
}

const CANCER_TYPES = ["Pulmao / Traqueia / Bronquio","Estomago","Colon e Reto","Figado","Mama","Prostata","Leucemia","Esofago","Pancreas","Cervix / Utero","Ovario","Bexiga","Rim","Melanoma / Pele","Linfoma","Outros"];
const CHOLESTEROL_OPTS = [{ value: "1", label: "Normal" },{ value: "2", label: "Acima do Normal" },{ value: "3", label: "Muito Acima do Normal" }];
const GLUC_OPTS = [{ value: "1", label: "Normal" },{ value: "2", label: "Acima do Normal" },{ value: "3", label: "Muito Acima do Normal" }];
const BP_CATS = [{ label: "Normal (<120/80)", value: "normal" },{ label: "Pre-hipertensao (120-139/80-89)", value: "pre" },{ label: "Hipertensao Grau 1 (140-159/90-99)", value: "h1" },{ label: "Hipertensao Grau 2 (>=160/100)", value: "h2" },{ label: "Crise hipertensiva (>=180/120)", value: "crisis" }];
const FAMILY_HISTORY = ["Nenhum","Cancer de pulmao","Cancer de mama","Cancer colorretal","Cancer gastrico","Cancer de prostata","Leucemia","Outro tipo de cancer"];
const SMOKE_OPTS = [{ value: "0", label: "Nao fumante" },{ value: "1", label: "Ex-fumante" },{ value: "2", label: "Fumante ocasional" },{ value: "3", label: "Fumante regular" }];
const ALCO_OPTS = [{ value: "0", label: "Abstemio" },{ value: "1", label: "Consumo leve" },{ value: "2", label: "Consumo moderado" },{ value: "3", label: "Consumo elevado" }];

function Field({ label, children }) {
  return <div style={{ marginBottom: 16 }}><label style={labelStyle}>{label}</label>{children}</div>;
}

function Select({ value, onChange, options }) {
  return <select value={value} onChange={(e) => onChange(e.target.value)} style={{ ...inputStyle, appearance: "none", cursor: "pointer" }}>{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>;
}

function NumberInput({ value, onChange, min, max, placeholder }) {
  return <input type="number" value={value} onChange={(e) => onChange(e.target.value)} min={min} max={max} placeholder={placeholder} style={inputStyle} />;
}

function ToggleChip({ label, selected, onClick }) {
  return <button onClick={onClick} style={{ background: selected ? "#00c9a7" : "#1a2233", border: `1.5px solid ${selected ? "#00c9a7" : "#2a3a55"}`, borderRadius: 20, color: selected ? "#000" : "#e2e8f0", padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", marginRight: 8, marginBottom: 8 }}>{label}</button>;
}

export default function App() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);
  const [form, setForm] = useState({ age: "", gender: "2", height: "", weight: "", bp_cat: "normal", cholesterol: "1", gluc: "1", smoke: "0", alco: "0", active: "1", cardio: "0", family_history: "Nenhum", cancer_concern: [] });

  const setField = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));
  const toggleConcern = (type) => setForm((f) => ({ ...f, cancer_concern: f.cancer_concern.includes(type) ? f.cancer_concern.filter((x) => x !== type) : [...f.cancer_concern, type] }));
  const calcBMI = () => { const h = parseFloat(form.height), w = parseFloat(form.weight); if (h > 0 && w > 0) return (w / Math.pow(h / 100, 2)).toFixed(1); return null; };
  const bmi = calcBMI();
  const bmiLabel = !bmi ? "" : bmi < 18.5 ? "Abaixo do peso" : bmi < 25 ? "Peso normal" : bmi < 30 ? "Sobrepeso" : "Obesidade";

  const buildPrompt = () => `Voce e um sistema especialista em oncologia preventiva. Retorne APENAS um JSON valido, sem texto antes ou depois, sem markdown.\n\nEstrutura:\n{"risk_score":<0-100>,"risk_level":"<Baixo|Moderado|Elevado>","top_cancer_risks":[{"type":"<tipo>","risk":"<Baixo|Moderado|Elevado>","reason":"<motivo>"}],"key_factors":["<fator>"],"protective_factors":["<fator>"],"recommendations":[{"priority":"<Alta|Media|Baixa>","action":"<acao>","timeframe":"<prazo>"}],"summary":"<3-4 frases>","disclaimer":"Este resultado e apenas uma estimativa e NAO substitui avaliacao medica."}\n\nPACIENTE:\n- Idade: ${form.age} anos, Genero: ${form.gender === "1" ? "Feminino" : "Masculino"}\n- Altura: ${form.height}cm, Peso: ${form.weight}kg, IMC: ${bmi || "nao informado"} (${bmiLabel})\n- Pressao: ${BP_CATS.find(o=>o.value===form.bp_cat)?.label}, Colesterol: ${CHOLESTEROL_OPTS.find(o=>o.value===form.cholesterol)?.label}, Glicemia: ${GLUC_OPTS.find(o=>o.value===form.gluc)?.label}\n- Tabagismo: ${SMOKE_OPTS.find(o=>o.value===form.smoke)?.label}, Alcool: ${ALCO_OPTS.find(o=>o.value===form.alco)?.label}\n- Ativo: ${form.active==="1"?"Sim":"Nao"}, DCV: ${form.cardio==="1"?"Sim":"Nao"}\n- Historico familiar: ${form.family_history}\n- Preocupacoes: ${form.cancer_concern.join(", ")||"Nenhuma"}\n\nResponda SOMENTE com o JSON:`;

  const callAPI = async (body) => {
    const response = await fetch(`${API_BASE}/api/chat`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!response.ok) { const err = await response.json().catch(() => ({})); throw new Error(err?.error?.message || `HTTP ${response.status}`); }
    return response.json();
  };

  const handleAnalyze = async () => {
    if (!form.age || !form.height || !form.weight) { setError("Preencha idade, altura e peso."); return; }
    setError(null); setLoading(true);
    try {
      const data = await callAPI({ model: ANTHROPIC_MODEL, max_tokens: 1500, messages: [{ role: "user", content: buildPrompt() }] });
      const raw = data.content?.map((b) => b.text || "").join("") || "";
      const jsonMatch = raw.replace(/```json|```/gi, "").trim().match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Resposta invalida da IA.");
      const parsed = JSON.parse(jsonMatch[0]);
      setResult(parsed);
      setChatHistory([{ role: "assistant", content: `Ola! Calculei um risco oncologico de ${parsed.risk_score}% (${parsed.risk_level}). Como posso ajudar?` }]);
      setStep(2);
    } catch (err) { setError(`Erro: ${err.message}`); }
    finally { setLoading(false); }
  };

  const handleChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = chatInput.trim(); setChatInput("");
    const newHistory = [...chatHistory, { role: "user", content: userMsg }];
    setChatHistory(newHistory); setChatLoading(true);
    try {
      const data = await callAPI({ model: ANTHROPIC_MODEL, max_tokens: 800, system: `Voce e um assistente de oncologia preventiva. Analise: ${JSON.stringify(result)}. Responda em portugues, de forma clara e empatica. Sempre reforce que avaliacao medica presencial e indispensavel.`, messages: newHistory });
      setChatHistory([...newHistory, { role: "assistant", content: data.content?.map((b) => b.text || "").join("").trim() || "Sem resposta." }]);
    } catch (e) { setChatHistory([...newHistory, { role: "assistant", content: `Erro: ${e.message}` }]); }
    finally { setChatLoading(false); }
  };

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatHistory, chatLoading]);

  return (
    <div style={{ minHeight: "100vh", background: "#0a0f1e", color: "#e2e8f0", fontFamily: "'DM Sans', sans-serif", overflowX: "hidden" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&display=swap'); *{box-sizing:border-box} @keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}} .fade-up{animation:fadeUp 0.5s ease forwards} input:focus,select:focus{border-color:#00c9a7!important} button:hover{filter:brightness(1.1)}`}</style>

      <div style={{ background: "linear-gradient(180deg,#0d1425 0%,#0a0f1e 100%)", borderBottom: "1px solid #2a3a55", padding: "16px 24px", display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#00c9a7,#4f8ef7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🧬</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>OncoPrev AI</div>
          <div style={{ fontSize: 11, color: "#64748b" }}>Sistema Preditivo de Risco Oncologico — UNIVESP PI-I</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 16 }}>
          {["Dados","Analise","Relatorio"].map((s, i) => (
            <div key={s} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: step >= i ? "#00c9a7" : "#64748b", fontWeight: step >= i ? 600 : 400 }}>
              <div style={{ width: 22, height: 22, borderRadius: "50%", background: step > i ? "#00c9a7" : "transparent", border: `2px solid ${step >= i ? "#00c9a7" : "#2a3a55"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: step > i ? "#000" : step === i ? "#00c9a7" : "#64748b", fontWeight: 700 }}>{step > i ? "✓" : i + 1}</div>{s}
            </div>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "24px 16px" }}>
        {step === 0 && (
          <div className="fade-up" style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🧬</div>
            <h1 style={{ fontSize: 40, fontWeight: 800, background: "linear-gradient(135deg,#00c9a7,#4f8ef7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 12 }}>OncoPrev AI</h1>
            <p style={{ fontSize: 18, color: "#64748b", maxWidth: 520, margin: "0 auto 32px", lineHeight: 1.6 }}>Sistema preditivo de risco oncologico integrando dados cardiovasculares, habitos de vida e epidemiologia global.</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, maxWidth: 600, margin: "0 auto 40px" }}>
              {[{ icon: "❤️", label: "Dados Cardiovasculares", desc: "Pressao arterial, colesterol, IMC" },{ icon: "🍷", label: "Habitos de Vida", desc: "Alcool, tabagismo, atividade fisica" },{ icon: "🌍", label: "Epidemiologia Global", desc: "190+ paises, 29 tipos de cancer" }].map((f) => (
                <div key={f.label} style={{ ...cardStyle, textAlign: "left" }}><div style={{ fontSize: 28, marginBottom: 8 }}>{f.icon}</div><div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{f.label}</div><div style={{ fontSize: 12, color: "#64748b" }}>{f.desc}</div></div>
              ))}
            </div>
            <button onClick={() => setStep(1)} style={{ background: "linear-gradient(135deg,#00c9a7,#4f8ef7)", border: "none", borderRadius: 12, color: "#000", fontWeight: 700, fontSize: 16, padding: "14px 40px", cursor: "pointer" }}>Iniciar Avaliacao →</button>
            <div style={{ marginTop: 24, fontSize: 12, color: "#64748b" }}>⚠️ Fins educativos. Nao substitui consulta medica.</div>
          </div>
        )}

        {step === 1 && (
          <div className="fade-up">
            <div style={{ marginBottom: 24 }}><h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Perfil do Paciente</h2><p style={{ color: "#64748b", fontSize: 14 }}>Preencha os dados para gerar sua analise personalizada.</p></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div>
                <div style={cardStyle}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#00c9a7", marginBottom: 16, display: "flex", alignItems: "center" }}><GlowDot />Dados Pessoais</div>
                  <Field label="Idade"><NumberInput value={form.age} onChange={setField("age")} min={1} max={120} placeholder="Ex: 45" /></Field>
                  <Field label="Genero"><Select value={form.gender} onChange={setField("gender")} options={[{ value: "2", label: "Masculino" },{ value: "1", label: "Feminino" }]} /></Field>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <Field label="Altura (cm)"><NumberInput value={form.height} onChange={setField("height")} min={100} max={250} placeholder="170" /></Field>
                    <Field label="Peso (kg)"><NumberInput value={form.weight} onChange={setField("weight")} min={30} max={300} placeholder="70" /></Field>
                  </div>
                  {bmi && <div style={{ background: "#111827", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#00c9a7", fontWeight: 600 }}>IMC: {bmi} — {bmiLabel}</div>}
                </div>
                <div style={cardStyle}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#4f8ef7", marginBottom: 16, display: "flex", alignItems: "center" }}><GlowDot color="#4f8ef7" />Dados Cardiovasculares</div>
                  <Field label="Pressao Arterial"><Select value={form.bp_cat} onChange={setField("bp_cat")} options={BP_CATS} /></Field>
                  <Field label="Colesterol"><Select value={form.cholesterol} onChange={setField("cholesterol")} options={CHOLESTEROL_OPTS} /></Field>
                  <Field label="Glicemia"><Select value={form.gluc} onChange={setField("gluc")} options={GLUC_OPTS} /></Field>
                  <Field label="Doenca Cardiovascular Previa"><Select value={form.cardio} onChange={setField("cardio")} options={[{ value: "0", label: "Nao" },{ value: "1", label: "Sim" }]} /></Field>
                </div>
              </div>
              <div>
                <div style={cardStyle}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#f97316", marginBottom: 16, display: "flex", alignItems: "center" }}><GlowDot color="#f97316" />Habitos de Vida</div>
                  <Field label="Tabagismo"><Select value={form.smoke} onChange={setField("smoke")} options={SMOKE_OPTS} /></Field>
                  <Field label="Consumo de Alcool"><Select value={form.alco} onChange={setField("alco")} options={ALCO_OPTS} /></Field>
                  <Field label="Atividade Fisica"><Select value={form.active} onChange={setField("active")} options={[{ value: "1", label: "Ativo (>=150 min/semana)" },{ value: "0", label: "Sedentario" }]} /></Field>
                </div>
                <div style={cardStyle}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#f59e0b", marginBottom: 16, display: "flex", alignItems: "center" }}><GlowDot color="#f59e0b" />Historico & Preocupacoes</div>
                  <Field label="Historico Familiar"><Select value={form.family_history} onChange={setField("family_history")} options={FAMILY_HISTORY.map((h) => ({ value: h, label: h }))} /></Field>
                  <Field label="Preocupacoes"><div style={{ display: "flex", flexWrap: "wrap", marginTop: 4 }}>{CANCER_TYPES.map((t) => <ToggleChip key={t} label={t} selected={form.cancer_concern.includes(t)} onClick={() => toggleConcern(t)} />)}</div></Field>
                </div>
              </div>
            </div>
            {error && <div style={{ background: "#ef444422", border: "1px solid #ef4444", borderRadius: 10, padding: "12px 16px", color: "#ef4444", fontSize: 14, marginBottom: 16 }}>{error}</div>}
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8 }}>
              <button onClick={() => setStep(0)} style={{ background: "transparent", border: "1px solid #2a3a55", borderRadius: 10, color: "#64748b", padding: "12px 24px", cursor: "pointer", fontSize: 14 }}>← Voltar</button>
              <button onClick={handleAnalyze} disabled={loading} style={{ background: loading ? "#2a3a55" : "linear-gradient(135deg,#00c9a7,#4f8ef7)", border: "none", borderRadius: 10, color: loading ? "#64748b" : "#000", fontWeight: 700, fontSize: 15, padding: "12px 32px", cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 10 }}>
                {loading ? <><Spinner /> Analisando...</> : "Gerar Analise →"}
              </button>
            </div>
          </div>
        )}

        {step === 2 && result && (
          <div className="fade-up">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <div><h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Relatorio de Risco Oncologico</h2><p style={{ color: "#64748b", fontSize: 14 }}>Analise gerada por IA</p></div>
              <button onClick={() => { setStep(1); setResult(null); setError(null); }} style={{ background: "transparent", border: "1px solid #2a3a55", borderRadius: 10, color: "#64748b", padding: "8px 20px", cursor: "pointer", fontSize: 13 }}>← Nova Analise</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 20, marginBottom: 20 }}>
              <div style={{ ...cardStyle, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", marginBottom: 0 }}>
                <RiskGauge score={result.risk_score} />
                <div style={{ marginTop: 16, fontSize: 13, color: "#64748b", textAlign: "center", lineHeight: 1.5 }}>{result.summary}</div>
              </div>
              <div style={{ ...cardStyle, marginBottom: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#ef4444", marginBottom: 16, display: "flex", alignItems: "center" }}><GlowDot color="#ef4444" />Fatores de Risco</div>
                {result.key_factors?.map((f, i) => <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10, padding: "10px 12px", background: "#ef444411", borderRadius: 8, borderLeft: "3px solid #ef4444" }}><span>⚠️</span><span style={{ fontSize: 13 }}>{f}</span></div>)}
                {result.protective_factors?.length > 0 && <>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#22c55e", marginTop: 16, marginBottom: 12, display: "flex", alignItems: "center" }}><GlowDot color="#22c55e" />Fatores Protetores</div>
                  {result.protective_factors.map((f, i) => <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8, padding: "8px 12px", background: "#22c55e11", borderRadius: 8, borderLeft: "3px solid #22c55e" }}><span>✅</span><span style={{ fontSize: 13 }}>{f}</span></div>)}
                </>}
              </div>
            </div>
            {result.top_cancer_risks?.length > 0 && <div style={cardStyle}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#4f8ef7", marginBottom: 16, display: "flex", alignItems: "center" }}><GlowDot color="#4f8ef7" />Riscos por Tipo de Cancer</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 12 }}>
                {result.top_cancer_risks.map((r, i) => { const rc = r.risk === "Elevado" ? "#ef4444" : r.risk === "Moderado" ? "#f59e0b" : "#22c55e"; return <div key={i} style={{ background: "#111827", borderRadius: 10, padding: "12px 14px", border: `1px solid ${rc}44` }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}><span style={{ fontWeight: 600, fontSize: 13 }}>{r.type}</span><span style={{ fontSize: 11, fontWeight: 700, color: rc, background: `${rc}22`, padding: "2px 10px", borderRadius: 20 }}>{r.risk}</span></div><p style={{ fontSize: 12, color: "#64748b", margin: 0 }}>{r.reason}</p></div>; })}
              </div>
            </div>}
            {result.recommendations?.length > 0 && <div style={cardStyle}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#00c9a7", marginBottom: 16, display: "flex", alignItems: "center" }}><GlowDot />Recomendacoes Clinicas</div>
              {result.recommendations.map((rec, i) => { const pc = rec.priority === "Alta" ? "#ef4444" : rec.priority === "Media" ? "#f59e0b" : "#22c55e"; return <div key={i} style={{ display: "flex", gap: 14, padding: "12px 0", borderBottom: i < result.recommendations.length - 1 ? "1px solid #2a3a55" : "none" }}><div style={{ width: 52, flexShrink: 0 }}><span style={{ fontSize: 10, fontWeight: 800, color: pc, background: `${pc}22`, padding: "3px 7px", borderRadius: 6 }}>{rec.priority}</span></div><div><div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{rec.action}</div><div style={{ fontSize: 12, color: "#64748b" }}>⏱ {rec.timeframe}</div></div></div>; })}
            </div>}
            <div style={{ background: "#f59e0b11", border: "1px solid #f59e0b44", borderRadius: 12, padding: "14px 18px", fontSize: 12, color: "#f59e0b", marginBottom: 20 }}>⚠️ {result.disclaimer}</div>
            <div style={cardStyle}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#00c9a7", marginBottom: 16, display: "flex", alignItems: "center" }}><GlowDot />Consultor AI</div>
              <div style={{ background: "#111827", borderRadius: 10, padding: 16, minHeight: 180, maxHeight: 320, overflowY: "auto", marginBottom: 12, display: "flex", flexDirection: "column", gap: 12 }}>
                {chatHistory.map((msg, i) => <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}><div style={{ maxWidth: "80%", background: msg.role === "user" ? "linear-gradient(135deg,#00c9a7,#4f8ef7)" : "#1a2233", color: msg.role === "user" ? "#000" : "#e2e8f0", borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px", padding: "10px 14px", fontSize: 13, lineHeight: 1.5 }}>{msg.content}</div></div>)}
                {chatLoading && <div style={{ display: "flex", gap: 6, padding: "8px 14px" }}>{[0,1,2].map((d) => <div key={d} style={{ width: 8, height: 8, borderRadius: "50%", background: "#00c9a7", animation: `pulse 1.2s ${d*0.2}s infinite` }} />)}</div>}
                <div ref={chatEndRef} />
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleChat()} placeholder="Faca uma pergunta sobre os resultados..." style={{ ...inputStyle, flex: 1 }} />
                <button onClick={handleChat} disabled={chatLoading || !chatInput.trim()} style={{ background: chatLoading || !chatInput.trim() ? "#2a3a55" : "linear-gradient(135deg,#00c9a7,#4f8ef7)", border: "none", borderRadius: 10, color: chatLoading || !chatInput.trim() ? "#64748b" : "#000", fontWeight: 700, fontSize: 14, padding: "10px 20px", cursor: chatLoading || !chatInput.trim() ? "not-allowed" : "pointer" }}>Enviar →</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
