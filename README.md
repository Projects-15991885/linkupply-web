# Linkupply — Web (Laptop) Client

React + Vite web app that connects to your Linkupply backend.

## Setup

1. Make sure your **backend** is already running (`npm run dev` in the `linkupply-backend` folder, showing "MongoDB connected").

2. Install dependencies here:
   ```bash
   npm install
   ```

3. If your backend runs somewhere other than `http://localhost:5000`, open `src/api.js` and change `BASE_URL`.

4. Run the web app:
   ```bash
   npm run dev
   ```
   It'll open at `http://localhost:5173`.

## What's included
- Signup (one-time profile: name, email, password, photo) / Login
- Each account gets a short **Link ID** — share it with a friend so they can add you
- Requests tab — send a request by entering someone's Link ID, accept/reject incoming ones
- Chats tab — shows your connections with live online/offline status
- Real-time messaging over Socket.io
- File sending — images preview inline, everything else (pdf, apk, video, etc.) shows as a downloadable chip

## Design notes
Dark "blueprint schematic" theme — ties into the name Linkupply (a link/supply line). The line between you and a contact in the chat header lights up and animates when they're online, showing the live connection.

## Next
Same backend also powers the mobile (React Native) app — that's the next piece.
