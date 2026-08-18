// src/lib/zustand.js
import { create } from "zustand";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";
import { logAction, ACTION_TYPES, MODULES } from "../services/logger";

export const useAppStore = create((set, get) => ({
  user: JSON.parse(localStorage.getItem("user")) || null,
  userData: JSON.parse(localStorage.getItem("userData")) || null,
  language: localStorage.getItem("language") || "uz",
  
  setUser: (user) => {
    set(() => {
      if (user) {
        localStorage.setItem("user", JSON.stringify(user));
      } else {
        localStorage.removeItem("user");
        localStorage.removeItem("userData");
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
  
  logout: async () => {
    const state = get();
    
    // Логируем выход из системы
    if (state.userData) {
      await logAction({
        action: ACTION_TYPES.LOGOUT,
        module: MODULES.AUTH,
        description: `Пользователь ${state.userData.firstName} ${state.userData.lastName} (${state.userData.email}) вышел из системы`,
        userId: state.userData.uid,
        userEmail: state.userData.email,
        userRole: state.userData.role,
      });
    }
    
    localStorage.removeItem("user");
    localStorage.removeItem("userData");
    set({ user: null, userData: null });
  }
}));