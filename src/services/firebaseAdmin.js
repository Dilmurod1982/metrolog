// src/services/firebaseAdmin.js
import { collection, addDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase/config";

// Функция для создания пользователя через REST API
export const createUserViaAPI = async (userData) => {
  try {
    // Получаем ID Token текущего пользователя
    const idToken = await auth.currentUser?.getIdToken();
    
    if (!idToken) {
      throw new Error("Нет авторизации");
    }

    // Вызываем Cloud Function через REST API
    const response = await fetch(
      `https://us-central1-${import.meta.env.VITE_FIREBASE_PROJECT_ID}.cloudfunctions.net/createUser`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`,
        },
        body: JSON.stringify(userData),
      }
    );

    if (!response.ok) {
      throw new Error("Ошибка создания пользователя");
    }

    return await response.json();
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
};