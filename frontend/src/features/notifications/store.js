import { create } from 'zustand'

export const useNotificationsStore = create((set, get) => ({
  unread: 0,
  incoming: [],
  setUnread: (n) => set({ unread: n }),
  addIncoming: (n) => set(state => ({ incoming: [n, ...state.incoming].slice(0, 20), unread: state.unread + (n.read ? 0 : 1) })),
  clearIncoming: () => set({ incoming: [] }),
}))
