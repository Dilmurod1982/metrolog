// src/hooks/useLogin.js
import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase/config";
import { useAppStore } from "../lib/zustand";

export const useLogin = () => {
  const [isPending, setIsPending] = useState(false);
  const setUser = useAppStore((state) => state.setUser);
  const setUserData = useAppStore((state) => state.setUserData);
  const loadUserData = useAppStore((state) => state.loadUserData);
  const initializeSession = useAppStore((state) => state.initializeSession);

  const signIn = async (email, password) => {
    setIsPending(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = result.user;
      
      const userData = await loadUserData(firebaseUser);
      
      if (!userData) {
        await auth.signOut();
        setIsPending(false);
        return {
          success: false,
          error: "Маълумотлар базасида фойдаланувчи топилмади!"
        };
      }
      
      setUser(firebaseUser);
      setUserData(userData);
      
      // Инициализируем сессию
      initializeSession();
      
      setIsPending(false);
      
      return {
        success: true,
        message: "Тизимга муваффақиятли кирилди"
      };
    } catch (error) {
      console.error("Login error:", error);
      
      let errorMessage = "Киришда хатолик";
      
      switch (error.code) {
        case "auth/invalid-email":
          errorMessage = "Электрон почта ёзиш формати нотўғри";
          break;
        case "auth/user-not-found":
          errorMessage = "Фойдаланувчи топилмади";
          break;
        case "auth/wrong-password":
          errorMessage = "Пароль нотўғри";
          break;
        default:
          errorMessage = error.message;
      }
      
      setIsPending(false);
      
      if (auth.currentUser) {
        await auth.signOut();
      }
      
      return { success: false, error: errorMessage };
    }
  };

  return { isPending, signIn };
};