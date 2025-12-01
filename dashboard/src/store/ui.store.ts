import { create } from "zustand"

interface Notification {
  id: string
  title: string
  message: string
  type: "success" | "error" | "warning" | "info"
  timestamp: Date
  read: boolean
}

interface NotificationState {
  notifications: Notification[]
  unreadCount: number
  
  // Actions
  addNotification: (notification: Omit<Notification, "id" | "timestamp" | "read">) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  removeNotification: (id: string) => void
  clearAll: () => void
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,

  addNotification: (notification) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date(),
      read: false,
    }
    
    set((state) => ({
      notifications: [newNotification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    }))
  },

  markAsRead: (id) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }))
  },

  markAllAsRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }))
  },

  removeNotification: (id) => {
    set((state) => {
      const notification = state.notifications.find((n) => n.id === id)
      const wasUnread = notification && !notification.read
      
      return {
        notifications: state.notifications.filter((n) => n.id !== id),
        unreadCount: wasUnread ? state.unreadCount - 1 : state.unreadCount,
      }
    })
  },

  clearAll: () => {
    set({ notifications: [], unreadCount: 0 })
  },
}))

// UI State Store
interface UIState {
  sidebarOpen: boolean
  theme: "light" | "dark"
  
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setTheme: (theme: "light" | "dark") => void
  toggleTheme: () => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  theme: "light",

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setTheme: (theme) => set({ theme }),
  toggleTheme: () =>
    set((state) => ({ theme: state.theme === "light" ? "dark" : "light" })),
}))
