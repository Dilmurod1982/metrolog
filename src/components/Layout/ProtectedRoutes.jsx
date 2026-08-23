// src/components/Layout/ProtectedRoutes.jsx
import React from "react";
import { Navigate } from "react-router-dom";
import { useAppStore } from "../../lib/zustand";

const ProtectedRoutes = ({ children }) => {
  const user = useAppStore((state) => state.user);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoutes;
