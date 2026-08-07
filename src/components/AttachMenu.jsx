import { useRef, useState } from "react";

export default function AttachMenu({ onPick }) {
  const [open, setOpen] = useState(false);
  const photoRef = useRef(null);
  const videoRef = useRef(null);
  const fileRef = useRef(null);

  function pick(ref) {
    setOpen(false);
    ref.current?.click();
  }

  function handleChange(kind) {
    return (e) => {
      const file = e.target.files[0];
      if (file) onPick(file, kind);
      e.target.value = "";
    };
  }

  return (
    <div className="attach-wrap">
      <button className="icon-btn" onClick={() => setOpen((o) => !o)} title="Attach">
        +
      </button>

      {open && (
        <>
          <div
            style={{ position: "fixed", inset: 0, zIndex: 5 }}
            onClick={() => setOpen(false)}
          />
          <div className="attach-menu" style={{ zIndex: 6 }}>
            <button onClick={() => pick(photoRef)}>
              <span className="ic photo">🖼</span> Photo
            </button>
            <button onClick={() => pick(videoRef)}>
              <span className="ic video">▶</span> Video
            </button>
            <button onClick={() => pick(fileRef)}>
              <span className="ic file">📄</span> File
            </button>
          </div>
        </>
      )}

      <input type="file" accept="image/*" ref={photoRef} hidden onChange={handleChange("image")} />
      <input type="file" accept="video/*" ref={videoRef} hidden onChange={handleChange("video")} />
      <input type="file" ref={fileRef} hidden onChange={handleChange("file")} />
    </div>
  );
}
