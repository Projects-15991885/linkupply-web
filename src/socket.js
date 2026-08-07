import { io } from "socket.io-client";
import { BASE_URL } from "./api";

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io(BASE_URL, { autoConnect: false });
  }
  return socket;
}
