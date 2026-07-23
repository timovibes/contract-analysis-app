import axios from "axios";
import { auth } from "./firebase";

const api = axios.create({ baseURL: "http://localhost:8000/api" });

api.interceptors.request.use(async (config) => {
  await auth.authStateReady();
  const token = await auth.currentUser?.getIdToken(true); // force refresh, avoids stale token 403s
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;