// src/pages/Plombalar/PlombInstallation.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebase/config";
import { motion } from "framer-motion";
import {
  Shield,
  Plus,
  Search,
  Factory,
  Gauge,
  Calendar,
  MapPin,
} from "lucide-react";
import { useAppStore } from "../../lib/zustand";
import { useLogger } from "../../hooks/useLogger";
import { MODULES } from "../../services/logger";
import AddPlombModal from "../../components/Plombalar/AddPlombModal";

const PlombInstallation = () => {
  const { userData } = useAppStore();
  const { logError } = useLogger();

  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [myPlombs, setMyPlombs] = useState([]);
  const [objects, setObjects] = useState([]);
  const [isAddPlombOpen, setIsAddPlombOpen] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Загружаем пломбы прикреплённые текущему пользователю
      const plombsSnap = await getDocs(
        query(collection(db, "plombs"), where("assignedTo", "==", userData?.id))
      );
      setMyPlombs(
        plombsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      );

      // Загружаем объекты для отображения информации
      const objectsSnap = await getDocs(collection(db, "objects"));
      setObjects(
        objectsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      );
    } catch (error) {
      console.error("Ошибка загрузки:", error);
      await logError(
        MODULES.SETTINGS,
        `Пломбаларни юклашда хатолик: ${error.message}`
      );
    } finally {
      setLoading(false);
    }
  }, [userData?.id, logError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Статистика
  const stats = useMemo(() => {
    const installed = myPlombs.filter((p) => p.installedOn).length;
    const remaining = myPlombs.length - installed;
    return {
      total: myPlombs.length,
      installed,
      remaining,
    };
  }, [myPlombs]);

  const filteredPlombs = myPlombs.filter((p) => {
    if (!searchTerm) return true;
    const lower = searchTerm.toLowerCase();
    return (
      p.series?.toLowerCase().includes(lower) ||
      p.number?.includes(searchTerm) ||
      p.batchNumber?.toLowerCase().includes(lower)
    );
  });

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
            Пломба ўрнатиш
          </h1>
          <p className="text-gray-600">Сизга бириктирилган пломбалар</p>
        </div>

        <motion.button
          onClick={() => setIsAddPlombOpen(true)}
          className="bg-gradient-to-r from-green-500 to-teal-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl flex items-center gap-2"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Plus size={20} />
          Пломба ўрнатиш
        </motion.button>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <Shield size={16} />
            <span className="text-sm">Жами</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-green-600 mb-1">
            <Shield size={16} />
            <span className="text-sm">Ўрнатилган</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{stats.installed}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-yellow-600 mb-1">
            <Shield size={16} />
            <span className="text-sm">Остаток</span>
          </div>
          <p className="text-2xl font-bold text-yellow-600">
            {stats.remaining}
          </p>
        </div>
      </div>

      {/* Поиск */}
      <div className="bg-white rounded-2xl shadow-sm p-4 mb-6">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            size={20}
          />
          <input
            type="text"
            placeholder="Партия, серия, рақам..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500"
          />
        </div>
      </div>

      {/* Таблица */}
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
                <th className="px-4 py-4 text-left font-semibold">Ҳолат</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredPlombs.map((plomb, index) => {
                const isInstalled = !!plomb.installedOn;
                const objectInfo = isInstalled
                  ? objects.find((o) => o.id === plomb.installedOn)
                  : null;

                return (
                  <motion.tr
                    key={plomb.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.03 }}
                    className="hover:bg-green-50"
                  >
                    <td className="px-4 py-4 text-gray-600">{index + 1}</td>
                    <td className="px-4 py-4 text-gray-700">
                      {plomb.batchNumber}
                    </td>
                    <td className="px-4 py-4 text-gray-700 font-mono">
                      {plomb.series}
                    </td>
                    <td className="px-4 py-4 text-gray-700 font-mono font-medium">
                      {plomb.number}
                    </td>
                    <td className="px-4 py-4 text-gray-600 hidden md:table-cell">
                      {plomb.assignedDate || "—"}
                    </td>
                    <td className="px-4 py-4">
                      {isInstalled ? (
                        <div className="text-xs">
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full">
                            <Shield size={12} />
                            Ўрнатилган
                          </span>
                          {objectInfo && (
                            <div className="mt-1 text-gray-600">
                              {objectInfo.objectName}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs">
                          Остатокда
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
                : "Сизга пломбалар бириктирилмаган"}
            </h3>
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
