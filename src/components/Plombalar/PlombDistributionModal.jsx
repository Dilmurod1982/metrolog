// src/components/Plombalar/PlombDistributionModal.jsx
import React, { useState, useMemo } from "react";
import { doc, updateDoc, writeBatch } from "firebase/firestore";
import { db } from "../../firebase/config";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Users,
  Package,
  Search,
  CheckCircle,
  UserCheck,
  Calendar,
} from "lucide-react";
import { useAppStore } from "../../lib/zustand";
import { useLogger } from "../../hooks/useLogger";
import { MODULES } from "../../services/logger";
import { toast } from "react-hot-toast";

const PlombDistributionModal = ({
  isOpen,
  onClose,
  users,
  plombs,
  batches,
  onDistributed,
}) => {
  const { userData } = useAppStore();
  const { logCreate, logError } = useLogger();

  const [selectedUser, setSelectedUser] = useState("");
  const [selectedPlombs, setSelectedPlombs] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBatch, setFilterBatch] = useState("Все");
  const [assignedDate, setAssignedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [saving, setSaving] = useState(false);

  // Пломбы на складе (не прикреплённые)
  const warehousePlombs = useMemo(() => {
    let filtered = plombs.filter((p) => !p.assignedTo);

    if (filterBatch !== "Все") {
      filtered = filtered.filter((p) => p.batchId === filterBatch);
    }

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.batchNumber?.toLowerCase().includes(lower) ||
          p.series?.toLowerCase().includes(lower) ||
          p.number?.includes(searchTerm)
      );
    }

    filtered.sort((a, b) => {
      const aNum = parseInt(a.number) || 0;
      const bNum = parseInt(b.number) || 0;
      return aNum - bNum;
    });

    return filtered;
  }, [plombs, filterBatch, searchTerm]);

  const togglePlomb = (plombId) => {
    setSelectedPlombs((prev) =>
      prev.includes(plombId)
        ? prev.filter((id) => id !== plombId)
        : [...prev, plombId]
    );
  };

  const toggleAllVisible = () => {
    const visibleIds = warehousePlombs.map((p) => p.id);
    const allSelected = visibleIds.every((id) => selectedPlombs.includes(id));

    if (allSelected) {
      setSelectedPlombs((prev) =>
        prev.filter((id) => !visibleIds.includes(id))
      );
    } else {
      setSelectedPlombs((prev) => [...new Set([...prev, ...visibleIds])]);
    }
  };

  const handleDistribute = async () => {
    if (!selectedUser) {
      toast.error("Ходимни танланг");
      return;
    }
    if (selectedPlombs.length === 0) {
      toast.error("Камида битта пломбани танланг");
      return;
    }
    if (!assignedDate) {
      toast.error("Бириктириш санасини киритинг");
      return;
    }

    setSaving(true);
    try {
      const batch = writeBatch(db);
      selectedPlombs.forEach((plombId) => {
        batch.update(doc(db, "plombs", plombId), {
          assignedTo: selectedUser,
          assignedDate: assignedDate,
          status: "Бириктирилган",
          assignedBy: userData?.email || "",
        });
      });
      await batch.commit();

      // Находим информацию о сотруднике для лога
      const user = users.find((u) => u.id === selectedUser);
      const userName = user
        ? `${user.firstName} ${user.lastName}`
        : selectedUser;

      await logCreate(
        MODULES.SETTINGS,
        `${selectedPlombs.length} та пломба "${userName}" ходимга бириктирилди (${assignedDate})`,
        selectedUser
      );

      toast.success(
        `${selectedPlombs.length} та пломба "${userName}" ходимга бириктирилди`
      );
      setSelectedPlombs([]);
      setSelectedUser("");
      if (onDistributed) await onDistributed();
      onClose();
    } catch (error) {
      console.error("Ошибка:", error);
      await logError(
        MODULES.SETTINGS,
        `Пломба тарқатишда хатолик: ${error.message}`
      );
      toast.error("Хатолик: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setSelectedPlombs([]);
    setSelectedUser("");
    setSearchTerm("");
    setFilterBatch("Все");
    setAssignedDate(new Date().toISOString().split("T")[0]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
      >
        <motion.div
          className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-gradient-to-r from-green-500 to-teal-600 text-white p-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <UserCheck size={22} />
                Пломба тарқатиш
              </h2>
              <button
                onClick={handleClose}
                className="w-8 h-8 rounded-full bg-white bg-opacity-20 flex items-center justify-center hover:bg-opacity-30"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="p-4 border-b bg-gray-50 space-y-3">
            {/* Выбор сотрудника и дата прикрепления */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <Users size={16} />
                  Ходимга бириктириш *
                </label>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Ходимни танланг</option>
                  {users
                    .filter(
                      (u) =>
                        u.role === "metrolog" ||
                        u.role === "tummetrolog" ||
                        u.role === "admin"
                    )
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.firstName} {u.lastName} ({u.role})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <Calendar size={16} />
                  Бириктириш санаси *
                </label>
                <input
                  type="date"
                  value={assignedDate}
                  onChange={(e) => setAssignedDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            {/* Фильтры для поиска пломб */}
            <div className="flex gap-3 flex-wrap">
              <div className="flex-1 min-w-[200px] relative">
                <Search
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  size={16}
                />
                <input
                  type="text"
                  placeholder="Партия, серия, рақам..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                />
              </div>
              <select
                value={filterBatch}
                onChange={(e) => setFilterBatch(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500"
              >
                <option value="Все">Барча партиялар</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.batchNumber} ({b.series})
                  </option>
                ))}
              </select>
              <button
                onClick={toggleAllVisible}
                className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-200"
              >
                Барчасини танлаш
              </button>
            </div>

            <div className="text-sm text-gray-500">
              Танланган:{" "}
              <b className="text-green-600">{selectedPlombs.length}</b> та
              пломба
            </div>
          </div>

          {/* Таблица доступных пломб */}
          <div className="flex-1 overflow-y-auto">
            <table className="w-full">
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  <th className="px-4 py-3 w-10"></th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    №
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Партия
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Серия
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Рақам
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {warehousePlombs.map((plomb, index) => (
                  <tr
                    key={plomb.id}
                    onClick={() => togglePlomb(plomb.id)}
                    className={`cursor-pointer ${
                      selectedPlombs.includes(plomb.id)
                        ? "bg-green-50"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedPlombs.includes(plomb.id)}
                        onChange={() => togglePlomb(plomb.id)}
                        className="w-4 h-4 text-green-600 rounded"
                      />
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-sm">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3 text-gray-700 text-sm">
                      {plomb.batchNumber}
                    </td>
                    <td className="px-4 py-3 text-gray-700 text-sm font-mono">
                      {plomb.series}
                    </td>
                    <td className="px-4 py-3 text-gray-700 text-sm font-mono font-medium">
                      {plomb.number}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {warehousePlombs.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <Package className="mx-auto mb-4" size={48} />
                Омборда пломбалар топилмади
              </div>
            )}
          </div>

          <div className="border-t px-6 py-4 bg-gray-50 flex justify-between items-center">
            <span className="text-sm text-gray-500">
              Омборда: {warehousePlombs.length} та
            </span>
            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-100"
              >
                Бекор
              </button>
              <button
                onClick={handleDistribute}
                disabled={
                  saving ||
                  !selectedUser ||
                  selectedPlombs.length === 0 ||
                  !assignedDate
                }
                className={`px-6 py-2 rounded-lg font-semibold flex items-center gap-2 ${
                  saving ||
                  !selectedUser ||
                  selectedPlombs.length === 0 ||
                  !assignedDate
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-green-500 text-white hover:bg-green-600"
                }`}
              >
                {saving
                  ? "Тарқатилмоқда..."
                  : `Тарқатиш (${selectedPlombs.length})`}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PlombDistributionModal;
