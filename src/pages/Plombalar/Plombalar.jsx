// src/pages/Plombalar/Plombalar.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "../../firebase/config";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  X,
  Search,
  Shield,
  Package,
  Users,
  Calendar,
  Hash,
  Save,
  Warehouse,
  UserCheck,
  Filter,
  ChevronRight,
} from "lucide-react";
import { useAppStore } from "../../lib/zustand";
import { useLogger } from "../../hooks/useLogger";
import { MODULES } from "../../services/logger";
import { toast } from "react-hot-toast";
import PlombDistributionModal from "../../components/Plombalar/PlombDistributionModal";
import PlombBatchDetailModal from "../../components/Plombalar/PlombBatchDetailModal";
import PlombUserDetailModal from "../../components/Plombalar/PlombUserDetailModal";
import AddPlombBatchModal from "../../components/Plombalar/AddPlombBatchModal";

const Plombalar = () => {
  const { language, userData } = useAppStore();
  const { logError } = useLogger();

  const [activeTab, setActiveTab] = useState("warehouse"); // "warehouse" | "distribution"
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState({ from: "", to: "" });
  const [assignedDateFilter, setAssignedDateFilter] = useState({
    from: "",
    to: "",
  });
  const [userFilter, setUserFilter] = useState("Все");

  // Данные
  const [batches, setBatches] = useState([]);
  const [plombs, setPlombs] = useState([]);
  const [users, setUsers] = useState([]);
  const [objects, setObjects] = useState([]);
  const [organizations, setOrganizations] = useState([]);

  // Модальные окна
  const [isAddBatchOpen, setIsAddBatchOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [isBatchDetailOpen, setIsBatchDetailOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isUserDetailOpen, setIsUserDetailOpen] = useState(false);
  const [isDistributionOpen, setIsDistributionOpen] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [batchesSnap, plombsSnap, usersSnap, objectsSnap, orgsSnap] =
        await Promise.all([
          getDocs(collection(db, "plomb_batches")),
          getDocs(collection(db, "plombs")),
          getDocs(collection(db, "users")),
          getDocs(collection(db, "objects")),
          getDocs(collection(db, "organizations")),
        ]);

      setBatches(
        batchesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      );
      setPlombs(plombsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      setUsers(usersSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      setObjects(
        objectsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      );
      setOrganizations(
        orgsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      );
    } catch (error) {
      console.error("Ошибка загрузки:", error);
      await logError(
        MODULES.SETTINGS,
        `Пломбаларни юклашда хатолик: ${error.message}`
      );
      toast.error("Пломбаларни юклашда хатолик");
    } finally {
      setLoading(false);
    }
  }, [logError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Формирование данных для вкладки Омбор
  const warehouseData = useMemo(() => {
    const batchesWithStats = batches.map((batch) => {
      const batchPlombs = plombs.filter((p) => p.batchId === batch.id);
      const availableCount = batchPlombs.filter((p) => !p.assignedTo).length;
      return {
        ...batch,
        totalCount: batchPlombs.length,
        availableCount,
      };
    });

    let filtered = batchesWithStats;

    // Поиск
    if (searchTerm) {
      filtered = filtered.filter(
        (b) =>
          b.batchNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          b.series?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Фильтр по дате поступления
    if (dateFilter.from) {
      filtered = filtered.filter(
        (b) => b.receivedDate && b.receivedDate >= dateFilter.from
      );
    }
    if (dateFilter.to) {
      filtered = filtered.filter(
        (b) => b.receivedDate && b.receivedDate <= dateFilter.to
      );
    }

    // Сортировка по дате (новые сначала)
    filtered.sort((a, b) => {
      const dateA = a.receivedDate || "";
      const dateB = b.receivedDate || "";
      return dateB.localeCompare(dateA);
    });

    return filtered;
  }, [batches, plombs, searchTerm, dateFilter]);

  // Формирование данных для вкладки Таркатма руйхат
  const distributionData = useMemo(() => {
    const usersWithPlombs = users
      .filter(
        (u) =>
          u.role === "metrolog" ||
          u.role === "tummetrolog" ||
          u.role === "admin"
      )
      .map((user) => {
        let userPlombs = plombs.filter((p) => p.assignedTo === user.id);

        // Фильтр по дате прикрепления
        if (assignedDateFilter.from) {
          userPlombs = userPlombs.filter(
            (p) => p.assignedDate && p.assignedDate >= assignedDateFilter.from
          );
        }
        if (assignedDateFilter.to) {
          userPlombs = userPlombs.filter(
            (p) => p.assignedDate && p.assignedDate <= assignedDateFilter.to
          );
        }

        const installedCount = userPlombs.filter((p) => p.installedOn).length;

        // Находим последнюю дату прикрепления
        const lastAssignedDate =
          userPlombs
            .map((p) => p.assignedDate)
            .filter(Boolean)
            .sort((a, b) => b.localeCompare(a))[0] || null;

        return {
          ...user,
          totalPlombs: userPlombs.length,
          installedPlombs: installedCount,
          remainingPlombs: userPlombs.length - installedCount,
          lastAssignedDate,
          plombsList: userPlombs,
        };
      })
      .filter((u) => u.totalPlombs > 0);

    let filtered = usersWithPlombs;

    // Фильтр по сотруднику
    if (userFilter !== "Все") {
      filtered = filtered.filter((u) => u.id === userFilter);
    }

    // Поиск
    if (searchTerm) {
      filtered = filtered.filter(
        (u) =>
          u.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.lastName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Сортировка по количеству
    filtered.sort((a, b) => b.totalPlombs - a.totalPlombs);

    return filtered;
  }, [users, plombs, userFilter, searchTerm, assignedDateFilter]);

  const handleBatchClick = (batch) => {
    setSelectedBatch(batch);
    setIsBatchDetailOpen(true);
  };

  const handleUserClick = (user) => {
    setSelectedUser(user);
    setIsUserDetailOpen(true);
  };

  const handleAddBatch = () => {
    setIsAddBatchOpen(true);
  };

  const handleDistribution = () => {
    setIsDistributionOpen(true);
  };

  const resetDateFilters = () => {
    if (activeTab === "warehouse") {
      setDateFilter({ from: "", to: "" });
    } else {
      setAssignedDateFilter({ from: "", to: "" });
    }
  };

  const hasActiveDateFilter =
    activeTab === "warehouse"
      ? dateFilter.from || dateFilter.to
      : assignedDateFilter.from || assignedDateFilter.to;

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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-4 lg:p-8">
      {/* Заголовок */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-800 mb-2">
            Пломбалар
          </h1>
          <p className="text-gray-600">Пломбаларни бошқариш тизими</p>
        </div>

        <div className="flex gap-2 flex-wrap">
          {activeTab === "warehouse" && (
            <motion.button
              onClick={handleAddBatch}
              className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Plus size={20} />
              Кирим
            </motion.button>
          )}

          {activeTab === "distribution" && (
            <motion.button
              onClick={handleDistribution}
              className="bg-gradient-to-r from-green-500 to-teal-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <UserCheck size={20} />
              Пломба тарқатиш
            </motion.button>
          )}
        </div>
      </div>

      {/* Табы */}
      <div className="flex gap-2 mb-6 bg-white rounded-xl p-1 shadow-sm w-fit">
        <button
          onClick={() => {
            setActiveTab("warehouse");
            setSearchTerm("");
          }}
          className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${
            activeTab === "warehouse"
              ? "bg-indigo-600 text-white shadow-md"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <Warehouse size={18} />
          Омбор
        </button>
        <button
          onClick={() => {
            setActiveTab("distribution");
            setSearchTerm("");
          }}
          className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${
            activeTab === "distribution"
              ? "bg-indigo-600 text-white shadow-md"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <Users size={18} />
          Таркатма рўйхат
        </button>
      </div>

      {/* Фильтры */}
      <div className="bg-white rounded-2xl shadow-sm p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-end">
          {/* Поиск */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-gray-500 mb-1">Қидириш</label>
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                type="text"
                placeholder={
                  activeTab === "warehouse"
                    ? "Партия, серия..."
                    : "Ходим исми..."
                }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Фильтр для Омбор - по дате поступления */}
          {activeTab === "warehouse" && (
            <>
              <div>
                <label className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                  <Calendar size={12} />
                  Келиб тушган санадан
                </label>
                <input
                  type="date"
                  value={dateFilter.from}
                  onChange={(e) =>
                    setDateFilter({ ...dateFilter, from: e.target.value })
                  }
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                  <Calendar size={12} />
                  Келиб тушган санагача
                </label>
                <input
                  type="date"
                  value={dateFilter.to}
                  onChange={(e) =>
                    setDateFilter({ ...dateFilter, to: e.target.value })
                  }
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </>
          )}

          {/* Фильтр для Таркатма - по сотруднику и дате прикрепления */}
          {activeTab === "distribution" && (
            <>
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Ходим
                </label>
                <select
                  value={userFilter}
                  onChange={(e) => setUserFilter(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Все">Барча ходимлар</option>
                  {users
                    .filter((u) => plombs.some((p) => p.assignedTo === u.id))
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.firstName} {u.lastName}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                  <Calendar size={12} />
                  Бириктирилган санадан
                </label>
                <input
                  type="date"
                  value={assignedDateFilter.from}
                  onChange={(e) =>
                    setAssignedDateFilter({
                      ...assignedDateFilter,
                      from: e.target.value,
                    })
                  }
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                  <Calendar size={12} />
                  Бириктирилган санагача
                </label>
                <input
                  type="date"
                  value={assignedDateFilter.to}
                  onChange={(e) =>
                    setAssignedDateFilter({
                      ...assignedDateFilter,
                      to: e.target.value,
                    })
                  }
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </>
          )}

          {/* Кнопка сброса фильтров */}
          {hasActiveDateFilter && (
            <button
              onClick={resetDateFilters}
              className="px-3 py-2 text-sm text-red-500 hover:text-red-700 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
            >
              Тозалаш
            </button>
          )}
        </div>
      </div>

      {/* Таблица Омбор */}
      {activeTab === "warehouse" && (
        <motion.div
          className="bg-white rounded-2xl shadow-sm overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
                  <th className="px-4 py-4 text-left font-semibold w-16">№</th>
                  <th className="px-4 py-4 text-left font-semibold">
                    Партия №
                  </th>
                  <th className="px-4 py-4 text-left font-semibold">
                    Келиб тушган сана
                  </th>
                  <th className="px-4 py-4 text-left font-semibold">Серия</th>
                  <th className="px-4 py-4 text-left font-semibold">Дан</th>
                  <th className="px-4 py-4 text-left font-semibold">Гача</th>
                  <th className="px-4 py-4 text-left font-semibold">Остаток</th>
                  <th className="px-4 py-4 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {warehouseData.map((batch, index) => (
                  <motion.tr
                    key={batch.id}
                    onClick={() => handleBatchClick(batch)}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.03 }}
                    className="hover:bg-indigo-50 transition-colors cursor-pointer group"
                  >
                    <td className="px-4 py-4 text-gray-600">{index + 1}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                          <Package className="text-indigo-600" size={20} />
                        </div>
                        <span className="font-mono font-medium text-gray-800">
                          {batch.batchNumber}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-gray-600">
                      {batch.receivedDate || "—"}
                    </td>
                    <td className="px-4 py-4 text-gray-700 font-mono">
                      {batch.series || "—"}
                    </td>
                    <td className="px-4 py-4 text-gray-700 font-mono">
                      {batch.fromNumber || "—"}
                    </td>
                    <td className="px-4 py-4 text-gray-700 font-mono">
                      {batch.toNumber || "—"}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          batch.availableCount > 0
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {batch.availableCount} / {batch.totalCount}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <ChevronRight
                        className="text-gray-300 group-hover:text-indigo-500 transition-colors"
                        size={20}
                      />
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {warehouseData.length === 0 && (
            <div className="text-center py-12">
              <Package className="mx-auto text-gray-400 mb-4" size={48} />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                {searchTerm || dateFilter.from || dateFilter.to
                  ? "Партиялар топилмади"
                  : "Партиялар қўшилмаган"}
              </h3>
              {!searchTerm && !dateFilter.from && !dateFilter.to && (
                <button
                  onClick={handleAddBatch}
                  className="bg-indigo-500 text-white px-6 py-2 rounded-lg hover:bg-indigo-600 transition-colors"
                >
                  Кирим қилиш
                </button>
              )}
            </div>
          )}
        </motion.div>
      )}

      {/* Таблица Таркатма руйхат */}
      {activeTab === "distribution" && (
        <motion.div
          className="bg-white rounded-2xl shadow-sm overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
                  <th className="px-4 py-4 text-left font-semibold w-16">№</th>
                  <th className="px-4 py-4 text-left font-semibold">Ходим</th>
                  <th className="px-4 py-4 text-left font-semibold hidden md:table-cell">
                    Охирги бириктирилган сана
                  </th>
                  <th className="px-4 py-4 text-left font-semibold">
                    Олинган пломбалар
                  </th>
                  <th className="px-4 py-4 text-left font-semibold">
                    Ўрнатилганлар
                  </th>
                  <th className="px-4 py-4 text-left font-semibold">Остаток</th>
                  <th className="px-4 py-4 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {distributionData.map((user, index) => (
                  <motion.tr
                    key={user.id}
                    onClick={() => handleUserClick(user)}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.03 }}
                    className="hover:bg-indigo-50 transition-colors cursor-pointer group"
                  >
                    <td className="px-4 py-4 text-gray-600">{index + 1}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                          <span className="text-indigo-600 font-semibold">
                            {user.firstName?.[0]}
                            {user.lastName?.[0]}
                          </span>
                        </div>
                        <div>
                          <div className="font-semibold text-gray-800">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-xs text-gray-500">
                            {user.role}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-gray-600 hidden md:table-cell">
                      {user.lastAssignedDate ? (
                        <span className="inline-flex items-center gap-1 text-sm">
                          <Calendar size={14} className="text-gray-400" />
                          {user.lastAssignedDate}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                        {user.totalPlombs}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                        {user.installedPlombs}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          user.remainingPlombs > 0
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {user.remainingPlombs}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <ChevronRight
                        className="text-gray-300 group-hover:text-indigo-500 transition-colors"
                        size={20}
                      />
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {distributionData.length === 0 && (
            <div className="text-center py-12">
              <Users className="mx-auto text-gray-400 mb-4" size={48} />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                {searchTerm ||
                userFilter !== "Все" ||
                assignedDateFilter.from ||
                assignedDateFilter.to
                  ? "Ходимлар топилмади"
                  : "Ҳеч кимга пломба берилмаган"}
              </h3>
              {!searchTerm &&
                userFilter === "Все" &&
                !assignedDateFilter.from &&
                !assignedDateFilter.to && (
                  <button
                    onClick={handleDistribution}
                    className="bg-indigo-500 text-white px-6 py-2 rounded-lg hover:bg-indigo-600 transition-colors"
                  >
                    Пломба тарқатиш
                  </button>
                )}
            </div>
          )}
        </motion.div>
      )}

      {/* Модальные окна */}
      <AddPlombBatchModal
        isOpen={isAddBatchOpen}
        onClose={() => setIsAddBatchOpen(false)}
        onBatchAdded={loadData}
      />

      <PlombBatchDetailModal
        isOpen={isBatchDetailOpen}
        onClose={() => {
          setIsBatchDetailOpen(false);
          setSelectedBatch(null);
        }}
        batch={selectedBatch}
        plombs={plombs.filter((p) => p.batchId === selectedBatch?.id)}
        users={users}
        onRefresh={loadData}
      />

      <PlombUserDetailModal
        isOpen={isUserDetailOpen}
        onClose={() => {
          setIsUserDetailOpen(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
        plombs={plombs.filter((p) => p.assignedTo === selectedUser?.id)}
        objects={objects}
        organizations={organizations}
        batches={batches}
        onRefresh={loadData}
      />

      <PlombDistributionModal
        isOpen={isDistributionOpen}
        onClose={() => setIsDistributionOpen(false)}
        users={users}
        plombs={plombs}
        batches={batches}
        onDistributed={loadData}
      />
    </div>
  );
};

export default Plombalar;
