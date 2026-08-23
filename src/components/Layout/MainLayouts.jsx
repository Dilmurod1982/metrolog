// src/components/Layout/MainLayouts.jsx
import React, { useState, useCallback, memo } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useAppStore } from "../../lib/zustand";
import { MENU_ITEMS } from "../../lib/constants";
import { translations } from "../../lib/i18n";
import { motion, AnimatePresence } from "framer-motion";
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
  Square3Stack3DIcon,
  AdjustmentsHorizontalIcon,
  SignalIcon,
  FolderIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";

const iconMap = {
  Home: HomeIcon,
  Map: MapIcon,
  Building: BuildingOfficeIcon,
  Building2: BuildingStorefrontIcon,
  FileText: DocumentTextIcon,
  Users: UsersIcon,
  Factory: Square3Stack3DIcon,
  Gauge: AdjustmentsHorizontalIcon,
  Activity: SignalIcon,
  Folder: FolderIcon,
};

const MainLayouts = memo(() => {
  const [sidebarOpen, setSidebarOpen] = useState(false); // Для мобильного
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false); // Для десктопа
  const [expandedMenus, setExpandedMenus] = useState({}); // Отслеживание раскрытых подменю

  const userData = useAppStore((state) => state.userData);
  const language = useAppStore((state) => state.language);
  const setLanguage = useAppStore((state) => state.setLanguage);
  const logout = useAppStore((state) => state.logout);

  const navigate = useNavigate();
  const t = translations[language];

  const menuItems = userData ? MENU_ITEMS[userData.role] || [] : [];

  const handleLogout = useCallback(async () => {
    await logout();
    navigate("/login");
  }, [logout, navigate]);

  const toggleLanguage = useCallback(() => {
    setLanguage(language === "uz" ? "ru" : "uz");
  }, [language, setLanguage]);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const toggleSubmenu = (path) => {
    setExpandedMenus((prev) => ({
      ...prev,
      [path]: !prev[path],
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-full mx-auto px-4 sm:px-6">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              {/* Кнопка сворачивания sidebar для десктопа */}
              <button
                onClick={toggleSidebar}
                className="hidden lg:flex p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
                title={sidebarCollapsed ? "Менюни очиш" : "Менюни ёпиш"}
              >
                {sidebarCollapsed ? (
                  <ChevronRightIcon className="h-5 w-5" />
                ) : (
                  <ChevronLeftIcon className="h-5 w-5" />
                )}
              </button>

              {/* Кнопка для мобильного */}
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

              <span className="ml-2 text-xl font-bold text-gray-900 whitespace-nowrap">
                Газ-Метролог
              </span>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={toggleLanguage}
                className="p-2 rounded-md text-gray-400 hover:text-gray-500 flex items-center gap-1"
              >
                <LanguageIcon className="h-5 w-5" />
                <span className="text-sm font-medium">
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
                    <p className="text-sm font-medium text-gray-700 whitespace-nowrap">
                      {userData?.firstName} {userData?.lastName}
                    </p>
                    <p className="text-xs text-gray-500">{userData?.role}</p>
                  </div>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md whitespace-nowrap"
              >
                {t.logout}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex">
        {/* Mobile sidebar */}
        <AnimatePresence>
          {sidebarOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
                onClick={() => setSidebarOpen(false)}
              />
              <motion.div
                initial={{ x: -280 }}
                animate={{ x: 0 }}
                exit={{ x: -280 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="fixed inset-y-0 left-0 z-50 w-64 bg-white lg:hidden"
              >
                <SidebarContent
                  menuItems={menuItems}
                  collapsed={false}
                  expandedMenus={expandedMenus}
                  toggleSubmenu={toggleSubmenu}
                  onNavigate={() => setSidebarOpen(false)}
                />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Desktop sidebar с анимацией */}
        <motion.div
          animate={{ width: sidebarCollapsed ? 64 : 256 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="hidden lg:block flex-shrink-0"
        >
          <SidebarContent
            menuItems={menuItems}
            collapsed={sidebarCollapsed}
            expandedMenus={expandedMenus}
            toggleSubmenu={toggleSubmenu}
          />
        </motion.div>

        {/* Main content */}
        <div className="flex-1 min-w-0 bg-gray-50">
          <main className="py-6">
            <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
});

const SidebarContent = memo(
  ({ menuItems, collapsed, expandedMenus, toggleSubmenu, onNavigate }) => {
    const navigate = useNavigate();

    const handleNavigation = (path) => {
      navigate(path);
      if (onNavigate) onNavigate();
    };

    return (
      <div className="flex flex-col h-full border-r border-gray-200 bg-white">
        <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto overflow-x-hidden">
          <nav className="flex-1 px-2 space-y-1">
            {menuItems.map((item) => {
              const Icon = iconMap[item.icon] || HomeIcon;
              const hasChildren = item.children && item.children.length > 0;
              const isExpanded = expandedMenus[item.path];

              return (
                <div key={item.path}>
                  {/* Главный пункт меню */}
                  <button
                    onClick={() => {
                      if (hasChildren && !collapsed) {
                        toggleSubmenu(item.path);
                      } else {
                        handleNavigation(item.path);
                      }
                    }}
                    className={`w-full flex items-center px-2 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                      collapsed ? "justify-center" : ""
                    } text-gray-600 hover:bg-gray-50 hover:text-gray-900`}
                    title={collapsed ? item.label : ""}
                  >
                    <Icon className={`h-5 w-5 ${collapsed ? "" : "mr-3"}`} />
                    {!collapsed && (
                      <>
                        <span className="flex-1 text-left">{item.label}</span>
                        {hasChildren && (
                          <ChevronDownIcon
                            className={`h-4 w-4 transition-transform duration-200 ${
                              isExpanded ? "rotate-180" : ""
                            }`}
                          />
                        )}
                      </>
                    )}
                  </button>

                  {/* Подменю */}
                  {hasChildren && !collapsed && (
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                          className="ml-4 space-y-1 overflow-hidden"
                        >
                          {item.children.map((child) => {
                            const ChildIcon = iconMap[child.icon] || MapIcon;
                            return (
                              <button
                                key={child.path}
                                onClick={() => handleNavigation(child.path)}
                                className="w-full flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                              >
                                <ChildIcon className="mr-3 h-4 w-4" />
                                {child.label}
                              </button>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  )}

                  {/* Подменю для collapsed режима - показываем при наведении */}
                  {hasChildren && collapsed && (
                    <div className="relative group">
                      <div className="absolute left-full top-0 ml-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 hidden group-hover:block z-50">
                        {item.children.map((child) => {
                          const ChildIcon = iconMap[child.icon] || MapIcon;
                          return (
                            <button
                              key={child.path}
                              onClick={() => handleNavigation(child.path)}
                              className="w-full flex items-center px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                            >
                              <ChildIcon className="mr-3 h-4 w-4" />
                              {child.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Индикатор сворачивания */}
        {!collapsed && (
          <div className="border-t border-gray-200 p-3">
            <p className="text-xs text-gray-400 text-center">
              Газ-Метролог v1.0
            </p>
          </div>
        )}
      </div>
    );
  }
);

export default MainLayouts;
