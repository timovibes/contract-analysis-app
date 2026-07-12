import axios from "axios";
import { auth } from "./firebase";

const api = axios.create({ baseURL: "http://localhost:8000/api" });

api.interceptors.request.use(async (config) => {
  await auth.authStateReady(); // waits for Firebase to finish restoring the session
  const token = await auth.currentUser?.getIdToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;