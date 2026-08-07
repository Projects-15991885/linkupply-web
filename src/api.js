import axios from "axios";

// Change this if your backend runs somewhere other than localhost:5000
export const BASE_URL = "https://linkupply-backend-production.up.railway.app";

const api = axios.create({ baseURL: `${BASE_URL}/api` });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("linkupply_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
