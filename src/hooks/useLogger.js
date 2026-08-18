// src/hooks/useLogger.js
import { useCallback } from "react";
import { logAction, ACTION_TYPES, MODULES } from "../services/logger";
import { useAppStore } from "../lib/zustand";

export const useLogger = () => {
  const { userData } = useAppStore();

  const log = useCallback(async ({
    action,
    module,
    description,
    targetId = null,
    targetType = null,
    metadata = {},
    status = "SUCCESS",
  }) => {
    return await logAction({
      action,
      module,
      description,
      userId: userData?.uid || null,
      userEmail: userData?.email || null,
      userRole: userData?.role || null,
      targetId,
      targetType,
      metadata,
      status,
    });
  }, [userData]);

  const logCreate = useCallback((module, description, targetId = null, metadata = {}) => {
    return log({
      action: ACTION_TYPES.CREATE,
      module,
      description,
      targetId,
      targetType: module.toLowerCase(),
      metadata,
    });
  }, [log]);

  const logUpdate = useCallback((module, description, targetId = null, metadata = {}) => {
    return log({
      action: ACTION_TYPES.UPDATE,
      module,
      description,
      targetId,
      targetType: module.toLowerCase(),
      metadata,
    });
  }, [log]);

  const logDelete = useCallback((module, description, targetId = null, metadata = {}) => {
    return log({
      action: ACTION_TYPES.DELETE,
      module,
      description,
      targetId,
      targetType: module.toLowerCase(),
      metadata,
    });
  }, [log]);

  const logLogin = useCallback((description, metadata = {}) => {
    return log({
      action: ACTION_TYPES.LOGIN,
      module: MODULES.AUTH,
      description,
      metadata,
    });
  }, [log]);

  const logLogout = useCallback((description, metadata = {}) => {
    return log({
      action: ACTION_TYPES.LOGOUT,
      module: MODULES.AUTH,
      description,
      metadata,
    });
  }, [log]);

  const logError = useCallback((module, description, targetId = null, metadata = {}) => {
    return log({
      action: ACTION_TYPES.ERROR,
      module,
      description,
      targetId,
      targetType: module.toLowerCase(),
      metadata,
      status: "ERROR",
    });
  }, [log]);

  const logView = useCallback((module, description, targetId = null, metadata = {}) => {
    return log({
      action: ACTION_TYPES.VIEW,
      module,
      description,
      targetId,
      targetType: module.toLowerCase(),
      metadata,
    });
  }, [log]);

  return {
    log,
    logCreate,
    logUpdate,
    logDelete,
    logLogin,
    logLogout,
    logError,
    logView,
  };
};