// src/pages/Plombalar/PlombInstallation.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebase/config";
import { motion } from "framer-motion";
import {
  Shield,
  Plus,
  Search,
  Calendar,
  CheckCircle,
  Clock,
} from "lucide-react";
import { useAppStore } from "../../lib/zustand";
import { useLogger } from "../../hooks/useLogger";
import { MODULES } from "../../services/logger";
import AddPlombModal from "../../components/Plombalar/AddPlombModal";

const PlombInstallation = () => {
  const { userData, language } = useAppStore();
  const { logError } = useLogger();

  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [myPlombs, setMyPlombs] = useState([]);
  const [objects, setObjects] = useState([]);
  const [meters, setMeters] = useState([]);
  const [isAddPlombOpen, setIsAddPlombOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("remaining");

  // ВСЕГДА uid
  const currentUserId = userData?.uid;

  const loadData = useCallback(async () => {
    if (!currentUserId) {
      console.warn("⚠️ Нет uid пользователя");
      setLoading(false);
      return;
    }

    console.log("🔵 Загрузка пломб, uid:", currentUserId);

    setLoading(true);
    try {
      const plombsSnap = await getDocs(
        query(
          collection(db, "plombs"),
          where("assignedTo", "==", currentUserId)
        )
      );
      const plombsData = plombsSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      console.log("✅ Найдено пломб:", plombsData.length);

      setMyPlombs(plombsData);

      const objectsSnap = await getDocs(collection(db, "objects"));
      setObjects(
        objectsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      );

      const metersSnap = await getDocs(collection(db, "meters"));
      setMeters(metersSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error("Ошибка загрузки:", error);
      await logError(
        MODULES.SETTINGS,
        `Пломбаларни юклашда хатолик: ${error.message}`
      );
    } finally {
      setLoading(false);
    }
  }, [currentUserId, logError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const stats = useMemo(() => {
    const installed = myPlombs.filter((p) => p.installedOn).length;
    const remaining = myPlombs.length - installed;
    return {
      total: myPlombs.length,
      installed,
      remaining,
    };
  }, [myPlombs]);

  const filteredPlombs = useMemo(() => {
    let filtered = myPlombs;

    if (activeTab === "remaining") {
      filtered = filtered.filter((p) => !p.installedOn);
    } else {
      filtered = filtered.filter((p) => p.installedOn);
    }

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.series?.toLowerCase().includes(lower) ||
          p.number?.includes(searchTerm) ||
          p.batchNumber?.toLowerCase().includes(lower)
      );
    }

    return filtered;
  }, [myPlombs, searchTerm, activeTab]);

  const getObjectById = (objectId) => {
    return objects.find((o) => o.id === objectId);
  };

  const getMeterById = (meterId) => {
    return meters.find((m) => m.id === meterId);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-50 p-4 lg:p-8">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-800 mb-2">
            {language === "uz" ? "Пломба ўрнатиш" : "Установка пломб"}
          </h1>
          <p className="text-gray-600">
            {language === "uz"
              ? "Сизга бириктирилган пломбалар"
              : "Прикреплённые вам пломбы"}
          </p>
        </div>

        <motion.button
          onClick={() => setIsAddPlombOpen(true)}
          className="bg-gradient-to-r from-green-500 to-teal-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl flex items-center gap-2"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Plus size={20} />
          {language === "uz" ? "Пломба ўрнатиш" : "Установить пломбу"}
        </motion.button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-4 shadow-sm"
        >
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <Shield size={16} />
            <span className="text-sm">
              {language === "uz" ? "Жами" : "Всего"}
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl p-4 shadow-sm"
        >
          <div className="flex items-center gap-2 text-green-600 mb-1">
            <CheckCircle size={16} />
            <span className="text-sm">
              {language === "uz" ? "Ўрнатилган" : "Установлено"}
            </span>
          </div>
          <p className="text-2xl font-bold text-green-600">{stats.installed}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl p-4 shadow-sm"
        >
          <div className="flex items-center gap-2 text-yellow-600 mb-1">
            <Clock size={16} />
            <span className="text-sm">
              {language === "uz" ? "Остаток" : "Остаток"}
            </span>
          </div>
          <p className="text-2xl font-bold text-yellow-600">
            {stats.remaining}
          </p>
        </motion.div>
      </div>

      <div className="flex gap-2 mb-4 bg-white rounded-xl p-1 shadow-sm w-fit">
        <button
          onClick={() => setActiveTab("remaining")}
          className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${
            activeTab === "remaining"
              ? "bg-green-600 text-white shadow-md"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <Clock size={18} />
          {language === "uz" ? "Остатокда" : "Остаток"}{" "}
          <span className="bg-yellow-400 text-gray-800 rounded-full px-2 py-0.5 text-xs font-bold">
            {stats.remaining}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("installed")}
          className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${
            activeTab === "installed"
              ? "bg-green-600 text-white shadow-md"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <CheckCircle size={18} />
          {language === "uz" ? "Ўрнатилган" : "Установлено"}{" "}
          <span className="bg-green-400 text-white rounded-full px-2 py-0.5 text-xs font-bold">
            {stats.installed}
          </span>
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-4 mb-6">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            size={20}
          />
          <input
            type="text"
            placeholder={
              language === "uz"
                ? "Партия, серия, рақам..."
                : "Партия, серия, номер..."
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-green-500 to-teal-600 text-white">
                <th className="px-4 py-4 text-left font-semibold w-16">№</th>
                <th className="px-4 py-4 text-left font-semibold">Партия</th>
                <th className="px-4 py-4 text-left font-semibold">Серия</th>
                <th className="px-4 py-4 text-left font-semibold">Рақам</th>
                <th className="px-4 py-4 text-left font-semibold hidden md:table-cell">
                  Бириктирилган сана
                </th>
                <th className="px-4 py-4 text-left font-semibold">
                  {activeTab === "remaining" ? "Ҳолат" : "Ўрнатилган жой"}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredPlombs.map((plomb, index) => {
                const objectInfo = plomb.installedOn
                  ? getObjectById(plomb.installedOn)
                  : null;
                const meterInfo = plomb.installedMeterId
                  ? getMeterById(plomb.installedMeterId)
                  : null;

                return (
                  <motion.tr
                    key={plomb.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.03 }}
                    className="hover:bg-green-50 transition-colors"
                  >
                    <td className="px-4 py-4 text-gray-600">{index + 1}</td>
                    <td className="px-4 py-4 text-gray-700">
                      {plomb.batchNumber || "—"}
                    </td>
                    <td className="px-4 py-4 text-gray-700 font-mono">
                      {plomb.series}
                    </td>
                    <td className="px-4 py-4 text-gray-700 font-mono font-medium">
                      {plomb.number}
                    </td>
                    <td className="px-4 py-4 text-gray-600 hidden md:table-cell">
                      {plomb.assignedDate ? (
                        <span className="inline-flex items-center gap-1 text-sm">
                          <Calendar size={14} className="text-gray-400" />
                          {plomb.assignedDate}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {activeTab === "remaining" ? (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                          Остатокда
                        </span>
                      ) : objectInfo ? (
                        <div className="text-xs">
                          <div className="font-medium text-gray-800">
                            {objectInfo.objectName}
                          </div>
                          <div className="text-gray-500">
                            Л/с: {objectInfo.billingAccount}
                          </div>
                          {meterInfo && (
                            <div className="text-gray-400 font-mono">
                              Ҳисоблагич №{meterInfo.serialNumber}
                            </div>
                          )}
                          <div className="text-green-600 mt-1">
                            {plomb.installedDate}
                          </div>
                        </div>
                      ) : (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                          Ўрнатилган
                        </span>
                      )}
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredPlombs.length === 0 && (
          <div className="text-center py-12">
            <Shield className="mx-auto text-gray-400 mb-4" size={48} />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">
              {searchTerm
                ? "Пломбалар топилмади"
                : activeTab === "remaining"
                ? "Остатокда пломбалар йўқ"
                : "Ҳали пломба ўрнатилмаган"}
            </h3>
            {!searchTerm && activeTab === "remaining" && (
              <button
                onClick={() => setIsAddPlombOpen(true)}
                className="mt-4 bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition-colors"
              >
                Пломба ўрнатиш
              </button>
            )}
          </div>
        )}
      </div>

      <AddPlombModal
        isOpen={isAddPlombOpen}
        onClose={() => setIsAddPlombOpen(false)}
        onAdded={loadData}
        fromObjects={false}
      />
    </div>
  );
};

export default PlombInstallation;
