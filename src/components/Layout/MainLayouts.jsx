// src/components/Layout/MainLayouts.jsx
import React, { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAppStore } from "../../lib/zustand";
import { MENU_ITEMS } from "../../lib/constants";
import { translations } from "../../lib/i18n";
import {
  HomeIcon,
  MapIcon,
  BuildingOfficeIcon,
  BuildingStorefrontIcon,
  DocumentTextIcon,
  UsersIcon,
  Bars3Icon,
  XMarkIcon,
  LanguageIcon,
} from "@heroicons/react/24/outline";

const iconMap = {
  Home: HomeIcon,
  Map: MapIcon,
  Building: BuildingOfficeIcon,
  Building2: BuildingStorefrontIcon,
  FileText: DocumentTextIcon,
  Users: UsersIcon,
};

const MainLayouts = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { userData, language, setLanguage, logout } = useAppStore();
  const navigate = useNavigate();
  const location = useLocation();
  const t = translations[language];

  console.log("MainLayouts rendered, userData:", userData);

  const menuItems = userData ? MENU_ITEMS[userData.role] || [] : [];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const toggleLanguage = () => {
    setLanguage(language === "uz" ? "ru" : "uz");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500"
                >
                  {sidebarOpen ? (
                    <XMarkIcon className="h-6 w-6" />
                  ) : (
                    <Bars3Icon className="h-6 w-6" />
                  )}
                </button>
                <span className="ml-2 text-xl font-bold text-gray-900">
                  Газ-Метролог
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={toggleLanguage}
                className="p-2 rounded-md text-gray-400 hover:text-gray-500"
              >
                <LanguageIcon className="h-5 w-5" />
                <span className="ml-1 text-sm">
                  {language === "uz" ? "ЎЗ" : "РУ"}
                </span>
              </button>

              <div className="relative">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm">
                      {userData?.firstName?.[0] || "U"}
                    </span>
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-sm font-medium text-gray-700">
                      {userData?.firstName} {userData?.lastName}
                    </p>
                    <p className="text-xs text-gray-500">{userData?.role}</p>
                  </div>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
              >
                {t.logout}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Sidebar */}
      <div className="flex">
        {/* Mobile sidebar */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 flex lg:hidden">
            <div
              className="fixed inset-0 bg-gray-600 bg-opacity-75"
              onClick={() => setSidebarOpen(false)}
            />
            <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
              <SidebarContent
                menuItems={menuItems}
                language={language}
                t={t}
                onNavigate={() => setSidebarOpen(false)}
              />
            </div>
          </div>
        )}

        {/* Desktop sidebar */}
        <div className="hidden lg:flex lg:flex-shrink-0">
          <div className="flex flex-col w-64">
            <SidebarContent menuItems={menuItems} language={language} t={t} />
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0 bg-gray-50">
          <main className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

const SidebarContent = ({ menuItems, language, t, onNavigate }) => {
  const navigate = useNavigate();

  const handleNavigation = (path) => {
    navigate(path);
    if (onNavigate) onNavigate();
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 border-r border-gray-200 bg-white">
      <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
        <nav className="flex-1 px-2 space-y-1">
          {menuItems.map((item) => {
            const Icon = iconMap[item.icon] || HomeIcon;

            return (
              <div key={item.path}>
                <button
                  onClick={() => handleNavigation(item.path)}
                  className="w-full flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.label}
                </button>

                {item.children && (
                  <div className="ml-4 space-y-1">
                    {item.children.map((child) => {
                      const ChildIcon = iconMap[child.icon] || MapIcon;

                      return (
                        <button
                          key={child.path}
                          onClick={() => handleNavigation(child.path)}
                          className="w-full flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                        >
                          <ChildIcon className="mr-3 h-4 w-4" />
                          {child.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

export default MainLayouts;
