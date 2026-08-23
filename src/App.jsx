// src/App.jsx
import React, { useEffect, useRef } from "react";
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
import ObjectTypes from "./pages/Objects/ObjectTypes";
import MeterTypes from "./pages/Objects/MeterTypes";
import Reports from "./pages/Reports/Reports";
import UsersPage from "./pages/Users/UsersPage";
import LogsPage from "./pages/Logs/LogsPage";
import { Toaster } from "react-hot-toast";
import DocumentTypes from "./pages/Documents/DocumentTypes";
import DocumentsByObject from "./pages/Documents/DocumentsByObject";
import DocumentsByType from "./pages/Documents/DocumentsByType";
import ObjectDocuments from "./pages/Documents/ObjectDocuments";
import TypeDocuments from "./pages/Documents/TypeDocuments";

// Выносим ProtectedLayout за пределы компонента App
const ProtectedLayout = ({ allowedRoles, element }) => {
  const user = useAppStore((state) => state.user);
  const userData = useAppStore((state) => state.userData);

  if (!user) return <Navigate to="/login" replace />;

  const role = userData?.role || "guest";

  if (!allowedRoles.includes(role)) {
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

// Выносим LoginRedirect за пределы компонента App
const LoginRedirect = () => {
  const user = useAppStore((state) => state.user);
  const userData = useAppStore((state) => state.userData);

  if (!user) return <Login />;

  switch (userData?.role) {
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
      return <Navigate to="/" replace />;
  }
};

function App() {
  const setUser = useAppStore((state) => state.setUser);
  const loadUserData = useAppStore((state) => state.loadUserData);
  const checkExistingSession = useAppStore(
    (state) => state.checkExistingSession
  );
  const updateActivity = useAppStore((state) => state.updateActivity);
  const initializeSession = useAppStore((state) => state.initializeSession);

  const isInitialized = useRef(false);

  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    // Проверяем существующую сессию только один раз
    checkExistingSession();

    // Подписываемся на изменения auth
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);

        const storedUserData = JSON.parse(localStorage.getItem("userData"));
        if (!storedUserData || storedUserData.email !== firebaseUser.email) {
          await loadUserData(firebaseUser);
        }

        // Инициализируем сессию если её нет
        const sessionStart = localStorage.getItem("sessionStartTime");
        if (!sessionStart) {
          initializeSession();
        } else {
          useAppStore.getState().setupAutoLogout();
        }
      } else {
        setUser(null);
        localStorage.removeItem("sessionStartTime");
        localStorage.removeItem("lastActivityTime");
        localStorage.removeItem("userData");
      }
    });

    // Отслеживание активности с throttle
    const activityEvents = [
      "mousedown",
      "mousemove",
      "keydown",
      "scroll",
      "touchstart",
      "click",
      "keypress",
    ];

    let activityTimeout = null;
    const handleActivity = () => {
      if (activityTimeout) return;
      activityTimeout = setTimeout(() => {
        updateActivity();
        activityTimeout = null;
      }, 2000); // Обновляем не чаще 1 раза в 2 секунды
    };

    activityEvents.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      unsubscribe();
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      if (activityTimeout) clearTimeout(activityTimeout);
    };
  }, []); // Пустой массив - выполняется только один раз

  // Создаем router только один раз
  const routes = useRef(
    createBrowserRouter([
      {
        path: "/",
        errorElement: <ErrorPage />,
        element: (
          <ProtectedRoutes>
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
              <ProtectedLayout
                allowedRoles={["admin"]}
                element={<HomeAdmin />}
              />
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
                allowedRoles={[
                  "superadmin",
                  "admin",
                  "tummetrolog",
                  "metrolog",
                ]}
                element={<Objects />}
              />
            ),
          },
          {
            path: "/object-types",
            element: (
              <ProtectedLayout
                allowedRoles={["superadmin", "admin"]}
                element={<ObjectTypes />}
              />
            ),
          },
          {
            path: "/meter-types",
            element: (
              <ProtectedLayout
                allowedRoles={["superadmin", "admin"]}
                element={<MeterTypes />}
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
            path: "/document-types",
            element: (
              <ProtectedLayout
                allowedRoles={["superadmin", "admin"]}
                element={<DocumentTypes />}
              />
            ),
          },
          {
            path: "/documents-by-object",
            element: (
              <ProtectedLayout
                allowedRoles={[
                  "superadmin",
                  "admin",
                  "tummetrolog",
                  "metrolog",
                ]}
                element={<DocumentsByObject />}
              />
            ),
          },
          {
            path: "/documents-by-type",
            element: (
              <ProtectedLayout
                allowedRoles={[
                  "superadmin",
                  "admin",
                  "tummetrolog",
                  "metrolog",
                  "mexmon",
                ]}
                element={<DocumentsByType />}
              />
            ),
          },
          {
            path: "/object-documents/:id",
            element: (
              <ProtectedLayout
                allowedRoles={[
                  "superadmin",
                  "admin",
                  "tummetrolog",
                  "metrolog",
                ]}
                element={<ObjectDocuments />}
              />
            ),
          },
          {
            path: "/type-documents/:id",
            element: (
              <ProtectedLayout
                allowedRoles={[
                  "superadmin",
                  "admin",
                  "tummetrolog",
                  "metrolog",
                  "mexmon",
                ]}
                element={<TypeDocuments />}
              />
            ),
          },
        ],
      },
      {
        path: "/login",
        errorElement: <ErrorPage />,
        element: <LoginRedirect />,
      },
    ])
  ).current;

  return (
    <>
      <Toaster position="top-right" reverseOrder={false} />
      <RouterProvider router={routes} />
    </>
  );
}

export default App;
