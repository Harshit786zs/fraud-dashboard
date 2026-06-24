 ![React](https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)
![Razorpay](https://img.shields.io/badge/Payments-Razorpay%20(Test%20Mode)-3395FF)
![License](https://img.shields.io/badge/License-MIT-yellow)

# UPI Fraud Detection — Dashboard

The React + Vite frontend for the [UPI Fraud Detection System](https://github.com/Harshit786zs/Upi_Fraud_Detection) — a full-stack final-year project pairing a real-time fraud-scoring ML backend with an interactive dashboard for monitoring, testing, and explaining flagged transactions.

This dashboard simulates a UPI payment app's operations view: live transaction monitoring, a working test-mode payment flow, and model performance/explainability tooling, all backed by a live FastAPI + XGBoost API.

**🔗 Backend / ML API:** [Upi_Fraud_Detection](https://github.com/Harshit786zs/Upi_Fraud_Detection) — XGBoost classifier (97.94% ROC-AUC), SHAP explainability, 0–100 risk scoring.

## Live Demo Credentials

> Test environment only — no real user data or real payments are involved.

| Role | Username | Password |
| ----- | -------- | -------- |
| Admin | `admin` | `admin123` |
| Analyst | `analyst` | `analyst123` |

## Features

- **Login** — role-based access (Admin / Analyst)
- **Live Feed** — real-time stream of incoming transactions with fraud flags and risk scores from the backend
- **Pay** — generate a UPI QR code and complete a Razorpay test-mode checkout, which feeds a live transaction into the fraud-detection pipeline
- **Test** — manually submit transaction parameters to see the model's prediction, risk score, and SHAP explanation
- **Models** — compare performance across the trained ML models (Logistic Regression, Random Forest, XGBoost)
- **Analytics** — aggregate views of flagged transactions, risk distribution, and trends
- **History** — searchable log of past transactions and their outcomes
- **Personal UPI Profile** — a locally-stored mock user profile for the demo payment flow

## Tech Stack

- React
- Vite
- Razorpay Checkout (test mode)
- QR code generation
- REST integration with the FastAPI backend

## Architecture

```
┌─────────────────────┐        REST API        ┌──────────────────────────┐
│  React + Vite        │  ───────────────────▶  │  FastAPI Backend          │
│  (this repo)         │                         │  XGBoost + SHAP + Risk   │
│  Dashboard / Pay UI   │  ◀───────────────────  │  Scoring (0–100)          │
└─────────────────────┘   prediction + score     └──────────────────────────┘
```

The dashboard calls the backend's `/predict` endpoint for every simulated transaction (including those generated from the Pay tab) and renders the returned fraud probability, risk tier, and SHAP-based explanation in real time.

## Getting Started

### 1. Run the backend first

This dashboard expects the FastAPI backend running locally. See the [backend repo](https://github.com/Harshit786zs/Upi_Fraud_Detection) for setup — by default it runs at `http://localhost:8000`.

### 2. Run the dashboard

```bash
git clone https://github.com/Harshit786zs/fraud-dashboard.git
cd fraud-dashboard
npm install
npm run dev
```

The app will be available at `http://localhost:5173` (or `5174` if 5173 is in use).

Log in with one of the demo credentials above to access the dashboard.

### Payments (Test Mode)

The Pay tab uses a **Razorpay test key** (`rzp_test_T50IgpVABWIDzE`). This is a publishable test key ID — safe to expose publicly, and no real money moves through it. Use Razorpay's [test card numbers](https://razorpay.com/docs/payments/payments/test-card-upi-details/) to complete a checkout.

## Screenshots

*Coming soon — add screenshots of the Live Feed, Pay flow, and Analytics views here.*

## Related Repository

- **Backend / ML API:** [Upi_Fraud_Detection](https://github.com/Harshit786zs/Upi_Fraud_Detection)

## Author

**Harshit Choudhary**
[GitHub](https://github.com/Harshit786zs)

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
