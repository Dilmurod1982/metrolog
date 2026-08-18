// src/hooks/useLogin.js
import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase/config";
import { useAppStore } from "../lib/zustand";
import { logAction, ACTION_TYPES, MODULES } from "../services/logger";

export const useLogin = () => {
  const [isPending, setIsPending] = useState(false);
  const setUser = useAppStore((state) => state.setUser);
  const setUserData = useAppStore((state) => state.setUserData);
  const loadUserData = useAppStore((state) => state.loadUserData);

  const signIn = async (email, password) => {
    setIsPending(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = result.user;
      
      const userData = await loadUserData(firebaseUser);
      
      if (!userData) {
        // Логируем ошибку
        await logAction({
          action: ACTION_TYPES.LOGIN,
          module: MODULES.AUTH,
          description: `Неудачная попытка входа: пользователь ${email} не найден в Firestore`,
          userEmail: email,
          status: "ERROR",
        });
        
        await auth.signOut();
        setIsPending(false);
        return {
          success: false,
          error: "Пользователь не найден в базе данных"
        };
      }
      
      setUser(firebaseUser);
      setUserData(userData);
      
      // Логируем успешный вход
      await logAction({
        action: ACTION_TYPES.LOGIN,
        module: MODULES.AUTH,
        description: `Пользователь ${userData.firstName} ${userData.lastName} (${email}) вошел в систему`,
        userId: firebaseUser.uid,
        userEmail: email,
        userRole: userData.role,
        metadata: {
          role: userData.role,
        },
      });
      
      setIsPending(false);
      
      return {
        success: true,
        message: "Успешный вход в систему"
      };
    } catch (error) {
      console.error("Login error:", error);
      
      // Логируем ошибку входа
      await logAction({
        action: ACTION_TYPES.LOGIN,
        module: MODULES.AUTH,
        description: `Ошибка входа: ${error.message}`,
        userEmail: email,
        status: "ERROR",
        metadata: {
          errorCode: error.code,
        },
      });
      
      let errorMessage = "Ошибка входа";
      
      switch (error.code) {
        case "auth/invalid-email":
          errorMessage = "Неверный формат email";
          break;
        case "auth/user-not-found":
          errorMessage = "Пользователь не найден";
          break;
        case "auth/wrong-password":
          errorMessage = "Неверный пароль";
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