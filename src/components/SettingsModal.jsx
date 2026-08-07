import { useState } from "react";
import { BASE_URL } from "../api";

function Toggle({ on, onClick }) {
  return <button className={`toggle ${on ? "on" : ""}`} onClick={onClick} />;
}

export default function SettingsModal({ me, onClose, onLogout }) {
  const [soundOn, setSoundOn] = useState(() => localStorage.getItem("linkupply_sound") !== "off");
  const [autoDownload, setAutoDownload] = useState(() => localStorage.getItem("linkupply_autodownload") === "on");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

  function toggleSound() {
    const next = !soundOn; setSoundOn(next);
    localStorage.setItem("linkupply_sound", next ? "on" : "off");
  }
  function toggleAutoDownload() {
    const next = !autoDownload; setAutoDownload(next);
    localStorage.setItem("linkupply_autodownload", next ? "on" : "off");
  }

  async function handleDeleteAccount() {
    if (!deletePassword.trim()) { setDeleteError("Enter your password."); return; }
    setDeleting(true); setDeleteError("");
    try {
      const res = await fetch(`${BASE_URL}/api/auth/account`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("linkupply_token")}`,
        },
        body: JSON.stringify({ password: deletePassword }),
      });
      const data = await res.json();
      if (!res.ok) { setDeleteError(data.error || "Failed"); setDeleting(false); return; }
      // Account deleted — clear everything and log out
      localStorage.removeItem("linkupply_token");
      localStorage.removeItem("linkupply_user");
      onLogout();
    } catch {
      setDeleteError("Something went wrong."); setDeleting(false);
    }
  }

  if (showDeleteConfirm) {
    return (
      <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
        <div className="modal-card confirm-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-head">
            <h2 style={{ color: "var(--danger)" }}>Delete Account</h2>
            <button className="modal-close" onClick={() => setShowDeleteConfirm(false)}>✕</button>
          </div>
          <p>This will permanently delete your account, all your messages, and remove you from everyone's contact list. This cannot be undone.</p>
          <p>Enter your password to confirm:</p>
          {deleteError && <div className="error-banner">{deleteError}</div>}
          <div className="field">
            <label>Password</label>
            <input type="password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} placeholder="Enter your password" autoFocus />
          </div>
          <button className="settings-danger-btn" onClick={handleDeleteAccount} disabled={deleting}>
            {deleting ? "Deleting…" : "Yes, delete my account"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Settings</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="settings-profile">
          <div className="node-avatar">{me.profileImage && <img src={me.profileImage} alt="" />}</div>
          <div>
            <div className="p-name">{me.name}</div>
            <div className="p-email">{me.email}</div>
            <div className="p-id">ID: {me.linkId}</div>
          </div>
        </div>

        <div className="settings-section">
          <h3>Notifications</h3>
          <div className="settings-row">
            <div>
              <div className="label">Message sound</div>
              <div className="sub">Play a sound for new messages & requests</div>
            </div>
            <Toggle on={soundOn} onClick={toggleSound} />
          </div>
        </div>

        <div className="settings-section">
          <h3>Media</h3>
          <div className="settings-row">
            <div>
              <div className="label">Auto-download media</div>
              <div className="sub">Skip the manual download tap</div>
            </div>
            <Toggle on={autoDownload} onClick={toggleAutoDownload} />
          </div>
        </div>

        <div className="settings-section">
          <h3>Account</h3>
          <div className="settings-row">
            <div>
              <div className="label">Profile</div>
              <div className="sub">Locked after creation</div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
          <button className="btn-primary" style={{ background: "rgba(255,255,255,0.06)", boxShadow: "none", color: "var(--text)" }} onClick={onLogout}>Log out</button>
          <button className="settings-danger-btn" onClick={() => setShowDeleteConfirm(true)}>Delete account</button>
        </div>

        <div className="about-line">Linkupply · v1.0</div>
      </div>
    </div>
  );
}
