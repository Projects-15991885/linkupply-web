import { useState } from "react";
import Auth from "./pages/Auth";
import Home from "./pages/Home";

function getStoredUser() {
  const raw = localStorage.getItem("linkupply_user");
  return raw ? JSON.parse(raw) : null;
}

export default function App() {
  const [user, setUser] = useState(getStoredUser());

  if (!user) {
    return <Auth onAuthed={setUser} />;
  }
  return <Home me={user} onLogout={() => setUser(null)} />;
}
