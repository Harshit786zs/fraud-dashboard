import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";

export function QRPayment({ amount, upiId, name, riskResult }) {
  const [show, setShow] = useState(false);
  const upiString = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(name || "Recipient")}&am=${amount}&cu=INR`;
  const isBlocked = riskResult?.action === "BLOCK";

  return (
    <div style={{ marginTop: 16 }}>
      {!isBlocked && (
        <button onClick={() => setShow(!show)}
          style={{ width: "100%", padding: 12,
            background: "#0f172a", color: "#60a5fa",
            border: "1px solid #334155", borderRadius: 8,
            cursor: "pointer", fontSize: 13, fontWeight: "bold" }}>
          {show ? "Hide QR Code" : "📱 Show UPI QR Code"}
        </button>
      )}
      {show && !isBlocked && (
        <div style={{ marginTop: 16, background: "#0f172a",
          borderRadius: 12, padding: 24, textAlign: "center",
          border: "1px solid #334155" }}>
          <div style={{ background: "white", padding: 16,
            borderRadius: 12, display: "inline-block", marginBottom: 16 }}>
            <QRCodeSVG value={upiString} size={180} level="H" />
          </div>
          <div style={{ color: "#60a5fa", fontWeight: "bold", fontSize: 16, marginBottom: 4 }}>
            ₹{amount}
          </div>
          <div style={{ color: "#94a3b8", fontSize: 13, marginBottom: 4 }}>
            Pay to: {upiId}
          </div>
          <div style={{ color: "#475569", fontSize: 11, marginBottom: 16 }}>
            Scan with any UPI app
          </div>
          {riskResult && (
            <div style={{
              background: riskResult.action === "ALLOW" ? "#00C49F22" : "#FFBB2822",
              border: `1px solid ${riskResult.action === "ALLOW" ? "#00C49F" : "#FFBB28"}`,
              borderRadius: 8, padding: "8px 16px", fontSize: 12,
              color: riskResult.action === "ALLOW" ? "#00C49F" : "#FFBB28" }}>
              {riskResult.action === "ALLOW"
                ? "✅ AI Verified — Safe to scan"
                : "⚠️ Proceed with caution"}
            </div>
          )}
          <div style={{ marginTop: 12, color: "#334155", fontSize: 10 }}>
            🛡️ Fraud-scanned by UPI Fraud Detection System
          </div>
        </div>
      )}
      {isBlocked && (
        <div style={{ marginTop: 16, background: "#FF444411",
          border: "1px solid #FF4444", borderRadius: 8,
          padding: 12, textAlign: "center", color: "#FF4444", fontSize: 13 }}>
          🚫 QR blocked — High risk transaction detected
        </div>
      )}
    </div>
  );
}