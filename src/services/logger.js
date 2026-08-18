// src/services/logger.js
import { collection, addDoc, getDocs, query, orderBy, where, limit, startAfter } from "firebase/firestore";
import { db, auth } from "../firebase/config";

// Типы действий
export const ACTION_TYPES = {
  CREATE: "CREATE",
  UPDATE: "UPDATE",
  DELETE: "DELETE",
  LOGIN: "LOGIN",
  LOGOUT: "LOGOUT",
  VIEW: "VIEW",
  EXPORT: "EXPORT",
  IMPORT: "IMPORT",
  APPROVE: "APPROVE",
  REJECT: "REJECT",
  UPLOAD: "UPLOAD",
  DOWNLOAD: "DOWNLOAD",
  PRINT: "PRINT",
  ERROR: "ERROR",
  WARNING: "WARNING",
  INFO: "INFO",
};

// Модули системы
export const MODULES = {
  AUTH: "AUTH",
  USERS: "USERS",
  REGIONS: "REGIONS",
  CITIES: "CITIES",
  LTDS: "LTDS",
  OBJECTS: "OBJECTS",
  REPORTS: "REPORTS",
  DOCUMENTS: "DOCUMENTS",
  SETTINGS: "SETTINGS",
};

// Функция для записи лога
export const logAction = async ({
  action,
  module,
  description,
  userId = null,
  userEmail = null,
  userRole = null,
  targetId = null,
  targetType = null,
  metadata = {},
  status = "SUCCESS",
  ip = null,
  userAgent = null,
}) => {
  try {
    const currentUser = auth.currentUser;
    
    const logEntry = {
      action,
      module,
      description,
      userId: userId || currentUser?.uid || null,
      userEmail: userEmail || currentUser?.email || null,
      userRole: userRole || null,
      targetId: targetId || null,
      targetType: targetType || null,
      metadata: metadata || {},
      status,
      ip: ip || null,
      userAgent: userAgent || navigator.userAgent,
      createdAt: new Date(),
    };

    const docRef = await addDoc(collection(db, "logs"), logEntry);
    console.log("Log created:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("Error logging action:", error);
    // Не выбрасываем ошибку, чтобы не прерывать основную операцию
    return null;
  }
};

// Получение логов с пагинацией
export const getLogs = async (pageSize = 50, lastDoc = null, filters = {}) => {
  try {
    const logsRef = collection(db, "logs");
    let q = query(logsRef, orderBy("createdAt", "desc"), limit(pageSize));

    // Применяем фильтры
    if (filters.module) {
      q = query(q, where("module", "==", filters.module));
    }
    if (filters.action) {
      q = query(q, where("action", "==", filters.action));
    }
    if (filters.userId) {
      q = query(q, where("userId", "==", filters.userId));
    }
    if (filters.status) {
      q = query(q, where("status", "==", filters.status));
    }

    if (lastDoc) {
      q = query(q, startAfter(lastDoc));
    }

    const querySnapshot = await getDocs(q);
    const logs = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
    }));

    return {
      logs,
      lastDoc: querySnapshot.docs[querySnapshot.docs.length - 1] || null,
    };
  } catch (error) {
    console.error("Error getting logs:", error);
    return { logs: [], lastDoc: null };
  }
};

// Получение статистики по логам
export const getLogStats = async () => {
  try {
    const logsRef = collection(db, "logs");
    const querySnapshot = await getDocs(logsRef);
    
    const stats = {
      total: querySnapshot.size,
      byModule: {},
      byAction: {},
      byUser: {},
      byStatus: {},
      today: 0,
      week: 0,
      month: 0,
    };

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    querySnapshot.docs.forEach(doc => {
      const data = doc.data();
      const createdAt = data.createdAt?.toDate?.() || data.createdAt;

      // По модулям
      stats.byModule[data.module] = (stats.byModule[data.module] || 0) + 1;
      
      // По действиям
      stats.byAction[data.action] = (stats.byAction[data.action] || 0) + 1;
      
      // По пользователям
      if (data.userEmail) {
        stats.byUser[data.userEmail] = (stats.byUser[data.userEmail] || 0) + 1;
      }
      
      // По статусам
      stats.byStatus[data.status] = (stats.byStatus[data.status] || 0) + 1;

      // По времени
      if (createdAt && createdAt >= todayStart) {
        stats.today++;
      }
      if (createdAt && createdAt >= weekStart) {
        stats.week++;
      }
      if (createdAt && createdAt >= monthStart) {
        stats.month++;
      }
    });

    return stats;
  } catch (error) {
    console.error("Error getting log stats:", error);
    return null;
  }
};