// src/pages/Logs/LogsPage.jsx
import React, { useState, useEffect } from "react";
import { getLogs, getLogStats } from "../../services/logger";
import { useAppStore } from "../../lib/zustand";
import { translations } from "../../lib/i18n";
import { motion } from "framer-motion";
import {
  Search,
  Activity,
  Clock,
  User,
  FileText,
  Filter,
  RefreshCw,
} from "lucide-react";

const LogsPage = () => {
  const { language } = useAppStore();
  const t = translations[language];

  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pageSize] = useState(50);
  const [lastDoc, setLastDoc] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    module: "",
    action: "",
    status: "",
  });

  useEffect(() => {
    fetchLogs();
    fetchStats();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const result = await getLogs(pageSize, null, filters);
      setLogs(result.logs);
      setLastDoc(result.lastDoc);
    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const result = await getLogStats();
      setStats(result);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const loadMore = async () => {
    try {
      const result = await getLogs(pageSize, lastDoc, filters);
      setLogs([...logs, ...result.logs]);
      setLastDoc(result.lastDoc);
    } catch (error) {
      console.error("Error loading more logs:", error);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters({ ...filters, [field]: value });
    fetchLogs();
  };

  const filteredLogs = logs.filter(
    (log) =>
      log.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.module?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getActionColor = (action) => {
    switch (action) {
      case "CREATE":
        return "bg-green-100 text-green-800";
      case "UPDATE":
        return "bg-yellow-100 text-yellow-800";
      case "DELETE":
        return "bg-red-100 text-red-800";
      case "LOGIN":
        return "bg-blue-100 text-blue-800";
      case "LOGOUT":
        return "bg-gray-100 text-gray-800";
      case "ERROR":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status) => {
    return status === "SUCCESS"
      ? "bg-green-100 text-green-800"
      : "bg-red-100 text-red-800";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 lg:p-8">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-800 mb-2">
            {language === "uz" ? "Тизим журнали" : "Журнал системы"}
          </h1>
          <p className="text-gray-600">
            {language === "uz"
              ? "Барча амаллар тарихи"
              : "История всех действий"}
          </p>
        </div>

        <button
          onClick={() => {
            fetchLogs();
            fetchStats();
          }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
        >
          <RefreshCw size={16} />
          {language === "uz" ? "Янгилаш" : "Обновить"}
        </button>
      </div>

      {/* Статистика */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-2 text-gray-500 mb-2">
              <Activity size={16} />
              <span>{language === "uz" ? "Жами" : "Всего"}</span>
            </div>
            <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-2 text-gray-500 mb-2">
              <Clock size={16} />
              <span>{language === "uz" ? "Бугун" : "Сегодня"}</span>
            </div>
            <p className="text-2xl font-bold text-gray-800">{stats.today}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-2 text-gray-500 mb-2">
              <User size={16} />
              <span>{language === "uz" ? "Ҳафта" : "Неделя"}</span>
            </div>
            <p className="text-2xl font-bold text-gray-800">{stats.week}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-2 text-gray-500 mb-2">
              <FileText size={16} />
              <span>{language === "uz" ? "Ой" : "Месяц"}</span>
            </div>
            <p className="text-2xl font-bold text-gray-800">{stats.month}</p>
          </div>
        </div>
      )}

      {/* Поиск и фильтры */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={20}
            />
            <input
              type="text"
              placeholder={language === "uz" ? "Қидириш..." : "Поиск..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <select
            value={filters.module}
            onChange={(e) => handleFilterChange("module", e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">
              {language === "uz" ? "Барча модуллар" : "Все модули"}
            </option>
            <option value="AUTH">AUTH</option>
            <option value="USERS">USERS</option>
            <option value="REGIONS">REGIONS</option>
            <option value="CITIES">CITIES</option>
            <option value="LTDS">LTDS</option>
            <option value="OBJECTS">OBJECTS</option>
            <option value="REPORTS">REPORTS</option>
          </select>

          <select
            value={filters.action}
            onChange={(e) => handleFilterChange("action", e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">
              {language === "uz" ? "Барча амаллар" : "Все действия"}
            </option>
            <option value="CREATE">CREATE</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
            <option value="LOGIN">LOGIN</option>
            <option value="LOGOUT">LOGOUT</option>
            <option value="ERROR">ERROR</option>
          </select>
        </div>
      </div>

      {/* Таблица логов */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-gray-600 to-gray-700 text-white">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase">
                  {language === "uz" ? "Вақт" : "Время"}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase">
                  {language === "uz" ? "Фойдаланувчи" : "Пользователь"}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase">
                  {language === "uz" ? "Модул" : "Модуль"}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase">
                  {language === "uz" ? "Амал" : "Действие"}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase">
                  {language === "uz" ? "Тавсиф" : "Описание"}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase">
                  {language === "uz" ? "Ҳолат" : "Статус"}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                    {log.createdAt?.toLocaleString?.() || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div>
                      <p className="font-medium text-gray-800">
                        {log.userEmail}
                      </p>
                      <p className="text-xs text-gray-500">{log.userRole}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                      {log.module}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${getActionColor(
                        log.action
                      )}`}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {log.description}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${getStatusColor(
                        log.status
                      )}`}
                    >
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredLogs.length === 0 && (
          <div className="text-center py-12">
            <FileText className="mx-auto text-gray-400 mb-4" size={48} />
            <h3 className="text-lg font-semibold text-gray-600">
              {language === "uz" ? "Журнал бўш" : "Журнал пуст"}
            </h3>
          </div>
        )}
      </div>

      {/* Кнопка "Загрузить еще" */}
      {lastDoc && (
        <div className="text-center mt-6">
          <button
            onClick={loadMore}
            className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {language === "uz" ? "Кўпроқ юклаш" : "Загрузить еще"}
          </button>
        </div>
      )}
    </div>
  );
};

export default LogsPage;
