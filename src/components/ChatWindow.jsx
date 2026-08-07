import { useCallback, useEffect, useRef, useState } from "react";
import { BASE_URL } from "../api";
import AttachMenu from "./AttachMenu";
import { playNotifySound } from "../sound";

// ── helpers ──────────────────────────────────────────────────────────────────

function fileExt(name = "") {
  const parts = name.split(".");
  return parts.length > 1 ? parts.pop().toUpperCase() : "FILE";
}

function formatSize(bytes = 0) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDateLabel(ts) {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

function groupByDate(messages) {
  const groups = [];
  let lastLabel = null;
  messages.forEach((m) => {
    const label = formatDateLabel(m.createdAt);
    if (label !== lastLabel) { groups.push({ type: "sep", label, id: `sep-${m._id}` }); lastLabel = label; }
    groups.push({ type: "msg", msg: m });
  });
  return groups;
}

async function forceDownload(url, filename) {
  const res = await fetch(url);
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename || "file";
  document.body.appendChild(a);
  a.click();
  a.remove();
  return objectUrl;
}

// ── MediaBubble ───────────────────────────────────────────────────────────────

function MediaBubble({ msg, mine, onOpenLightbox }) {
  const isImage = msg.type === "image";
  const isVideo = msg.type === "video";
  const isMedia = isImage || isVideo;
  const autoDownload = localStorage.getItem("linkupply_autodownload") === "on";
  const [downloaded, setDownloaded] = useState(mine || autoDownload);
  const [downloading, setDownloading] = useState(false);
  const [objectUrl, setObjectUrl] = useState(null);
  const fullUrl = `${BASE_URL}${msg.fileUrl}`;

  useEffect(() => {
    if ((mine || autoDownload) && !objectUrl) handleDownload(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDownload(silent) {
    if (downloading) return;
    setDownloading(true);
    try {
      const url = await forceDownload(fullUrl, msg.fileName);
      setObjectUrl(url); setDownloaded(true);
    } catch (err) { if (!silent) console.error(err); }
    finally { setDownloading(false); }
  }

  if (isMedia) {
    const src = mine ? fullUrl : objectUrl;
    return (
      <div className="bubble media-wrap">
        <div className="media-box" onClick={() => downloaded && src && onOpenLightbox({ src, type: msg.type })}>
          {downloaded && src ? (
            <>
              {isImage && <img className="att" src={src} alt={msg.fileName} />}
              {isVideo && <video className="att" src={src} muted preload="metadata" />}
              {isVideo && <div className="play-badge"><span>▶</span></div>}
            </>
          ) : (
            <div className="media-locked">
              <div className="kind-icon">{isImage ? "🖼" : "🎬"}</div>
              {downloading ? <div className="downloading">Downloading…</div> : (
                <button className="dl-btn" onClick={() => handleDownload(false)}>⭳ Download</button>
              )}
              <div className="fname">{msg.fileName} · {formatSize(msg.fileSize)}</div>
            </div>
          )}
        </div>
        <div className="meta">{formatTime(msg.createdAt)}</div>
      </div>
    );
  }

  return (
    <div className="bubble">
      <a className="file-chip" href="#" onClick={(e) => { e.preventDefault(); handleDownload(false); }}>
        <span className="ext">{fileExt(msg.fileName)}</span>
        <div className="file-meta">
          <div className="fname">{msg.fileName}</div>
          <div className="fsize">{formatSize(msg.fileSize)}</div>
        </div>
        <span className="dl-icon">{downloading ? "…" : "⭳"}</span>
      </a>
      <div className="meta">{formatTime(msg.createdAt)}</div>
    </div>
  );
}

// ── Bubble ────────────────────────────────────────────────────────────────────

function Bubble({ msg, mine, onOpenLightbox }) {
  const [copied, setCopied] = useState(false);

  function copyText() {
    const text = msg.text || msg.fileName || "";
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  }

  if (msg.fileUrl) {
    return (
      <div className={`msg-row ${mine ? "mine" : ""}`}>
        <button className={`copy-btn ${copied ? "copied" : ""}`} onClick={copyText} title="Copy">⎘</button>
        <MediaBubble msg={msg} mine={mine} onOpenLightbox={onOpenLightbox} />
      </div>
    );
  }
  return (
    <div className={`msg-row ${mine ? "mine" : ""}`}>
      <button className={`copy-btn ${copied ? "copied" : ""}`} onClick={copyText} title="Copy">⎘</button>
      <div className="bubble">
        <div>{msg.text}</div>
        <div className="meta">{formatTime(msg.createdAt)}</div>
      </div>
    </div>
  );
}

// ── ChatWindow ────────────────────────────────────────────────────────────────

export default function ChatWindow({ me, friend, socket, onBack }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [lightbox, setLightbox] = useState(null);
  const [uploadPct, setUploadPct] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [stickyDate, setStickyDate] = useState("");
  const bottomRef = useRef(null);
  const messagesRef = useRef(null);

  const items = groupByDate(messages);

  useEffect(() => {
    let active = true;
    setMessages([]);
    fetch(`${BASE_URL}/api/messages/${me.id}/${friend._id}`)
      .then((r) => r.json())
      .then((data) => { if (active) setMessages(data.messages || []); })
      .catch(() => {});
    return () => { active = false; };
  }, [friend._id, me.id]);

  useEffect(() => {
    function onReceive(msg) {
      const belongs = (msg.sender === friend._id && msg.receiver === me.id)
        || (msg.sender === me.id && msg.receiver === friend._id);
      if (belongs) {
        setMessages((prev) => [...prev, msg]);
        if (msg.sender === friend._id) playNotifySound();
      }
    }
    function onSent(msg) {
      if (msg.sender === me.id && msg.receiver === friend._id)
        setMessages((prev) => [...prev, msg]);
    }
    socket.on("message:receive", onReceive);
    socket.on("message:sent", onSent);
    return () => { socket.off("message:receive", onReceive); socket.off("message:sent", onSent); };
  }, [socket, friend._id, me.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // sticky date — watches which date separator is near the top
  const handleScroll = useCallback(() => {
    const container = messagesRef.current;
    if (!container) return;
    const seps = container.querySelectorAll("[data-date]");
    let current = "";
    seps.forEach((el) => {
      if (el.offsetTop - container.scrollTop < 50) current = el.dataset.date;
    });
    setStickyDate(current);
  }, []);

  function sendText() {
    if (!text.trim()) return;
    socket.emit("message:send", { sender: me.id, receiver: friend._id, type: "text", text: text.trim() });
    setText("");
  }

  async function handleAttach(file) {
    setUploadPct(1);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${BASE_URL}/api/upload`);
        xhr.setRequestHeader("Authorization", `Bearer ${localStorage.getItem("linkupply_token")}`);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setUploadPct(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve(JSON.parse(xhr.responseText)) : reject();
        xhr.onerror = () => reject();
        xhr.send(formData);
      });
      socket.emit("message:send", { sender: me.id, receiver: friend._id, type: res.type, fileUrl: res.fileUrl, fileName: res.fileName, fileSize: res.fileSize });
    } catch (err) { console.error(err); }
    finally { setUploadPct(null); }
  }

  async function clearChat() {
    if (!window.confirm("Clear all messages in this chat? This cannot be undone.")) return;
    setMenuOpen(false);
    await fetch(`${BASE_URL}/api/messages/${me.id}/${friend._id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${localStorage.getItem("linkupply_token")}` },
    });
    setMessages([]);
  }

  function exportChat() {
    setMenuOpen(false);
    window.open(`${BASE_URL}/api/messages/${me.id}/${friend._id}/export`, "_blank");
  }

  const isOnline = friend.status === "online";

  return (
    <div className="chat-area mobile-open">
      {/* Header */}
      <div className="chat-header">
        {onBack && <button className="back-btn" onClick={onBack}>←</button>}
        <div className="node-avatar">
          {friend.profileImage ? <img src={friend.profileImage} alt="" /> : null}
        </div>
        <div>
          <div className="node-name">{friend.name}</div>
        </div>
        <div className="header-status">
          <span className={`pulse-dot ${isOnline ? "on" : ""}`} />
          {isOnline ? "Online" : "Offline"}
        </div>

        {/* 3-dots menu */}
        <div className="chat-menu-wrap">
          <button className="ghost-icon-btn" onClick={() => setMenuOpen((o) => !o)} title="More options">⋯</button>
          {menuOpen && (
            <>
              <div style={{ position: "fixed", inset: 0, zIndex: 15 }} onClick={() => setMenuOpen(false)} />
              <div className="chat-menu">
                <button onClick={exportChat}>📤 Export chat</button>
                <button className="danger" onClick={clearChat}>🗑 Clear chat</button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Messages with sticky date */}
      <div className="messages-wrap">
        {stickyDate && <div className="sticky-date">{stickyDate}</div>}
        <div
          className="messages"
          ref={messagesRef}
          onScroll={handleScroll}
        >
          {items.map((item) =>
            item.type === "sep" ? (
              <div key={item.id} className="date-sep" data-date={item.label}><span>{item.label}</span></div>
            ) : (
              <Bubble key={item.msg._id} msg={item.msg} mine={item.msg.sender === me.id} onOpenLightbox={setLightbox} />
            )
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Composer */}
      <div className="composer">
        {uploadPct !== null && (
          <div className="upload-progress">
            Sending… {uploadPct}%
            <div className="bar"><div style={{ width: `${uploadPct}%` }} /></div>
          </div>
        )}
        <AttachMenu onPick={(file) => handleAttach(file)} />
        <input
          type="text"
          placeholder="Type a message"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendText()}
        />
        <button className="send-btn" onClick={sendText} disabled={!text.trim()}>→</button>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="lightbox-overlay" onClick={() => setLightbox(null)}>
          <button className="lightbox-close">✕</button>
          {lightbox.type === "image"
            ? <img src={lightbox.src} alt="" onClick={(e) => e.stopPropagation()} />
            : <video src={lightbox.src} controls autoPlay onClick={(e) => e.stopPropagation()} />
          }
        </div>
      )}
    </div>
  );
}
