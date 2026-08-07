import { useState } from "react";
import api from "../api";

export default function Auth({ onAuthed }) {
  const [mode, setMode] = useState("signup"); // "signup" | "login"
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [imageBase64, setImageBase64] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [createdLinkId, setCreatedLinkId] = useState("");

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result);
      setImageBase64(reader.result);
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "signup") {
        const res = await api.post("/auth/signup", {
          name,
          email,
          password,
          profileImage: imageBase64,
        });
        setCreatedLinkId(res.data.user.linkId);
        localStorage.setItem("linkupply_token", res.data.token);
        localStorage.setItem("linkupply_user", JSON.stringify(res.data.user));
        setTimeout(() => onAuthed(res.data.user), 1400);
      } else {
        const res = await api.post("/auth/login", { email, password });
        localStorage.setItem("linkupply_token", res.data.token);
        localStorage.setItem("linkupply_user", JSON.stringify(res.data.user));
        onAuthed(res.data.user);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong. Check your backend is running.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="brand">
          <span className="dot" />
          Linkupply
        </div>

        <h1 className="auth-title">{mode === "signup" ? "Create your account" : "Welcome back"}</h1>
        <p className="auth-sub">
          {mode === "signup"
            ? "// one-time setup — profile can't be edited after this"
            : "// sign in to reconnect"}
        </p>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleSubmit}>
          {mode === "signup" && (
            <div className="avatar-pick">
              <div className="preview">
                {imagePreview ? <img src={imagePreview} alt="" /> : "?"}
              </div>
              <label className="btn-file">
                Choose photo
                <input type="file" accept="image/*" onChange={handleFile} hidden />
              </label>
            </div>
          )}

          {mode === "signup" && (
            <div className="field">
              <label>Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
          )}

          <div className="field">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>

          <div className="field">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>

          <button className="btn-primary" disabled={loading}>
            {loading ? "Please wait…" : mode === "signup" ? "Create account" : "Log in"}
          </button>
        </form>

        {createdLinkId && (
          <div className="linkid-banner">
            Account created. Your Link ID: <strong>{createdLinkId}</strong>
            <br />Share this with friends so they can add you.
          </div>
        )}

        <div className="switch-mode">
          {mode === "signup" ? (
            <>Already have an account? <button onClick={() => setMode("login")}>Log in</button></>
          ) : (
            <>New here? <button onClick={() => setMode("signup")}>Create an account</button></>
          )}
        </div>
      </div>
    </div>
  );
}
