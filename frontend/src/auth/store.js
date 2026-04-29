import { create } from 'zustand'


export const useAuthStore = create((set, get) => ({
  token: localStorage.getItem('token'),
  user: null,
  setToken: (token) => {
    localStorage.setItem('token', token)
    set({ token })
  },
  clear: () => {
  console.trace("🚨 LOGOUT TRIGGERED FROM:");
  localStorage.removeItem("token");
  set({ token: null, user: null });
},
  setUser: (user) => set({ user }),
}))
