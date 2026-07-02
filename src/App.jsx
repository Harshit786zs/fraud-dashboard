 import { useState, useEffect } from "react";
 import {
   PieChart, Pie, Cell, Tooltip, Legend,
   LineChart, Line, BarChart, Bar,
   XAxis, YAxis, CartesianGrid, ResponsiveContainer,
 } from "recharts";
 import axios from "axios";
 import { useProfile, ProfileSetup, TransactionHistory } from "./UserProfile.jsx";
import { QRPayment } from "./QRPayment.jsx";

 const COLORS = ["#00C49F", "#FFBB28", "#FF4444"];
 const API = "http://localhost:8000";
 
 const USERS = {
   admin: { password: "admin123", role: "admin", name: "Admin User" },
   analyst: { password: "analyst123", role: "analyst", name: "Fraud Analyst" },
 };
 
 const randomTxn = () => {
   const v = () => +(Math.random() * 4 - 2).toFixed(4);
   const amount = +(Math.random() * 8000 + 100).toFixed(2);
   // Spread synthetic live-feed hours across the full day so hour-wise
   // fraud distribution has something real to show, instead of every
   // simulated transaction landing on the current clock hour.
   const hour = Math.floor(Math.random() * 24);
   return {
     V1:v(),V2:v(),V3:v(),V4:v(),V5:v(),V6:v(),V7:v(),
     V8:v(),V9:v(),V10:v(),V11:v(),V12:v(),V13:v(),V14:v(),
     V15:v(),V16:v(),V17:v(),V18:v(),V19:v(),V20:v(),V21:v(),
     V22:v(),V23:v(),V24:v(),V25:v(),V26:v(),V27:v(),V28:v(),
     amount_log:+Math.log1p(amount).toFixed(4),
     amount_zscore:+((amount-88)/250).toFixed(4),
     is_high_amount:amount>4750?1:0,
     hour,
     is_night:hour<6||hour>=22?1:0,
     _amount:amount
   };
 };
 
 const badgeColor = a => a==="ALLOW"?"#00C49F":a==="CHALLENGE"?"#FFBB28":"#FF4444";
 
 // ── REASON CODE ENGINE ────────────────────────────────────
 const getReasonCodes = (amount, hour, is_night, prob) => {
   const reasons = [];
   if (amount > 4750) reasons.push({ code: "HIGH_AMOUNT", label: "Very large transaction amount" });
   if (is_night == 1) reasons.push({ code: "NIGHT_TRANSACTION", label: "Transaction at unusual hours" });
   if (amount > 2000) reasons.push({ code: "NEW_BENEFICIARY", label: "First time paying this amount range" });
   if (prob > 0.5) reasons.push({ code: "ML_FLAGGED", label: "ML model detected fraud pattern" });
   if (hour >= 0 && hour < 5) reasons.push({ code: "LATE_NIGHT", label: "Transaction between midnight and 5am" });
   return reasons;
 };
 
 const getActionPlan = (action, reasons, amount) => {
   if (action === "ALLOW") return {
     color: "#00C49F",
     icon: "✅",
     title: "Payment Looks Safe",
     subtitle: "No suspicious activity detected",
     actions: [{ label: "💸 Proceed to Pay", primary: true }, { label: "Cancel", primary: false }]
   };
   if (action === "CHALLENGE") {
     const hasAmountDeviation = reasons.find(r => r.code === "HIGH_AMOUNT");
     return {
       color: "#FFBB28",
       icon: "⚠️",
       title: "Unusual Activity Detected",
       subtitle: "Please verify before proceeding",
       tip: hasAmountDeviation
         ? `Consider sending ₹1 as a test payment first to verify the recipient.`
         : `Double check the UPI ID before sending.`,
       actions: [
         { label: "🧪 Send ₹1 Test First", primary: true },
         { label: "Proceed Anyway", primary: false },
         { label: "Cancel Payment", primary: false }
       ]
     };
   }
   return {
     color: "#FF4444",
     icon: "🚨",
     title: "HIGH RISK — Do Not Pay",
     subtitle: "Our ML model flagged this as likely fraud",
     tip: "This transaction matches known fraud patterns. We strongly recommend cancelling.",
     actions: [
       { label: "🛑 Cancel Payment", primary: true },
       { label: "🔒 Secure My Account", primary: false },
       { label: "📢 Report Fraud", primary: false },
       { label: "Proceed at Own Risk", primary: false }
     ]
   };
 };
 const openRazorpay = (amount, upiId, name) => {
  const options = {
    key: "rzp_test_T50IgpVABWIDzE",
    amount: Math.round(amount * 100), // Razorpay needs paise
    currency: "INR",
    name: "UPI Fraud Detection Demo",
    description: `Payment to ${upiId}`,
    handler: function (response) {
      alert("✅ Test Payment Successful!\nPayment ID: " + response.razorpay_payment_id);
    },
    prefill: {
      name: name || "Test User",
      email: "test@example.com",
      contact: "9999999999"
    },
    theme: { color: "#3b82f6" }
  };
  const rzp = new window.Razorpay(options);
  rzp.open();
};
 
 // ── LOGIN ─────────────────────────────────────────────────
 function LoginPage({ onLogin }) {
   const [username, setUsername] = useState("");
   const [password, setPassword] = useState("");
   const [error, setError] = useState("");
   const [loading, setLoading] = useState(false);
 
   const handleLogin = () => {
     setLoading(true); setError("");
     setTimeout(() => {
       const user = USERS[username.toLowerCase()];
       if (user && user.password === password) {
         onLogin({ username: username.toLowerCase(), ...user });
       } else { setError("Invalid username or password"); }
       setLoading(false);
     }, 800);
   };
 
   return (
     <div style={{ background: "#0a0f1e", minHeight: "100vh", display: "flex",
       alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI',sans-serif" }}>
       <div style={{ width: 380 }}>
         <div style={{ textAlign: "center", marginBottom: 32 }}>
           <div style={{ fontSize: 48 }}>🛡️</div>
           <h1 style={{ color: "#60a5fa", margin: 0, fontSize: 24 }}>UPI Fraud Detection</h1>
           <p style={{ color: "#475569", margin: "6px 0 0", fontSize: 13 }}>Secure Access Portal</p>
         </div>
         <div style={{ background: "#1e293b", borderRadius: 16, padding: 32,
           border: "1px solid #334155", boxShadow: "0 0 40px rgba(96,165,250,0.1)" }}>
           <h3 style={{ color: "white", marginBottom: 20, textAlign: "center" }}>Sign In</h3>
           {[["Username", username, setUsername, "text", "admin or analyst"],
             ["Password", password, setPassword, "password", "Enter password"]].map(([label, val, setter, type, ph]) => (
             <div key={label} style={{ marginBottom: 16 }}>
               <label style={{ color: "#94a3b8", fontSize: 13, display: "block", marginBottom: 6 }}>{label}</label>
               <input type={type} value={val} placeholder={ph}
                 onChange={e => setter(e.target.value)}
                 onKeyDown={e => e.key === "Enter" && handleLogin()}
                 style={{ width: "100%", padding: "11px 14px", borderRadius: 8,
                   background: "#0f172a", color: "white", border: "1px solid #334155",
                   fontSize: 14, boxSizing: "border-box" }} />
             </div>
           ))}
           {error && <div style={{ background: "#FF444422", border: "1px solid #FF4444",
             borderRadius: 8, padding: "10px 14px", color: "#FF4444", fontSize: 13, marginBottom: 16 }}>
             ❌ {error}</div>}
           <button onClick={handleLogin} disabled={loading}
             style={{ width: "100%", padding: 13,
               background: loading ? "#334155" : "linear-gradient(135deg,#3b82f6,#6366f1)",
               color: "white", border: "none", borderRadius: 10,
               fontWeight: "bold", cursor: loading ? "not-allowed" : "pointer", fontSize: 15 }}>
             {loading ? "Signing in..." : "Sign In →"}
           </button>
           <div style={{ marginTop: 20, padding: 14, background: "#0f172a",
             borderRadius: 8, border: "1px solid #334155" }}>
             <div style={{ color: "#64748b", fontSize: 12, marginBottom: 8 }}>Demo Credentials:</div>
             <div style={{ display: "flex", gap: 8 }}>
               {[["👑 Admin", "admin", "admin123", "#3b82f644"],
                 ["🔍 Analyst", "analyst", "analyst123", "#34d39944"]].map(([label, u, p, border]) => (
                 <div key={u} onClick={() => { setUsername(u); setPassword(p); }}
                   style={{ flex: 1, background: "#1e293b", borderRadius: 6, padding: "8px 10px",
                     cursor: "pointer", border: `1px solid ${border}` }}>
                   <div style={{ color: "#60a5fa", fontSize: 11, fontWeight: "bold" }}>{label}</div>
                   <div style={{ color: "#475569", fontSize: 10 }}>{u} / {p}</div>
                 </div>
               ))}
             </div>
           </div>
         </div>
       </div>
     </div>
   );
 }
 
 // ── PAY TAB ───────────────────────────────────────────────
 function PayTab() {
  const { addTransaction, getUserRisk } = useProfile();
  const [step, setStep] = useState("form");
  const [form, setForm] = useState({ upiId: "", name: "", amount: "", note: "", hour: new Date().getHours(), is_night: 0 });
  const [result, setResult] = useState(null);
  const [scanProgress, setScanProgress] = useState(0);

  const handlePay = async () => {
    if (!form.upiId || !form.amount) return;
    setStep("scanning");
    setScanProgress(0);

    const prog = setInterval(() => {
      setScanProgress(p => {
        if (p >= 90) { clearInterval(prog); return 90; }
        return p + 15;
      });
    }, 200);

    try {
      const v = () => +(Math.random() * 4 - 2).toFixed(4);
      const amount = +form.amount;
      const { data } = await axios.post(`${API}/predict`, {
        V1:v(),V2:v(),V3:v(),V4:v(),V5:v(),V6:v(),V7:v(),
        V8:v(),V9:v(),V10:v(),V11:v(),V12:v(),V13:v(),V14:v(),
        V15:v(),V16:v(),V17:v(),V18:v(),V19:v(),V20:v(),V21:v(),
        V22:v(),V23:v(),V24:v(),V25:v(),V26:v(),V27:v(),V28:v(),
        amount_log:+Math.log1p(amount).toFixed(4),
        amount_zscore:+((amount-88)/250).toFixed(4),
        is_high_amount:amount>4750?1:0,
        hour:+form.hour, is_night:+form.is_night,
      });

      clearInterval(prog);
      setScanProgress(100);
      const userRisk = getUserRisk(amount);
      const reasons = getReasonCodes(amount, form.hour, form.is_night, data.fraud_probability);
      if (!userRisk.isNew && userRisk.deviation > 2) {
        reasons.push({ code: "AMOUNT_DEVIATION", label: `Way above your usual amount (avg: ₹${userRisk.avg})` });
      }
      const actionPlan = getActionPlan(data.action, reasons, amount);

      setTimeout(() => {
        const txnData = { ...data, reasons, actionPlan, amount, upiId: form.upiId, name: form.name };
        addTransaction(txnData);
        setResult(txnData);
        setStep("result");
      }, 500);
    } catch (e) {
      clearInterval(prog);
      setStep("form");
      alert("API not reachable. Make sure FastAPI is running.");
    }
  };

  const reset = () => { setStep("form"); setResult(null); setForm({ upiId: "", name: "", amount: "", note: "", hour: new Date().getHours(), is_night: 0 }); };

  return (
    <div style={{ maxWidth: 480, margin: "0 auto" }}>

      {step === "form" && (
        <div style={{ background: "#1e293b", borderRadius: 16, padding: 28, border: "1px solid #334155" }}>
          <h3 style={{ color: "#60a5fa", marginBottom: 4, textAlign: "center" }}>💳 Send Money</h3>
          <p style={{ color: "#475569", fontSize: 12, textAlign: "center", marginBottom: 24 }}>
            Our AI scans the transaction before you pay
          </p>

          <div style={{ marginBottom: 16 }}>
            <label style={{ color: "#94a3b8", fontSize: 13, display: "block", marginBottom: 6 }}>Recipient UPI ID</label>
            <input value={form.upiId} placeholder="example@upi"
              onChange={e => setForm(p => ({ ...p, upiId: e.target.value }))}
              style={{ width: "100%", padding: "11px 14px", borderRadius: 8, background: "#0f172a", color: "white", border: "1px solid #334155", fontSize: 14, boxSizing: "border-box" }} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ color: "#94a3b8", fontSize: 13, display: "block", marginBottom: 6 }}>Recipient Name (optional)</label>
            <input value={form.name} placeholder="John Doe"
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              style={{ width: "100%", padding: "11px 14px", borderRadius: 8, background: "#0f172a", color: "white", border: "1px solid #334155", fontSize: 14, boxSizing: "border-box" }} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ color: "#94a3b8", fontSize: 13, display: "block", marginBottom: 6 }}>Amount (₹)</label>
            <input type="number" value={form.amount} placeholder="Enter amount"
              onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
              style={{ width: "100%", padding: "11px 14px", borderRadius: 8, background: "#0f172a", color: "white", border: "1px solid #334155", fontSize: 18, fontWeight: "bold", boxSizing: "border-box" }} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ color: "#94a3b8", fontSize: 13, display: "block", marginBottom: 6 }}>Note (optional)</label>
            <input value={form.note} placeholder="Rent, groceries..."
              onChange={e => setForm(p => ({ ...p, note: e.target.value }))}
              style={{ width: "100%", padding: "11px 14px", borderRadius: 8, background: "#0f172a", color: "white", border: "1px solid #334155", fontSize: 14, boxSizing: "border-box" }} />
          </div>

          <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
            <div style={{ flex: 1 }}>
              <label style={{ color: "#94a3b8", fontSize: 13, display: "block", marginBottom: 6 }}>Hour</label>
              <input type="number" value={form.hour} min={0} max={23}
                onChange={e => setForm(p => ({ ...p, hour: e.target.value }))}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, background: "#0f172a", color: "white", border: "1px solid #334155", fontSize: 14, boxSizing: "border-box" }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ color: "#94a3b8", fontSize: 13, display: "block", marginBottom: 6 }}>Night?</label>
              <select value={form.is_night} onChange={e => setForm(p => ({ ...p, is_night: e.target.value }))}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, background: "#0f172a", color: "white", border: "1px solid #334155", fontSize: 14 }}>
                <option value={0}>No</option>
                <option value={1}>Yes</option>
              </select>
            </div>
          </div>

          <button onClick={handlePay} disabled={!form.upiId || !form.amount}
            style={{ width: "100%", padding: 14,
              background: (!form.upiId || !form.amount) ? "#334155" : "linear-gradient(135deg,#3b82f6,#6366f1)",
              color: "white", border: "none", borderRadius: 12,
              fontWeight: "bold", cursor: (!form.upiId || !form.amount) ? "not-allowed" : "pointer",
              fontSize: 16, boxShadow: "0 0 20px #3b82f644" }}>
            🔍 Scan & Check Before Paying
          </button>

          <p style={{ color: "#334155", fontSize: 11, textAlign: "center", marginTop: 12 }}>
            🛡️ AI fraud scan runs before your payment is processed
          </p>
        </div>
      )}

      {step === "scanning" && (
        <div style={{ background: "#1e293b", borderRadius: 16, padding: 40, border: "1px solid #334155", textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
          <h3 style={{ color: "#60a5fa", marginBottom: 8 }}>Scanning Transaction</h3>
          <p style={{ color: "#475569", fontSize: 13, marginBottom: 24 }}>AI is analyzing this payment for fraud signals...</p>
          <div style={{ background: "#334155", borderRadius: 8, height: 8, marginBottom: 16 }}>
            <div style={{ width: `${scanProgress}%`, height: "100%", borderRadius: 8, background: "linear-gradient(90deg,#3b82f6,#6366f1)", transition: "width 0.3s ease" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, textAlign: "left" }}>
            {[["✓ Checking transaction velocity", scanProgress > 15],
              ["✓ Analyzing amount patterns", scanProgress > 35],
              ["✓ Running XGBoost model", scanProgress > 55],
              ["✓ Computing risk score", scanProgress > 75],
              ["✓ Generating reason codes", scanProgress > 90]].map(([text, done]) => (
              <div key={text} style={{ fontSize: 13, color: done ? "#00C49F" : "#334155", transition: "color 0.3s" }}>{text}</div>
            ))}
          </div>
        </div>
      )}

      {step === "result" && result && (
        <div style={{ background: "#1e293b", borderRadius: 16, padding: 28,
          border: `2px solid ${result.actionPlan.color}`, boxShadow: `0 0 40px ${result.actionPlan.color}33` }}>

          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div style={{ fontSize: 48 }}>{result.actionPlan.icon}</div>
            <h2 style={{ color: result.actionPlan.color, margin: "8px 0 4px" }}>{result.actionPlan.title}</h2>
            <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>{result.actionPlan.subtitle}</p>
          </div>

          <div style={{ background: "#0f172a", borderRadius: 10, padding: 16, marginBottom: 16 }}>
            <div style={{ color: "#64748b", fontSize: 11, marginBottom: 10, textTransform: "uppercase" }}>Transaction Summary</div>
            {[["To", result.upiId + (result.name ? ` (${result.name})` : "")],
              ["Amount", `₹${result.amount}`],
              ["Risk Score", `${result.risk_score}/100`],
              ["Risk Level", result.risk_level],
              ["Fraud Probability", `${(result.fraud_probability * 100).toFixed(1)}%`]].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #1e293b", fontSize: 13 }}>
                <span style={{ color: "#64748b" }}>{k}</span>
                <span style={{ color: "white", fontWeight: "bold" }}>{v}</span>
              </div>
            ))}
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#64748b", marginBottom: 6 }}>
              <span>Risk Score</span>
              <span style={{ color: result.actionPlan.color }}>{result.risk_score}/100</span>
            </div>
            <div style={{ background: "#334155", borderRadius: 6, height: 10 }}>
              <div style={{ width: `${result.risk_score}%`, height: "100%", borderRadius: 6, background: `linear-gradient(90deg,#00C49F,${result.actionPlan.color})`, transition: "width 0.8s ease" }} />
            </div>
          </div>

          {result.reasons.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ color: "#64748b", fontSize: 11, marginBottom: 8, textTransform: "uppercase" }}>Why Flagged</div>
              {result.reasons.map(r => (
                <div key={r.code} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: "#0f172a", borderRadius: 6, marginBottom: 6, fontSize: 12 }}>
                  <span style={{ color: "#FF4444" }}>⚠</span>
                  <span style={{ color: "#94a3b8" }}>{r.label}</span>
                  <span style={{ marginLeft: "auto", color: "#475569", fontSize: 10, background: "#1e293b", padding: "2px 6px", borderRadius: 4 }}>{r.code}</span>
                </div>
              ))}
            </div>
          )}

          {result.actionPlan.tip && (
            <div style={{ background: `${result.actionPlan.color}11`, border: `1px solid ${result.actionPlan.color}44`, borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 13, color: result.actionPlan.color }}>
              💡 {result.actionPlan.tip}
            </div>
          )}

         <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {result.actionPlan.actions.map((action, i) => (
              <button
                key={i}
                onClick={() => {
                  if (action.label.includes("Proceed")) {
                    openRazorpay(result.amount, result.upiId, result.name);
                  } else {
                    reset();
                  }
                }}
                style={{
                  width: "100%",
                  padding: 12,
                  background: action.primary
                    ? `linear-gradient(135deg,${result.actionPlan.color},${result.actionPlan.color}88)`
                    : "#334155",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  fontWeight: action.primary ? "bold" : "normal",
                  cursor: "pointer",
                  fontSize: 14
                }}
              >
                {action.label}
              </button>
            ))}
          </div>

          <QRPayment amount={result.amount} upiId={result.upiId} name={result.name} riskResult={result} />

          <button onClick={reset} style={{ width: "100%", marginTop: 12, padding: 8, background: "transparent", color: "#475569", border: "1px solid #334155", borderRadius: 8, cursor: "pointer", fontSize: 12 }}>
            ← Start New Payment
          </button>
        </div>
      )}
    </div>
  );
}
 
 // ── SYSTEM HEALTH ─────────────────────────────────────────
 function StatusPill({ label, ok }) {
   const state = ok === null ? "checking" : ok ? "up" : "down";
   const color = state === "up" ? "#00C49F" : state === "down" ? "#FF4444" : "#FFBB28";
   const dot = state === "up" ? "🟢" : state === "down" ? "🔴" : "🟡";
   const text = state === "up" ? "Online" : state === "down" ? "Offline" : "Checking";
   return (
     <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#1e293b",
       border: `1px solid ${color}55`, borderRadius: 8, padding: "5px 10px", fontSize: 11 }}>
       <span style={{ color: "#64748b" }}>{label}</span>
       <span style={{ color, fontWeight: "bold" }}>{dot} {text}</span>
     </div>
   );
 }

 function SystemHealth({ backend, api, model }) {
   return (
     <div style={{ display: "flex", gap: 8 }}>
       <StatusPill label="Backend" ok={backend} />
       <StatusPill label="API" ok={api} />
       <StatusPill label="Model" ok={model === null ? null : (backend && model)} />
     </div>
   );
 }

 // ── DASHBOARD ─────────────────────────────────────────────
 function Dashboard({ user, onLogout }) {
   const isAdmin = user.role === "admin";
   const [txns, setTxns] = useState([]);
   const [stats, setStats] = useState({ ALLOW: 0, CHALLENGE: 0, BLOCK: 0 });
   const [statsAtHourStart, setStatsAtHourStart] = useState({ ALLOW: 0, CHALLENGE: 0, BLOCK: 0 });
   const [tab, setTab] = useState("live");
   const [filter, setFilter] = useState(isAdmin ? "ALL" : "BLOCK");
   const [selected, setSelected] = useState(null);
   const [alert, setAlert] = useState(null);
   const [trendData, setTrendData] = useState([]);
   const [form, setForm] = useState({ amount: 1000, hour: 12, is_night: 0 });
   const [result, setResult] = useState(null);
   const [loading, setLoading] = useState(false);
   const [testProgress, setTestProgress] = useState(0);
   const [counter, setCounter] = useState(0);
   const [health, setHealth] = useState({ backend: null, model: null, modelName: "" });
   const [apiOk, setApiOk] = useState(null);
   const [modelStats, setModelStats] = useState(null);

   // System health: poll the real /health endpoint.
   useEffect(() => {
     const checkHealth = async () => {
       try {
         const { data } = await axios.get(`${API}/health`, { timeout: 4000 });
         setHealth({ backend: true, model: !!data.model_loaded, modelName: data.active_model || "" });
       } catch (e) {
         setHealth({ backend: false, model: false, modelName: "" });
       }
     };
     checkHealth();
     const iv = setInterval(checkHealth, 8000);
     return () => clearInterval(iv);
   }, []);

   // Model performance stats for the Models tab.
   useEffect(() => {
     axios.get(`${API}/stats`, { timeout: 4000 })
       .then(({ data }) => setModelStats(data))
       .catch(() => setModelStats(null));
   }, []);

   useEffect(() => {
     const interval = setInterval(async () => {
       try {
         const txn = randomTxn();
         const { data } = await axios.post(`${API}/predict`, txn);
         setApiOk(true);
         const entry = {
           id: "TXN" + Math.floor(Math.random() * 99999).toString().padStart(5, "0"),
           amount: txn._amount, time: new Date().toLocaleTimeString(),
           hour: txn.hour,
           prob: data.fraud_probability, action: data.action,
           risk: data.risk_level, score: data.risk_score,
         };
         setTxns(prev => [entry, ...prev].slice(0, 200));
         setStats(prev => ({ ...prev, [data.action]: (prev[data.action] || 0) + 1 }));
         setCounter(c => c + 1);
         if (data.action === "BLOCK") { setAlert(entry); setTimeout(() => setAlert(null), 4000); }
         setTrendData(prev => [...prev.slice(-29), {
           time: new Date().toLocaleTimeString(),
           probability: +(data.fraud_probability * 100).toFixed(2),
         }]);
       } catch (e) { setApiOk(false); }
     }, 1800);
     return () => clearInterval(interval);
   }, []);

   // Snapshot stats every hour so KPI cards can show a real "since last hour" delta.
   useEffect(() => {
     const iv = setInterval(() => setStatsAtHourStart(stats), 60 * 60 * 1000);
     return () => clearInterval(iv);
     // eslint-disable-next-line react-hooks/exhaustive-deps
   }, []);

   const handleTest = async () => {
     setLoading(true); setResult(null); setTestProgress(0);
     const prog = setInterval(() => {
       setTestProgress(p => (p >= 90 ? (clearInterval(prog), 90) : p + 12));
     }, 180);
     try {
       const v = () => +(Math.random() * 4 - 2).toFixed(4);
       const amount = +form.amount;
       const { data } = await axios.post(`${API}/predict`, {
         V1:v(),V2:v(),V3:v(),V4:v(),V5:v(),V6:v(),V7:v(),
         V8:v(),V9:v(),V10:v(),V11:v(),V12:v(),V13:v(),V14:v(),
         V15:v(),V16:v(),V17:v(),V18:v(),V19:v(),V20:v(),V21:v(),
         V22:v(),V23:v(),V24:v(),V25:v(),V26:v(),V27:v(),V28:v(),
         amount_log:+Math.log1p(amount).toFixed(4),
         amount_zscore:+((amount-88)/250).toFixed(4),
         is_high_amount:amount>4750?1:0,
         hour:+form.hour, is_night:+form.is_night,
       });
       clearInterval(prog);
       setTestProgress(100);
       setTimeout(() => setResult(data), 350);
     } catch (e) {
       clearInterval(prog);
       setResult({ error: "API not reachable" });
     }
     setLoading(false);
   };

   const filtered = txns.filter(t => filter === "ALL" ? true : t.action === filter);
   const total = stats.ALLOW + stats.CHALLENGE + stats.BLOCK || 1;
   const fraudRate = ((stats.BLOCK / total) * 100).toFixed(1);
   const pieData = [
     { name: "Allow", value: stats.ALLOW },
     { name: "Challenge", value: stats.CHALLENGE },
     { name: "Block", value: stats.BLOCK },
   ];
   const deltaOf = key => stats[key] - (statsAtHourStart[key] || 0);

   // ── Analytics derived data ──────────────────────────────
   const hourBuckets = Array.from({ length: 24 }, (_, h) => ({ hour: h, total: 0, blocked: 0 }));
   txns.forEach(t => {
     if (typeof t.hour === "number") {
       hourBuckets[t.hour].total += 1;
       if (t.action === "BLOCK") hourBuckets[t.hour].blocked += 1;
     }
   });
   const hourData = hourBuckets.map(b => ({
     hour: `${String(b.hour).padStart(2, "0")}:00`,
     fraud: b.blocked,
   }));
   const riskCounts = { LOW: 0, MEDIUM: 0, HIGH: 0 };
   txns.forEach(t => { if (riskCounts[t.risk] !== undefined) riskCounts[t.risk] += 1; });
   const riskData = [
     { name: "Low", value: riskCounts.LOW },
     { name: "Medium", value: riskCounts.MEDIUM },
     { name: "High", value: riskCounts.HIGH },
   ];
   const RISK_COLORS = { Low: "#00C49F", Medium: "#FFBB28", High: "#FF4444" };
   const decisionData = [
     { name: "ALLOW", count: stats.ALLOW, fill: "#00C49F" },
     { name: "CHALLENGE", count: stats.CHALLENGE, fill: "#FFBB28" },
     { name: "BLOCK", count: stats.BLOCK, fill: "#FF4444" },
   ];
 
   const tabs = [
     { id: "live", label: "⚡ Live Feed" },
     { id: "pay", label: "💳 Pay" },
     { id: "tester", label: "🧪 Test" },
     ...(isAdmin ? [{ id: "models", label: "🤖 Models" }] : []),
     { id: "analytics", label: "📈 Analytics" },
     { id: "history", label: "📋 History" },
   ];
 
   return (
     <div style={{ background: "#0a0f1e", minHeight: "100vh", color: "white",
       fontFamily: "'Segoe UI',sans-serif", padding: 24 }}>
 
       {/* ALERT */}
       {alert && (
         <div style={{ position: "fixed", top: 20, right: 20, zIndex: 999,
           background: "#1e293b", border: "2px solid #FF4444", borderRadius: 12,
           padding: "16px 24px", boxShadow: "0 0 30px rgba(255,68,68,0.5)" }}>
           <div style={{ color: "#FF4444", fontWeight: "bold" }}>🚨 FRAUD BLOCKED</div>
           <div style={{ color: "#94a3b8", fontSize: 13 }}>{alert.id} — ₹{alert.amount}</div>
           <div style={{ color: "#94a3b8", fontSize: 12 }}>Score: {alert.score}/100</div>
         </div>
       )}
 
       {/* MODAL */}
       {selected && (
         <div onClick={() => setSelected(null)} style={{ position: "fixed", inset: 0,
           background: "rgba(0,0,0,0.7)", zIndex: 998, display: "flex",
           alignItems: "center", justifyContent: "center" }}>
           <div onClick={e => e.stopPropagation()} style={{ background: "#1e293b",
             borderRadius: 16, padding: 32, minWidth: 340,
             border: `2px solid ${badgeColor(selected.action)}` }}>
             <h3 style={{ color: "#60a5fa", marginBottom: 16 }}>Transaction Details</h3>
             {[["ID", selected.id], ["Amount", "₹" + selected.amount], ["Time", selected.time],
               ...(isAdmin ? [["Fraud Prob", (selected.prob * 100).toFixed(2) + "%"]] : []),
               ["Risk Score", selected.score + "/100"], ["Decision", selected.action]].map(([k, v]) => (
               <div key={k} style={{ display: "flex", justifyContent: "space-between",
                 padding: "8px 0", borderBottom: "1px solid #334155", fontSize: 14 }}>
                 <span style={{ color: "#94a3b8" }}>{k}</span>
                 <span style={{ color: k === "Decision" ? badgeColor(selected.action) : "white",
                   fontWeight: "bold" }}>{v}</span>
               </div>
             ))}
             <button onClick={() => setSelected(null)} style={{ marginTop: 16, width: "100%",
               padding: 10, background: "#334155", color: "white", border: "none",
               borderRadius: 8, cursor: "pointer" }}>Close</button>
           </div>
         </div>
       )}
 
       {/* HEADER */}
       <div style={{ display: "flex", justifyContent: "space-between",
         alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
         <div>
           <h1 style={{ color: "#60a5fa", margin: 0, fontSize: 26 }}>🛡️ UPI Fraud Detection</h1>
           <p style={{ color: "#475569", margin: "4px 0 0", fontSize: 13 }}>
             {counter} transactions analyzed • Real-time ML monitoring
           </p>
         </div>
         <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
           <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
             <div style={{ background: isAdmin ? "#3b82f622" : "#34d39922",
               border: `1px solid ${isAdmin ? "#3b82f6" : "#34d399"}`,
               borderRadius: 8, padding: "6px 14px", fontSize: 13 }}>
               <span style={{ color: isAdmin ? "#60a5fa" : "#34d399", fontWeight: "bold" }}>
                 {isAdmin ? "👑" : "🔍"} {user.name}
               </span>
             </div>
             <div style={{ background: "#00C49F22", border: "1px solid #00C49F",
               borderRadius: 8, padding: "6px 12px", color: "#00C49F", fontSize: 12 }}>● LIVE</div>
             <button onClick={onLogout} style={{ padding: "6px 14px", background: "#334155",
               color: "#94a3b8", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 12 }}>
               Logout
             </button>
           </div>
           <SystemHealth backend={health.backend} api={apiOk} model={health.model} modelName={health.modelName} />
         </div>
       </div>
 
       {/* STATS */}
       <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
         {[
           { label: "✅ Allowed", val: stats.ALLOW, color: "#00C49F", delta: deltaOf("ALLOW"), sub: "this hour" },
           { label: "⚠️ Challenged", val: stats.CHALLENGE, color: "#FFBB28", delta: deltaOf("CHALLENGE"), sub: "this hour" },
           { label: "❌ Blocked", val: stats.BLOCK, color: "#FF4444", delta: deltaOf("BLOCK"), sub: "this hour" },
           ...(isAdmin ? [{ label: "📊 Fraud Rate", val: fraudRate + "%", color: "#a78bfa", sub: `Last ${total} txns` }] : []),
         ].map(({ label, val, color, delta, sub }) => (
           <div key={label} style={{ background: `linear-gradient(135deg,#1e293b,${color}11)`,
             borderRadius: 12, padding: "16px 20px", flex: 1, minWidth: 160, borderLeft: `3px solid ${color}` }}>
             <div style={{ color: "#64748b", fontSize: 12, marginBottom: 4 }}>{label}</div>
             <div style={{ fontSize: 28, fontWeight: "bold", color }}>{val}</div>
             <div style={{ fontSize: 11, marginTop: 4,
               color: delta === undefined ? "#475569" : delta > 0 ? "#00C49F" : delta < 0 ? "#FF4444" : "#475569" }}>
               {delta === undefined
                 ? sub
                 : `${delta > 0 ? "↑" : delta < 0 ? "↓" : "→"} ${delta > 0 ? "+" : ""}${delta} ${sub}`}
             </div>
           </div>
         ))}
       </div>
 
       {/* TABS */}
       <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
         {tabs.map(({ id, label }) => (
           <button key={id} onClick={() => setTab(id)} style={{ padding: "9px 20px",
             borderRadius: 8, border: "none", cursor: "pointer", fontWeight: "bold",
             fontSize: 13, background: tab === id ? "#3b82f6" : "#1e293b",
             color: tab === id ? "white" : "#64748b" }}>
             {label}
           </button>
         ))}
       </div>
 
       {/* PAY TAB */}
       {tab === "pay" && <PayTab />}
 
       {/* LIVE FEED */}
       {tab === "live" && (
         <div style={{ display: "flex", gap: 16 }}>
           <div style={{ flex: 2, background: "#1e293b", borderRadius: 14, padding: 20,
             border: "1px solid #334155" }}>
             <div style={{ display: "flex", justifyContent: "space-between",
               alignItems: "center", marginBottom: 14 }}>
               <h3 style={{ color: "#60a5fa", margin: 0 }}>⚡ Live Transactions</h3>
               <div style={{ display: "flex", gap: 6 }}>
                 {(isAdmin ? ["ALL","ALLOW","CHALLENGE","BLOCK"] : ["BLOCK","CHALLENGE"]).map(f => (
                   <button key={f} onClick={() => setFilter(f)}
                     style={{ padding: "4px 10px", borderRadius: 6, border: "none",
                       cursor: "pointer", fontSize: 11, fontWeight: "bold",
                       background: filter === f ? badgeColor(f === "ALL" ? "ALLOW" : f) : "#334155",
                       color: "white" }}>{f}</button>
                 ))}
               </div>
             </div>
             <div style={{ maxHeight: 420, overflowY: "auto" }}>
               {filtered.map(t => (
                 <div key={t.id + t.time} onClick={() => setSelected(t)}
                   style={{ display: "flex", justifyContent: "space-between",
                     alignItems: "center", padding: "10px 8px",
                     borderBottom: "1px solid #1e3a5f", fontSize: 13, cursor: "pointer" }}
                   onMouseEnter={e => e.currentTarget.style.background = "#1e3a5f"}
                   onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                   <span style={{ color: "#60a5fa", fontFamily: "monospace" }}>{t.id}</span>
                   <span>₹{t.amount}</span>
                   <span style={{ color: "#475569", fontSize: 11 }}>{t.time}</span>
                   {isAdmin && <span style={{ color: "#64748b", fontSize: 11 }}>Score: {t.score}</span>}
                   <span style={{ background: badgeColor(t.action), color: "white",
                     borderRadius: 6, padding: "3px 10px", fontWeight: "bold", fontSize: 11 }}>
                     {t.action}
                   </span>
                 </div>
               ))}
             </div>
           </div>
           <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
             <div style={{ background: "#1e293b", borderRadius: 14, padding: 16, border: "1px solid #334155" }}>
               <h4 style={{ color: "#60a5fa", margin: "0 0 8px" }}>📊 Distribution</h4>
               <PieChart width={200} height={180}>
                 <Pie data={pieData} cx={100} cy={90} innerRadius={50} outerRadius={80} dataKey="value">
                   {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                 </Pie>
                 <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155" }} />
               </PieChart>
             </div>
             <div style={{ background: "#1e293b", borderRadius: 14, padding: 16, border: "1px solid #334155" }}>
               <h4 style={{ color: "#60a5fa", margin: "0 0 8px" }}>💡 Stats</h4>
               {[["Total", counter], ["Blocked", stats.BLOCK],
                 ...(isAdmin ? [["Fraud Rate", fraudRate + "%"]] : [])].map(([k, v]) => (
                 <div key={k} style={{ display: "flex", justifyContent: "space-between",
                   padding: "6px 0", borderBottom: "1px solid #334155", fontSize: 13 }}>
                   <span style={{ color: "#64748b" }}>{k}</span>
                   <span style={{ color: "white", fontWeight: "bold" }}>{v}</span>
                 </div>
               ))}
             </div>
           </div>
         </div>
       )}
 
       {/* TESTER */}
      {tab === "tester" && (
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <div style={{ background: "#1e293b", borderRadius: 14, padding: 24,
            border: "1px solid #334155", maxWidth: 420, flex: "1 1 340px" }}>
            <h3 style={{ color: "#60a5fa", marginBottom: 20 }}>🧪 Test a Transaction</h3>
            {[["Amount (₹)", "amount"], ["Hour (0-23)", "hour"]].map(([label, key]) => (
              <div key={key} style={{ marginBottom: 14 }}>
                <label style={{ color: "#94a3b8", fontSize: 13, display: "block", marginBottom: 6 }}>{label}</label>
                <input type="number" value={form[key]}
                  onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8,
                    background: "#0f172a", color: "white", border: "1px solid #334155",
                    fontSize: 14, boxSizing: "border-box" }} />
              </div>
            ))}
            <div style={{ marginBottom: 20 }}>
              <label style={{ color: "#94a3b8", fontSize: 13, display: "block", marginBottom: 6 }}>Night?</label>
              <select value={form.is_night} onChange={e => setForm(p => ({ ...p, is_night: e.target.value }))}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8,
                  background: "#0f172a", color: "white", border: "1px solid #334155", fontSize: 14 }}>
                <option value={0}>No</option><option value={1}>Yes</option>
              </select>
            </div>
            <button onClick={handleTest} disabled={loading}
              style={{ width: "100%", padding: 13,
                background: loading ? "#334155" : "linear-gradient(135deg,#3b82f6,#6366f1)",
                color: "white", border: "none", borderRadius: 10,
                fontWeight: "bold", cursor: loading ? "not-allowed" : "pointer", fontSize: 15 }}>
              {loading ? "🔄 Analyzing..." : "🔍 Analyze"}
            </button>
          </div>

          {loading && (
            <div style={{ flex: "1 1 340px", background: "#1e293b", borderRadius: 14, padding: 28,
              border: "1px solid #334155", textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
              <h3 style={{ color: "#60a5fa", marginBottom: 4 }}>Analyzing...</h3>
              <p style={{ color: "#475569", fontSize: 12, marginBottom: 20 }}>
                Scoring this transaction against the fraud model
              </p>
              <div style={{ background: "#334155", borderRadius: 8, height: 8, marginBottom: 18 }}>
                <div style={{ width: `${testProgress}%`, height: "100%", borderRadius: 8,
                  background: "linear-gradient(90deg,#3b82f6,#6366f1)", transition: "width 0.25s ease" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, textAlign: "left" }}>
                {[["Running XGBoost...", testProgress > 20],
                  ["Calculating SHAP...", testProgress > 50],
                  ["Decision Engine...", testProgress > 80]].map(([text, done]) => (
                  <div key={text} style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 8,
                    color: done ? "#00C49F" : "#475569", transition: "color 0.3s" }}>
                    <span>{done ? "✓" : "○"}</span> {text}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loading && result && result.error && (
            <div style={{ flex: "1 1 340px", background: "#1e293b", borderRadius: 14, padding: 24,
              border: "2px solid #FF4444", color: "#FF4444" }}>
              ⚠ {result.error}
            </div>
          )}

          {!loading && result && !result.error && (
            <div style={{ flex: "1 1 340px", background: "#1e293b", borderRadius: 14, padding: 28,
              border: `2px solid ${badgeColor(result.action)}`,
              boxShadow: `0 0 30px ${badgeColor(result.action)}22` }}>
              <div style={{ color: "#64748b", fontSize: 11, textTransform: "uppercase",
                letterSpacing: 1, marginBottom: 8, textAlign: "center" }}>Prediction</div>
              <div style={{ textAlign: "center", fontSize: 30, fontWeight: "bold",
                color: badgeColor(result.action), marginBottom: 24 }}>
                {result.action === "ALLOW" ? "✔ ALLOW" : result.action === "CHALLENGE" ? "⚠ CHALLENGE" : "✖ BLOCK"}
              </div>
              <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
                <div style={{ flex: 1, background: "#0f172a", borderRadius: 10, padding: "14px 16px", textAlign: "center" }}>
                  <div style={{ color: "#64748b", fontSize: 11, marginBottom: 6 }}>Risk Score</div>
                  <div style={{ fontSize: 20, fontWeight: "bold", color: "white" }}>{result.risk_score} / 100</div>
                </div>
                <div style={{ flex: 1, background: "#0f172a", borderRadius: 10, padding: "14px 16px", textAlign: "center" }}>
                  <div style={{ color: "#64748b", fontSize: 11, marginBottom: 6 }}>Fraud Probability</div>
                  <div style={{ fontSize: 20, fontWeight: "bold", color: "white" }}>
                    {(result.fraud_probability * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
              <div style={{ marginBottom: 4 }}>
                <div style={{ background: "#334155", borderRadius: 6, height: 10 }}>
                  <div style={{ width: `${result.risk_score}%`, height: "100%", borderRadius: 6,
                    background: `linear-gradient(90deg,#00C49F,${badgeColor(result.action)})`, transition: "width 0.8s ease" }} />
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between",
                padding: "10px 0", borderTop: "1px solid #334155", marginTop: 12, fontSize: 13 }}>
                <span style={{ color: "#64748b" }}>Risk Level</span>
                <span style={{ color: badgeColor(result.action), fontWeight: "bold" }}>{result.risk_level}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODELS */}
      {tab === "models" && isAdmin && (
        <div style={{ background: "#1e293b", borderRadius: 14, padding: 24, border: "1px solid #334155" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 8 }}>
            <h3 style={{ color: "#60a5fa", margin: 0 }}>🤖 Model Performance</h3>
            {modelStats && (
              <span style={{ fontSize: 11, color: modelStats.metrics_source === "measured" ? "#00C49F" : "#FFBB28" }}>
                {modelStats.metrics_source === "measured"
                  ? "● Metrics from last training run"
                  : "● Estimated — rerun training for exact precision/recall/F1"}
              </span>
            )}
          </div>
          {[["LogisticRegression", "Logistic Regression", "#60a5fa"],
            ["RandomForest", "Random Forest", "#34d399"],
            ["XGBoost", "XGBoost ⭐ Active", "#f59e0b"]].map(([key, name, color]) => {
            const m = modelStats?.models?.[key];
            const auc = m?.roc_auc ?? m?.accuracy ?? 0;
            return (
              <div key={key} style={{ marginBottom: 20, padding: 16,
                background: "#0f172a", borderRadius: 10, border: `1px solid ${color}33` }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                  <span style={{ fontWeight: "bold" }}>{name}</span>
                  <span style={{ color, fontWeight: "bold", fontSize: 18 }}>
                    {m ? (m.accuracy * 100).toFixed(2) + "%" : "…"}
                  </span>
                </div>
                <div style={{ background: "#334155", borderRadius: 6, height: 12, marginBottom: 14 }}>
                  <div style={{ width: `${auc * 100}%`, height: "100%", borderRadius: 6,
                    background: `linear-gradient(90deg,${color}88,${color})` }} />
                </div>
                {m && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(80px, 1fr))", gap: 8 }}>
                    {[["Precision", (m.precision * 100).toFixed(1) + "%"],
                      ["Recall", (m.recall * 100).toFixed(1) + "%"],
                      ["F1 Score", (m.f1_score * 100).toFixed(1) + "%"],
                      ["ROC-AUC", (m.roc_auc * 100).toFixed(1) + "%"],
                      ["Inference", m.inference_time_ms != null ? m.inference_time_ms.toFixed(2) + " ms" : "—"]]
                      .map(([label, val]) => (
                      <div key={label} style={{ background: "#1e293b", borderRadius: 8, padding: "8px 6px", textAlign: "center" }}>
                        <div style={{ color: "#64748b", fontSize: 10, marginBottom: 4 }}>{label}</div>
                        <div style={{ color: "white", fontSize: 13, fontWeight: "bold" }}>{val}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ANALYTICS */}
      {tab === "analytics" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: 16 }}>
          <div style={{ background: "#1e293b", borderRadius: 14, padding: 20, border: "1px solid #334155" }}>
            <h3 style={{ color: "#60a5fa", marginBottom: 16, fontSize: 15 }}>📈 Fraud Probability Over Time</h3>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="time" tick={{ fill: "#64748b", fontSize: 9 }} interval={4} />
                <YAxis tick={{ fill: "#64748b", fontSize: 11 }} unit="%" domain={[0, 100]} />
                <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155" }}
                  formatter={v => [`${v}%`, "Fraud Probability"]} />
                <Line type="monotone" dataKey="probability" stroke="#FF4444" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div style={{ background: "#1e293b", borderRadius: 14, padding: 20, border: "1px solid #334155" }}>
            <h3 style={{ color: "#60a5fa", marginBottom: 16, fontSize: 15 }}>🕐 Hour-Wise Fraud Distribution</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={hourData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="hour" tick={{ fill: "#64748b", fontSize: 9 }} interval={2} />
                <YAxis tick={{ fill: "#64748b", fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155" }} />
                <Bar dataKey="fraud" fill="#FF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={{ background: "#1e293b", borderRadius: 14, padding: 20, border: "1px solid #334155" }}>
            <h3 style={{ color: "#60a5fa", marginBottom: 16, fontSize: 15 }}>🧭 Risk Level Distribution</h3>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={riskData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {riskData.map((d, i) => <Cell key={i} fill={RISK_COLORS[d.name]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155" }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div style={{ background: "#1e293b", borderRadius: 14, padding: 20, border: "1px solid #334155" }}>
            <h3 style={{ color: "#60a5fa", marginBottom: 16, fontSize: 15 }}>⚖️ Decision Breakdown</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={decisionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 11 }} />
                <YAxis tick={{ fill: "#64748b", fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155" }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {decisionData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      {tab === "history" && <TransactionHistory />}

     </div>
   );
 }
 
 // ── ROOT ──────────────────────────────────────────────────
  export default function App() {
   const [user, setUser] = useState(null);
   const [profileDone, setProfileDone] = useState(
     () => !!localStorage.getItem("upi_profile")
   );
 
   if (!profileDone) {
     return <ProfileSetup onComplete={() => setProfileDone(true)} />;
   }
 
   return user
     ? <Dashboard user={user} onLogout={() => setUser(null)} />
     : <LoginPage onLogin={setUser} />;
 }