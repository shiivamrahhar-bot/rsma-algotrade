import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { API_FEATURES } from "../constants";
import { ArrowRight, Shield, TrendingUp, Zap } from "lucide-react";

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [configured, setConfigured] = useState(true);
  const error = searchParams.get("error");

  useEffect(() => {
    api.me().then((res) => {
      if (res.authenticated) navigate("/dashboard");
    });
    api.health().then((h) => setConfigured(h.configured)).catch(() => {});
  }, [navigate]);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const { loginUrl } = await api.getLoginUrl();
      window.location.href = loginUrl;
    } catch {
      setLoading(false);
    }
  };

  const handleDemo = () => navigate("/demo");

  return (
    <div className="login-page">
      <div className="login-bg" />
      <div className="login-container">
        <div className="login-hero">
          <div className="login-brand">
            <div className="brand-icon lg">
              <Zap size={32} />
            </div>
            <h1>RSMA AlgoTrade</h1>
            <p className="login-tagline">
              Zerodha Kite Connect Trading Portal
            </p>
          </div>

          <div className="login-card">
            {error && (
              <div className="error-banner">
                Login failed: {error.replace(/_/g, " ")}
              </div>
            )}

            {!configured && (
              <div className="warn-banner">
                API keys not configured. Add KITE_API_KEY & KITE_API_SECRET in
                backend/.env
              </div>
            )}

            <h2>Sign in with Zerodha</h2>
            <p className="login-desc">
              Secure OAuth login via Kite Connect. Your API secret stays on the
              server — never exposed to the browser.
            </p>

            <button
              className="btn-primary"
              onClick={handleLogin}
              disabled={loading || !configured}
            >
              {loading ? "Redirecting..." : "Login with Kite"}
              <ArrowRight size={18} />
            </button>

            <button className="btn-secondary" onClick={handleDemo}>
              <TrendingUp size={18} />
              Preview Demo Dashboard
            </button>

            <div className="login-trust">
              <Shield size={14} />
              <span>256-bit checksum · Session-based auth · Auto logout</span>
            </div>
          </div>
        </div>

        <div className="features-section">
          <h3>Kite Connect API — क्या-क्या Pull हो सकता है</h3>
          <div className="features-grid">
            {API_FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="feature-card">
                <div className="feature-icon">
                  <Icon size={20} />
                </div>
                <div>
                  <h4>{title}</h4>
                  <p>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
