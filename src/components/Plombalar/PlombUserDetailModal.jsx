// src/components/Plombalar/PlombUserDetailModal.jsx
import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, User, Package, Factory, Calendar } from "lucide-react";

const PlombUserDetailModal = ({
  isOpen,
  onClose,
  user,
  plombs,
  objects,
  organizations,
  batches,
  onRefresh,
}) => {
  const getUserFullName = () => {
    if (!user) return "—";
    return `${user.firstName} ${user.lastName}`;
  };

  const getInstallInfo = (plomb) => {
    if (!plomb.installedOn) return null;
    const object = objects.find((o) => o.id === plomb.installedOn);
    if (!object) return "Ўрнатилган";

    const org = organizations.find((o) => o.id === object.organizationId);
    return {
      billingAccount: object.billingAccount || "—",
      organizationName: object.organizationName || org?.name || "—",
      objectName: object.objectName || "—",
    };
  };

  const sortedPlombs = useMemo(() => {
    return [...plombs].sort((a, b) => {
      // Сначала сортируем по дате прикрепления (новые сначала)
      const dateA = a.assignedDate || "";
      const dateB = b.assignedDate || "";
      if (dateA !== dateB) return dateB.localeCompare(dateA);

      // Затем по номеру
      const aNum = parseInt(a.number) || 0;
      const bNum = parseInt(b.number) || 0;
      return aNum - bNum;
    });
  }, [plombs]);

  if (!isOpen || !user) return null;

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
          className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                  <User size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold">{getUserFullName()}</h2>
                  <p className="text-sm text-indigo-100">
                    {user.role} • {plombs.length} та пломба
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white bg-opacity-20 flex items-center justify-center hover:bg-opacity-30"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Статистика */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 border-b">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {plombs.length}
              </p>
              <p className="text-xs text-gray-500">Жами олинган</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {plombs.filter((p) => p.installedOn).length}
              </p>
              <p className="text-xs text-gray-500">Ўрнатилган</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600">
                {plombs.filter((p) => !p.installedOn).length}
              </p>
              <p className="text-xs text-gray-500">Остаток</p>
            </div>
          </div>

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
                    Серия
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Рақам
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Бириктирилган сана
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Ўрнатилган
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedPlombs.map((plomb, index) => {
                  const installInfo = getInstallInfo(plomb);
                  return (
                    <tr key={plomb.id} className="hover:bg-indigo-50">
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
                      <td className="px-4 py-3 text-gray-600 text-sm">
                        {plomb.assignedDate ? (
                          <span className="inline-flex items-center gap-1">
                            <Calendar size={14} className="text-gray-400" />
                            {plomb.assignedDate}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {installInfo ? (
                          typeof installInfo === "string" ? (
                            <span className="text-green-600">
                              {installInfo}
                            </span>
                          ) : (
                            <div className="text-xs">
                              <div className="font-medium text-gray-800">
                                {installInfo.objectName}
                              </div>
                              <div className="text-gray-500">
                                Л/с: {installInfo.billingAccount}
                              </div>
                              <div className="text-gray-500">
                                {installInfo.organizationName}
                              </div>
                            </div>
                          )
                        ) : (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                            Ўрнатилмаган
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {sortedPlombs.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <Package className="mx-auto mb-4" size={48} />
                Пломбалар топилмади
              </div>
            )}
          </div>

          <div className="border-t px-6 py-4 bg-gray-50 flex justify-between items-center">
            <span className="text-sm text-gray-500">
              Ўрнатилган: {plombs.filter((p) => p.installedOn).length} / Жами:{" "}
              {plombs.length}
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

export default PlombUserDetailModal;
