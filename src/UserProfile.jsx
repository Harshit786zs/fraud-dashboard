 import { useState } from "react";

const DEFAULT_PROFILE = {
  name: "", upiId: "", phone: "", avgAmount: 500, setupDone: false
};

export function useProfile() {
  const [profile, setProfile] = useState(() => {
    try {
      const saved = localStorage.getItem("upi_profile");
      return saved ? JSON.parse(saved) : DEFAULT_PROFILE;
    } catch { return DEFAULT_PROFILE; }
  });

  const saveProfile = (data) => {
    const updated = { ...data, setupDone: true };
    localStorage.setItem("upi_profile", JSON.stringify(updated));
    setProfile(updated);
  };

  const addTransaction = (txn) => {
    const history = getHistory();
    history.unshift({ ...txn, timestamp: new Date().toISOString() });
    localStorage.setItem("upi_history", JSON.stringify(history.slice(0, 100)));
  };

  const getHistory = () => {
    try {
      const saved = localStorage.getItem("upi_history");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  };

  const getUserRisk = (amount) => {
    const history = getHistory();
    if (history.length < 3) return { deviation: 0, avg: 500, isNew: true };
    const amounts = history.map(t => t.amount);
    const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const deviation = Math.abs(amount - avg) / avg;
    return { deviation, avg: avg.toFixed(0), isNew: false };
  };

  return { profile, saveProfile, addTransaction, getHistory, getUserRisk };
}

export function ProfileSetup({ onComplete }) {
  const { saveProfile } = useProfile();
  const [form, setForm] = useState({
    name: "", upiId: "", phone: "", avgAmount: 500
  });

  const handleSave = () => {
    if (!form.name || !form.upiId) return;
    saveProfile(form);
    onComplete();
  };

  return (
    <div style={{ background: "#0a0f1e", minHeight: "100vh",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Segoe UI',sans-serif" }}>
      <div style={{ width: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 48 }}>👤</div>
          <h2 style={{ color: "#60a5fa", margin: 0 }}>Setup Your UPI Profile</h2>
          <p style={{ color: "#475569", fontSize: 13, margin: "8px 0 0" }}>
            Helps AI learn your normal transaction behavior
          </p>
        </div>
        <div style={{ background: "#1e293b", borderRadius: 16, padding: 28,
          border: "1px solid #334155" }}>
          {[["Your Name", "name", "text", "Harshit Choudhary"],
            ["Your UPI ID", "upiId", "text", "harshit@upi"],
            ["Phone Number", "phone", "tel", "9876543210"]].map(([label, key, type, ph]) => (
            <div key={key} style={{ marginBottom: 16 }}>
              <label style={{ color: "#94a3b8", fontSize: 13,
                display: "block", marginBottom: 6 }}>{label}</label>
              <input type={type} value={form[key]} placeholder={ph}
                onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                style={{ width: "100%", padding: "11px 14px", borderRadius: 8,
                  background: "#0f172a", color: "white",
                  border: "1px solid #334155", fontSize: 14,
                  boxSizing: "border-box" }} />
            </div>
          ))}
          <div style={{ marginBottom: 24 }}>
            <label style={{ color: "#94a3b8", fontSize: 13,
              display: "block", marginBottom: 6 }}>
              Your Usual Transaction Amount (₹)
            </label>
            <input type="number" value={form.avgAmount}
              onChange={e => setForm(p => ({ ...p, avgAmount: +e.target.value }))}
              style={{ width: "100%", padding: "11px 14px", borderRadius: 8,
                background: "#0f172a", color: "white",
                border: "1px solid #334155", fontSize: 14,
                boxSizing: "border-box" }} />
            <p style={{ color: "#475569", fontSize: 11, margin: "4px 0 0" }}>
              Used to detect unusual amounts for your profile
            </p>
          </div>
          <button onClick={handleSave} disabled={!form.name || !form.upiId}
            style={{ width: "100%", padding: 13,
              background: (!form.name || !form.upiId) ? "#334155"
                : "linear-gradient(135deg,#3b82f6,#6366f1)",
              color: "white", border: "none", borderRadius: 10,
              fontWeight: "bold", cursor: "pointer", fontSize: 15 }}>
            Save Profile & Continue →
          </button>
        </div>
      </div>
    </div>
  );
}

export function TransactionHistory() {
  const { getHistory } = useProfile();
  const history = getHistory();
  const badgeColor = a => a === "ALLOW" ? "#00C49F"
    : a === "CHALLENGE" ? "#FFBB28" : "#FF4444";

  return (
    <div style={{ background: "#1e293b", borderRadius: 14,
      padding: 24, border: "1px solid #334155" }}>
      <div style={{ display: "flex", justifyContent: "space-between",
        alignItems: "center", marginBottom: 16 }}>
        <h3 style={{ color: "#60a5fa", margin: 0 }}>📋 Transaction History</h3>
        <span style={{ color: "#475569", fontSize: 12 }}>
          {history.length} transactions
        </span>
      </div>
      {history.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: "#475569" }}>
          No transactions yet. Use 💳 Pay tab to start.
        </div>
      ) : (
        <div style={{ maxHeight: 400, overflowY: "auto" }}>
          {history.map((t, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between",
              alignItems: "center", padding: "12px 8px",
              borderBottom: "1px solid #334155", fontSize: 13 }}>
              <div>
                <div style={{ color: "white", fontWeight: "bold" }}>{t.upiId}</div>
                <div style={{ color: "#475569", fontSize: 11, marginTop: 2 }}>
                  {new Date(t.timestamp).toLocaleString()}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: "bold", fontSize: 15 }}>₹{t.amount}</div>
                <span style={{ background: badgeColor(t.action), color: "white",
                  borderRadius: 4, padding: "2px 8px",
                  fontSize: 10, fontWeight: "bold" }}>
                  {t.action}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}