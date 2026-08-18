// src/App.jsx
import React, { useEffect } from "react";
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase/config";
import { useAppStore } from "./lib/zustand";
import MainLayouts from "./components/Layout/MainLayouts";
import ProtectedRoutes from "./components/Layout/ProtectedRoutes";
import Login from "./pages/Login";
import ErrorPage from "./pages/ErrorPage";
import HomeSuperAdmin from "./pages/Home/HomeSuperAdmin";
import HomeAdmin from "./pages/Home/HomeAdmin";
import HomeTumMetrolog from "./pages/Home/HomeTumMetrolog";
import HomeMetrolog from "./pages/Home/HomeMetrolog";
import HomeMexmon from "./pages/Home/HomeMexmon";
import Regions from "./pages/Regions/Regions";
import Cities from "./pages/Regions/Cities";
import Ltds from "./pages/Ltds/Ltds";
import Objects from "./pages/Objects/Objects";
import Reports from "./pages/Reports/Reports";
import UsersPage from "./pages/Users/UsersPage";
import { Toaster } from "react-hot-toast";
import LogsPage from "./pages/Logs/LogsPage";

function App() {
  const setUser = useAppStore((state) => state.setUser);
  const user = useAppStore((state) => state.user);
  const userData = useAppStore((state) => state.userData);
  const loadUserData = useAppStore((state) => state.loadUserData);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);

        const storedUserData = JSON.parse(localStorage.getItem("userData"));
        if (!storedUserData || storedUserData.email !== firebaseUser.email) {
          await loadUserData(firebaseUser);
        }
      } else {
        setUser(null);
        localStorage.removeItem("userData");
      }
    });

    return () => unsubscribe();
  }, [setUser, loadUserData]);

  const hasAccess = (role, allowedRoles) => allowedRoles.includes(role);

  const ProtectedLayout = ({ allowedRoles, element }) => {
    if (!user) return <Navigate to="/login" replace />;
    const currentUserData = useAppStore((state) => state.userData);
    const role = currentUserData?.role || "guest";

    if (!hasAccess(role, allowedRoles)) {
      // Перенаправляем на домашнюю страницу в зависимости от роли
      switch (role) {
        case "superadmin":
          return <Navigate to="/home-superadmin" replace />;
        case "admin":
          return <Navigate to="/home-admin" replace />;
        case "tummetrolog":
          return <Navigate to="/home-tummetrolog" replace />;
        case "metrolog":
          return <Navigate to="/home-metrolog" replace />;
        case "mexmon":
          return <Navigate to="/home-mexmon" replace />;
        default:
          return <Navigate to="/login" replace />;
      }
    }
    return element;
  };

  const routes = createBrowserRouter([
    {
      path: "/",
      errorElement: <ErrorPage />,
      element: (
        <ProtectedRoutes user={user}>
          <MainLayouts />
        </ProtectedRoutes>
      ),
      children: [
        {
          index: true,
          element: (
            <ProtectedLayout
              allowedRoles={["superadmin"]}
              element={<HomeSuperAdmin />}
            />
          ),
        },
        {
          path: "/home-superadmin",
          element: (
            <ProtectedLayout
              allowedRoles={["superadmin"]}
              element={<HomeSuperAdmin />}
            />
          ),
        },
        {
          path: "/home-admin",
          element: (
            <ProtectedLayout allowedRoles={["admin"]} element={<HomeAdmin />} />
          ),
        },
        {
          path: "/home-tummetrolog",
          element: (
            <ProtectedLayout
              allowedRoles={["tummetrolog"]}
              element={<HomeTumMetrolog />}
            />
          ),
        },
        {
          path: "/logs",
          element: (
            <ProtectedLayout
              allowedRoles={["superadmin"]}
              element={<LogsPage />}
            />
          ),
        },
        {
          path: "/home-metrolog",
          element: (
            <ProtectedLayout
              allowedRoles={["metrolog"]}
              element={<HomeMetrolog />}
            />
          ),
        },
        {
          path: "/home-mexmon",
          element: (
            <ProtectedLayout
              allowedRoles={["mexmon"]}
              element={<HomeMexmon />}
            />
          ),
        },
        {
          path: "/regions",
          element: (
            <ProtectedLayout
              allowedRoles={["superadmin"]}
              element={<Regions />}
            />
          ),
        },
        {
          path: "/cities",
          element: (
            <ProtectedLayout
              allowedRoles={["superadmin"]}
              element={<Cities />}
            />
          ),
        },
        {
          path: "/ltds",
          element: (
            <ProtectedLayout
              allowedRoles={["superadmin", "admin", "metrolog"]}
              element={<Ltds />}
            />
          ),
        },
        {
          path: "/objects",
          element: (
            <ProtectedLayout
              allowedRoles={["superadmin", "admin", "tummetrolog", "metrolog"]}
              element={<Objects />}
            />
          ),
        },
        {
          path: "/reports",
          element: (
            <ProtectedLayout
              allowedRoles={[
                "superadmin",
                "admin",
                "tummetrolog",
                "metrolog",
                "mexmon",
              ]}
              element={<Reports />}
            />
          ),
        },
        {
          path: "/users",
          element: (
            <ProtectedLayout
              allowedRoles={["superadmin", "admin"]}
              element={<UsersPage />}
            />
          ),
        },
      ],
    },
    {
      path: "/login",
      errorElement: <ErrorPage />,
      element: user ? (
        userData?.role === "superadmin" ? (
          <Navigate to="/home-superadmin" replace />
        ) : userData?.role === "admin" ? (
          <Navigate to="/home-admin" replace />
        ) : userData?.role === "tummetrolog" ? (
          <Navigate to="/home-tummetrolog" replace />
        ) : userData?.role === "metrolog" ? (
          <Navigate to="/home-metrolog" replace />
        ) : userData?.role === "mexmon" ? (
          <Navigate to="/home-mexmon" replace />
        ) : (
          <Navigate to="/" replace />
        )
      ) : (
        <Login />
      ),
    },
  ]);

  return (
    <>
      <Toaster position="top-right" reverseOrder={false} />
      <RouterProvider router={routes} />
    </>
  );
}

export default App;
