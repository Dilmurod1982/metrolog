// src/components/Plombalar/PlombBatchDetailModal.jsx
import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Hash, Package, User } from "lucide-react";

const PlombBatchDetailModal = ({
  isOpen,
  onClose,
  batch,
  plombs,
  users,
  onRefresh,
}) => {
  const [filterUser, setFilterUser] = useState("Все");

  const getUserName = (userId) => {
    if (!userId) return null;
    const user = users.find((u) => u.id === userId);
    return user ? `${user.firstName} ${user.lastName}` : "—";
  };

  const filteredPlombs = useMemo(() => {
    let filtered = [...plombs];

    if (filterUser !== "Все") {
      if (filterUser === "warehouse") {
        filtered = filtered.filter((p) => !p.assignedTo);
      } else {
        filtered = filtered.filter((p) => p.assignedTo === filterUser);
      }
    }

    // Сортировка по номеру
    filtered.sort((a, b) => {
      const aNum = parseInt(a.number) || 0;
      const bNum = parseInt(b.number) || 0;
      return aNum - bNum;
    });

    return filtered;
  }, [plombs, filterUser]);

  // Уникальные пользователи из этой партии
  const uniqueUsers = useMemo(() => {
    const userIds = [
      ...new Set(plombs.map((p) => p.assignedTo).filter(Boolean)),
    ];
    return userIds.map((id) => users.find((u) => u.id === id)).filter(Boolean);
  }, [plombs, users]);

  if (!isOpen || !batch) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Package size={22} />
                  Партия: {batch.batchNumber}
                </h2>
                <p className="text-sm text-indigo-100 mt-1">
                  Серия: {batch.series} • {batch.receivedDate} • Дан:{" "}
                  {batch.fromNumber} - Гача: {batch.toNumber}
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white bg-opacity-20 flex items-center justify-center hover:bg-opacity-30"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Фильтр по сотрудникам */}
          <div className="p-4 border-b bg-gray-50">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ходим бўйича филтр
            </label>
            <select
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="w-full max-w-xs px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
            >
              <option value="Все">Барча пломбалар</option>
              <option value="warehouse">Омборда</option>
              {uniqueUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.firstName} {u.lastName}
                </option>
              ))}
            </select>
          </div>

          {/* Таблица */}
          <div className="flex-1 overflow-y-auto">
            <table className="w-full">
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    №
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Партия
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Сана
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Серия
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Рақам
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Бириктирилган
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredPlombs.map((plomb, index) => (
                  <tr key={plomb.id} className="hover:bg-indigo-50">
                    <td className="px-4 py-3 text-gray-600 text-sm">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3 text-gray-700 text-sm">
                      {plomb.batchNumber}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-sm">
                      {plomb.receivedDate}
                    </td>
                    <td className="px-4 py-3 text-gray-700 text-sm font-mono">
                      {plomb.series}
                    </td>
                    <td className="px-4 py-3 text-gray-700 text-sm font-mono font-medium">
                      {plomb.number}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {plomb.assignedTo ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                          <User size={12} />
                          {getUserName(plomb.assignedTo)}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                          Омборда
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredPlombs.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                Пломбалар топилмади
              </div>
            )}
          </div>

          <div className="border-t px-6 py-4 bg-gray-50 flex justify-between items-center">
            <span className="text-sm text-gray-500">
              Жами: {filteredPlombs.length} та
            </span>
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-100"
            >
              Ёпиш
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PlombBatchDetailModal;
