import { useEffect, useRef, useState } from "react";
import api from "../api";
import { getSocket } from "../socket";
import ChatWindow from "../components/ChatWindow";
import SettingsModal from "../components/SettingsModal";
import { playNotifySound } from "../sound";

// Incoming request sound — slightly different pitch from message sound
function playRequestSound() {
  if (localStorage.getItem("linkupply_sound") === "off") return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [440, 660].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine"; osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.001, ctx.currentTime + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + i * 0.08 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.22);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.08);
      osc.stop(ctx.currentTime + i * 0.08 + 0.23);
    });
    setTimeout(() => ctx.close(), 700);
  } catch {}
}

export default function Home({ me, onLogout }) {
  const [tab, setTab] = useState("chats");
  const [friends, setFriends] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [linkIdInput, setLinkIdInput] = useState("");
  const [addMsg, setAddMsg] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const socket = getSocket();
  const selected = friends.find((f) => f._id === selectedId) || null;
  const incomingRef = useRef(incoming);
  incomingRef.current = incoming;

  async function loadFriends() {
    const res = await api.get("/friends/list");
    setFriends(res.data.friends);
  }
  async function loadIncoming() {
    const res = await api.get("/friends/requests/incoming");
    setIncoming(res.data.requests);
  }

  useEffect(() => {
    loadFriends();
    loadIncoming();

    socket.connect();
    socket.emit("identify", me.id);

    function onPresence({ userId, status }) {
      setFriends((prev) => prev.map((f) => (f._id === userId ? { ...f, status } : f)));
    }
    // Real-time incoming friend request
    function onNewRequest() {
      loadIncoming();
      playRequestSound();
    }
    socket.on("presence:update", onPresence);
    socket.on("friend:new_request", onNewRequest);

    return () => {
      socket.off("presence:update", onPresence);
      socket.off("friend:new_request", onNewRequest);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function sendRequest(e) {
    e.preventDefault();
    setAddMsg("");
    const id = linkIdInput.trim();
    if (!id) return;

    // Prevent duplicate — check if already a friend or pending
    const alreadyFriend = friends.some((f) => f.linkId === id);
    if (alreadyFriend) { setAddMsg("Already friends with this person."); return; }
    const alreadyPending = incomingRef.current.some((r) => r.from?.linkId === id);
    if (alreadyPending) { setAddMsg("Request from this person is already pending."); return; }

    try {
      const res = await api.post("/friends/request", { targetLinkId: id });
      // emit socket so receiver gets it instantly
      socket.emit("friend:request_sent", { toUserId: res.data.request.to });
      setAddMsg("Request sent!");
      setLinkIdInput("");
    } catch (err) {
      setAddMsg(err.response?.data?.error || "Could not send request.");
    }
  }

  async function respond(id, action) {
    await api.post(`/friends/requests/${id}/respond`, { action });
    loadIncoming();
    loadFriends();
  }

  function logout() {
    localStorage.removeItem("linkupply_token");
    localStorage.removeItem("linkupply_user");
    socket.disconnect();
    onLogout();
  }

  return (
    <div className="home-shell">
      <div className="sidebar">
        <div className="sidebar-header">
          <div className="me">
            <div className="avatar">
              <div>{me.profileImage && <img src={me.profileImage} alt="" />}</div>
            </div>
            <div>
              <div className="name">{me.name}</div>
              <div className="linkid">ID: {me.linkId}</div>
            </div>
          </div>
          <div className="header-actions">
            <button className="ghost-icon-btn" onClick={() => setShowSettings(true)} title="Settings">⚙</button>
          </div>
        </div>

        <div className="tabs">
          <button className={`tab ${tab === "chats" ? "active" : ""}`} onClick={() => setTab("chats")}>Chats</button>
          <button className={`tab ${tab === "add" ? "active" : ""}`} onClick={() => setTab("add")}>
            Requests
            {incoming.length > 0 && <span className="badge">{incoming.length}</span>}
          </button>
        </div>

        {tab === "add" && (
          <>
            <form className="add-friend-row" onSubmit={sendRequest}>
              <input
                placeholder="Enter their Link ID"
                value={linkIdInput}
                onChange={(e) => { setLinkIdInput(e.target.value); setAddMsg(""); }}
              />
              <button type="submit">Add</button>
            </form>
            {addMsg && <div style={{ padding: "0 16px 10px", fontSize: 12.5, color: addMsg.includes("sent") ? "var(--online)" : "var(--text-dim)" }}>{addMsg}</div>}
          </>
        )}

        <div className="list">
          {tab === "chats" && (friends.length === 0 ? (
            <div className="empty-state">No connections yet.<br />Go to Requests tab to add someone by their Link ID.</div>
          ) : (
            friends.map((f) => (
              <div key={f._id} className={`node-row ${selectedId === f._id ? "selected" : ""}`} onClick={() => setSelectedId(f._id)}>
                <div className="node-avatar">
                  {f.profileImage && <img src={f.profileImage} alt="" />}
                  <span className={`status-dot ${f.status === "online" ? "online" : ""}`} />
                </div>
                <div className="node-info">
                  <div className="node-name">{f.name}</div>
                  <div className="node-sub">{f.status === "online" ? "online" : "offline"}</div>
                </div>
              </div>
            ))
          ))}

          {tab === "add" && (incoming.length === 0 ? (
            <div className="empty-state">No pending requests.</div>
          ) : (
            incoming.map((r) => (
              <div key={r._id} className="node-row">
                <div className="node-avatar">{r.from.profileImage && <img src={r.from.profileImage} alt="" />}</div>
                <div className="node-info">
                  <div className="node-name">{r.from.name}</div>
                  <div className="node-sub">ID: {r.from.linkId}</div>
                </div>
                <div className="req-actions">
                  <button className="req-accept" onClick={() => respond(r._id, "accept")}>Accept</button>
                  <button className="req-reject" onClick={() => respond(r._id, "reject")}>Reject</button>
                </div>
              </div>
            ))
          ))}
        </div>
      </div>

      {selected ? (
        <ChatWindow
          me={me}
          friend={selected}
          socket={socket}
          onBack={() => setSelectedId(null)}
        />
      ) : (
        <div className="chat-empty">
          <div className="glyph">Select a connection to start chatting</div>
        </div>
      )}

      {showSettings && (
        <SettingsModal me={me} onClose={() => setShowSettings(false)} onLogout={logout} />
      )}
    </div>
  );
}
