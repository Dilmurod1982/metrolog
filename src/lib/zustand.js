// src/lib/zustand.js
import { create } from "zustand";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase/config";
import { logAction, ACTION_TYPES, MODULES } from "../services/logger";
import { toast } from "react-hot-toast";

export const useAppStore = create((set, get) => ({
  user: JSON.parse(localStorage.getItem("user")) || null,
  userData: JSON.parse(localStorage.getItem("userData")) || null,
  language: localStorage.getItem("language") || "uz",
  loginTime: null,
  logoutTimer: null,
  lastActivity: Date.now(),
  
  setUser: (user) => {
    set(() => {
      if (user) {
        localStorage.setItem("user", JSON.stringify(user));
      } else {
        localStorage.removeItem("user");
        localStorage.removeItem("userData");
        localStorage.removeItem("sessionStartTime");
        localStorage.removeItem("lastActivityTime");
      }
      return { user };
    });
  },
  
  setUserData: (userData) => {
    set(() => {
      if (userData) {
        localStorage.setItem("userData", JSON.stringify(userData));
      } else {
        localStorage.removeItem("userData");
      }
      return { userData };
    });
  },
  
  setLanguage: (language) => {
    localStorage.setItem("language", language);
    set({ language });
  },
  
  loadUserData: async (user) => {
    if (!user || !user.email) return null;
    
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", user.email));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        console.error("Пользователь не найден в Firestore");
        return null;
      }
      
      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();
      
      get().setUserData(userData);
      return userData;
    } catch (error) {
      console.error("Ошибка загрузки данных пользователя:", error);
      return null;
    }
  },
  
  setLoginTime: (loginTime) => set({ loginTime }),
  setLastActivity: (time) => set({ lastActivity: time }),
  
  clearLogoutTimer: () => {
    const state = get();
    if (state.logoutTimer) {
      clearTimeout(state.logoutTimer);
      set({ logoutTimer: null });
    }
  },
  
  updateActivity: () => {
    const now = Date.now();
    set({ lastActivity: now });
    localStorage.setItem("lastActivityTime", now.toString());
    const state = get();
    state.setupAutoLogout();
  },
  
  setupAutoLogout: () => {
    const state = get();
    state.clearLogoutTimer();
    const SESSION_TIMEOUT = 4 * 60 * 1000; // 4 минуты
    const timer = setTimeout(() => {
      state.performLogout("Актив бўлмаганингиз учун сеанс тугатилди!");
    }, SESSION_TIMEOUT);
    set({ logoutTimer: timer });
  },
  
  performLogout: async (message = null) => {
    try {
      await signOut(auth);
      if (message) toast(message, { icon: "ℹ️" });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      const state = get();
      state.clearLogoutTimer();
      
      // Логируем выход из системы
      if (state.userData) {
        await logAction({
          action: ACTION_TYPES.LOGOUT,
          module: MODULES.AUTH,
          description: `Пользователь ${state.userData.firstName} ${state.userData.lastName} (${state.userData.email}) вышел из системы${message ? ` - ${message}` : ""}`,
          userId: state.userData.uid,
          userEmail: state.userData.email,
          userRole: state.userData.role,
        });
      }
      
      set({
        user: null,
        userData: null,
        loginTime: null,
        lastActivity: null,
      });
      
      localStorage.removeItem("user");
      localStorage.removeItem("userData");
      localStorage.removeItem("sessionStartTime");
      localStorage.removeItem("lastActivityTime");
    }
  },
  
  logout: () => {
    const state = get();
    state.performLogout();
  },
  
  checkExistingSession: () => {
    const sessionStart = localStorage.getItem("sessionStartTime");
    const lastActivityTime = localStorage.getItem("lastActivityTime");
    
    if (sessionStart && lastActivityTime) {
      const currentTime = Date.now();
      const timeSinceLastActivity = currentTime - parseInt(lastActivityTime);
      const SESSION_TIMEOUT = 4 * 60 * 1000; // 4 минуты
      
      if (timeSinceLastActivity > SESSION_TIMEOUT) {
        const state = get();
        state.performLogout();
        return false;
      } else {
        set({ lastActivity: parseInt(lastActivityTime) });
        const state = get();
        state.setupAutoLogout();
        return true;
      }
    }
    return false;
  },
  
  initializeSession: () => {
    const now = Date.now();
    localStorage.setItem("sessionStartTime", now.toString());
    localStorage.setItem("lastActivityTime", now.toString());
    set({ lastActivity: now, loginTime: now });
    const state = get();
    state.setupAutoLogout();
  },
}));