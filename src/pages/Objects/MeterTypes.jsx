// src/pages/Objects/MeterTypes.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "../../firebase/config";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  X,
  Edit,
  Save,
  Search,
  Gauge,
  CheckCircle,
  AlertCircle,
  Shield,
  Trash2,
} from "lucide-react";
import { useAppStore } from "../../lib/zustand";
import { translations } from "../../lib/i18n";
import { useLogger } from "../../hooks/useLogger";
import { MODULES } from "../../services/logger";
import { toast } from "react-hot-toast";

const MeterTypes = () => {
  const { language } = useAppStore();
  const { logCreate, logUpdate, logError } = useLogger();

  const [meterTypes, setMeterTypes] = useState([]);
  const [selectedType, setSelectedType] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [newType, setNewType] = useState({
    name: "",
    type: "Счетчик с перепадом",
    plombParts: [],
  });

  const meterTypeOptions = [
    { value: "Счетчик с перепадом", label: "Счетчик с перепадом" },
    { value: "Турбинный", label: "Турбинный" },
    { value: "Ротационный", label: "Ротационный" },
  ];

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const typesSnapshot = await getDocs(collection(db, "meterTypes"));
      const typesData = typesSnapshot.docs.map((doc) => ({
        id: doc.id,
        plombParts: [],
        ...doc.data(),
      }));
      setMeterTypes(typesData);
    } catch (error) {
      console.error("Error loading meter types:", error);
      await logError(
        MODULES.OBJECTS,
        `Ошибка загрузки типов счетчиков: ${error.message}`
      );
    } finally {
      setLoading(false);
    }
  }, [logError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const checkFormValidity = () => {
    const currentData = isCreating ? newType : selectedType;
    if (!currentData) return false;
    return currentData.name && currentData.name.trim() !== "";
  };

  const filteredTypes = meterTypes.filter(
    (type) =>
      type.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      type.type?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleInputChange = (field, value) => {
    if (isCreating) {
      setNewType((prev) => ({ ...prev, [field]: value }));
    } else {
      setSelectedType((prev) => ({ ...prev, [field]: value }));
    }
  };

  // === Работа с частями установки пломб ===

  const getCurrentPlombParts = () => {
    if (isCreating) return newType.plombParts || [];
    return selectedType?.plombParts || [];
  };

  const setCurrentPlombParts = (parts) => {
    if (isCreating) {
      setNewType((prev) => ({ ...prev, plombParts: parts }));
    } else {
      setSelectedType((prev) => ({ ...prev, plombParts: parts }));
    }
  };

  const handleAddPlombPart = () => {
    const parts = getCurrentPlombParts();
    setCurrentPlombParts([...parts, { name: "" }]);
  };

  const handlePlombPartChange = (index, value) => {
    const parts = [...getCurrentPlombParts()];
    parts[index] = { ...parts[index], name: value };
    setCurrentPlombParts(parts);
  };

  const handleRemovePlombPart = (index) => {
    const parts = getCurrentPlombParts();
    setCurrentPlombParts(parts.filter((_, i) => i !== index));
  };

  // === Модальные окна ===

  const handleTypeClick = (type) => {
    setSelectedType({ ...type, plombParts: type.plombParts || [] });
    setIsModalOpen(true);
    setIsEditMode(false);
  };

  const handleCreateType = () => {
    setIsCreating(true);
    setIsModalOpen(true);
    setNewType({
      name: "",
      type: "Счетчик с перепадом",
      plombParts: [],
    });
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setIsEditMode(false);
    setIsCreating(false);
    setSelectedType(null);
  };

  const handleEdit = () => {
    setIsEditMode(true);
  };

  const handleSave = async () => {
    const isValid = checkFormValidity();
    if (!isValid) {
      toast.error(
        language === "uz"
          ? "Барча мажбурий қаторларни тўлдиринг"
          : "Заполните все обязательные поля"
      );
      return;
    }

    // Проверяем, что все части имеют названия
    const parts = getCurrentPlombParts();
    const emptyParts = parts.filter((p) => !p.name || !p.name.trim());
    if (emptyParts.length > 0) {
      toast.error(
        language === "uz"
          ? "Барча пломба қисмлари номини тўлдиринг"
          : "Заполните названия всех частей пломб"
      );
      return;
    }

    try {
      // Очищаем пустые части
      const cleanParts = parts.filter((p) => p.name && p.name.trim());

      if (isCreating) {
        const docRef = await addDoc(collection(db, "meterTypes"), {
          name: newType.name,
          type: newType.type,
          plombParts: cleanParts,
          createdAt: new Date(),
        });
        await logCreate(
          MODULES.OBJECTS,
          `Создан тип счетчика: ${newType.name} (${cleanParts.length} та пломба қисми)`,
          docRef.id
        );
        toast.success("Ҳисоблагич тури яратилди");
      } else {
        await updateDoc(doc(db, "meterTypes", selectedType.id), {
          name: selectedType.name,
          type: selectedType.type,
          plombParts: cleanParts,
          updatedAt: new Date(),
        });
        await logUpdate(
          MODULES.OBJECTS,
          `Обновлен тип счетчика: ${selectedType.name} (${cleanParts.length} та пломба қисми)`,
          selectedType.id
        );
        toast.success("Ҳисоблагич тури янгиланди");
      }

      await loadData();
      handleCloseModal();
    } catch (error) {
      console.error("Error saving meter type:", error);
      await logError(
        MODULES.OBJECTS,
        `Ошибка сохранения типа счетчика: ${error.message}`
      );
      toast.error("Сақлашда хатолик");
    }
  };

  const handleCancel = () => {
    if (isCreating) {
      handleCloseModal();
    } else {
      setIsEditMode(false);
      const originalType = meterTypes.find(
        (type) => type.id === selectedType.id
      );
      setSelectedType(
        originalType
          ? { ...originalType, plombParts: originalType.plombParts || [] }
          : null
      );
    }
  };

  const isFormValid = checkFormValidity();
  const plombParts = getCurrentPlombParts();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-100 flex items-center justify-center">
        <motion.div
          className="w-12 h-12 border-4 border-yellow-200 border-t-yellow-600 rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-100 p-4 lg:p-8">
      <motion.div
        className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-800 mb-2">
            {language === "uz" ? "Ҳисоблагич турлари" : "Типы счетчиков"}
          </h1>
          <p className="text-gray-600">
            {language === "uz"
              ? "Ҳисоблагич турларини бошқариш"
              : "Управление типами счетчиков"}
          </p>
        </div>

        <motion.button
          className="bg-gradient-to-r from-yellow-500 to-orange-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2 w-full lg:w-auto justify-center"
          onClick={handleCreateType}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Plus size={20} />
          {language === "uz" ? "Тур қўшиш" : "Добавить тип"}
        </motion.button>
      </motion.div>

      {/* Поиск */}
      <motion.div
        className="bg-white rounded-2xl shadow-sm p-4 mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            size={20}
          />
          <input
            type="text"
            placeholder={language === "uz" ? "Қидириш..." : "Поиск..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300"
          />
        </div>
      </motion.div>

      {/* Таблица */}
      <motion.div
        className="bg-white rounded-2xl shadow-sm overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-yellow-500 to-orange-600 text-white">
                <th className="px-4 py-4 text-left font-semibold w-20">№</th>
                <th className="px-4 py-4 text-left font-semibold">
                  {language === "uz" ? "Ҳисоблагич номи" : "Название счетчика"}
                </th>
                <th className="px-4 py-4 text-left font-semibold">
                  {language === "uz" ? "Ҳисоблагич тури" : "Тип счетчика"}
                </th>
                <th className="px-4 py-4 text-left font-semibold hidden md:table-cell">
                  {language === "uz" ? "Пломба қисмлари" : "Части пломб"}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredTypes.map((type, index) => (
                <motion.tr
                  key={type.id}
                  onClick={() => handleTypeClick(type)}
                  className="hover:bg-orange-50 transition-colors duration-200 cursor-pointer group"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  whileHover={{ scale: 1.01 }}
                >
                  <td className="px-4 py-4 text-gray-600">{index + 1}</td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center group-hover:bg-yellow-200 transition-colors">
                        <Gauge className="text-yellow-600" size={20} />
                      </div>
                      <div className="font-semibold text-gray-800">
                        {type.name}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        type.type === "Счетчик с перепадом"
                          ? "bg-blue-100 text-blue-800"
                          : type.type === "Турбинный"
                          ? "bg-green-100 text-green-800"
                          : "bg-purple-100 text-purple-800"
                      }`}
                    >
                      {type.type}
                    </span>
                  </td>
                  <td className="px-4 py-4 hidden md:table-cell">
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                      <Shield size={14} />
                      {type.plombParts?.length || 0} та
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredTypes.length === 0 && (
          <motion.div
            className="text-center py-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Gauge className="mx-auto text-gray-400 mb-4" size={48} />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">
              {searchTerm
                ? language === "uz"
                  ? "Турлар топилмади"
                  : "Типы не найдены"
                : language === "uz"
                ? "Турлар қўшилмаган"
                : "Типы не добавлены"}
            </h3>
            {!searchTerm && (
              <button
                onClick={handleCreateType}
                className="bg-yellow-500 text-white px-6 py-2 rounded-lg hover:bg-yellow-600 transition-colors"
              >
                {language === "uz" ? "Тур қўшиш" : "Добавить тип"}
              </button>
            )}
          </motion.div>
        )}
      </motion.div>

      {/* Модальное окно */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCloseModal}
          >
            <motion.div
              className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-yellow-500 to-orange-600 text-white p-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold">
                    {isCreating
                      ? language === "uz"
                        ? "Тур яратиш"
                        : "Создание типа"
                      : isEditMode
                      ? language === "uz"
                        ? "Турни таҳрирлаш"
                        : "Редактирование типа"
                      : language === "uz"
                      ? "Тур ҳақида маълумот"
                      : "Информация о типе"}
                  </h2>
                  <motion.button
                    onClick={handleCloseModal}
                    className="w-8 h-8 rounded-full bg-white bg-opacity-20 flex items-center justify-center hover:bg-opacity-30 transition-all"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <X size={18} />
                  </motion.button>
                </div>
              </div>

              <div className="p-6 max-h-[65vh] overflow-y-auto">
                <div className="space-y-6">
                  {/* Название */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                      <Gauge size={16} />
                      {language === "uz"
                        ? "Ҳисоблагич номи"
                        : "Название счетчика"}{" "}
                      *
                    </label>
                    <input
                      type="text"
                      value={
                        isCreating ? newType.name : selectedType?.name || ""
                      }
                      onChange={(e) =>
                        handleInputChange("name", e.target.value)
                      }
                      disabled={!isCreating && !isEditMode}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all disabled:bg-gray-50 disabled:text-gray-500"
                      placeholder={
                        language === "uz"
                          ? "Ҳисоблагич номини киритинг"
                          : "Введите название счетчика"
                      }
                    />
                  </div>

                  {/* Тип */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                      <Gauge size={16} />
                      {language === "uz" ? "Ҳисоблагич тури" : "Тип счетчика"}
                    </label>
                    <select
                      value={
                        isCreating ? newType.type : selectedType?.type || ""
                      }
                      onChange={(e) =>
                        handleInputChange("type", e.target.value)
                      }
                      disabled={!isCreating && !isEditMode}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all disabled:bg-gray-50 disabled:text-gray-500"
                    >
                      {meterTypeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* === Раздел частей установки пломб === */}
                  <div className="border-t pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-800">
                          <Shield size={18} />
                          {language === "uz"
                            ? "Пломба ўрнатиш қисмлари"
                            : "Части установки пломб"}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {language === "uz"
                            ? "Ушбу ҳисоблагич тури учун пломба ўрнатиладиган қисмлар"
                            : "Части, на которые устанавливаются пломбы для этого типа счетчика"}
                        </p>
                      </div>

                      {(isCreating || isEditMode) && (
                        <motion.button
                          type="button"
                          onClick={handleAddPlombPart}
                          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Plus size={16} />
                          {language === "uz" ? "Қўшиш" : "Добавить"}
                        </motion.button>
                      )}
                    </div>

                    {/* Список частей */}
                    <div className="space-y-2">
                      {plombParts.length === 0 ? (
                        <div className="text-center py-6 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                          <Shield
                            className="mx-auto text-gray-300 mb-2"
                            size={32}
                          />
                          <p className="text-sm text-gray-500">
                            {language === "uz"
                              ? "Пломба қисмлари қўшилмаган"
                              : "Части пломб не добавлены"}
                          </p>
                          {(isCreating || isEditMode) && (
                            <button
                              type="button"
                              onClick={handleAddPlombPart}
                              className="mt-3 text-sm text-orange-600 hover:text-orange-700 font-medium"
                            >
                              +{" "}
                              {language === "uz"
                                ? "Биринчи қисмни қўшиш"
                                : "Добавить первую часть"}
                            </button>
                          )}
                        </div>
                      ) : (
                        plombParts.map((part, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-100 rounded-xl"
                          >
                            <div className="w-8 h-8 bg-orange-200 rounded-lg flex items-center justify-center flex-shrink-0">
                              <span className="text-orange-700 font-bold text-sm">
                                {index + 1}
                              </span>
                            </div>
                            <input
                              type="text"
                              value={part.name}
                              onChange={(e) =>
                                handlePlombPartChange(index, e.target.value)
                              }
                              disabled={!isCreating && !isEditMode}
                              placeholder={
                                language === "uz"
                                  ? "Қисм номини киритинг (масалан: Корпус)"
                                  : "Введите название части (например: Корпус)"
                              }
                              className="flex-1 px-3 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 bg-white"
                            />
                            {(isCreating || isEditMode) && (
                              <motion.button
                                type="button"
                                onClick={() => handleRemovePlombPart(index)}
                                className="w-9 h-9 bg-red-100 text-red-600 rounded-lg flex items-center justify-center hover:bg-red-200 transition-colors flex-shrink-0"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                              >
                                <Trash2 size={16} />
                              </motion.button>
                            )}
                          </motion.div>
                        ))
                      )}
                    </div>

                    {plombParts.length > 0 && (
                      <div className="mt-3 text-sm text-gray-500">
                        {language === "uz"
                          ? `Жами: ${plombParts.length} та қисм`
                          : `Всего: ${plombParts.length} частей`}
                      </div>
                    )}
                  </div>

                  {/* Индикатор валидности */}
                  {(isCreating || isEditMode) && (
                    <div className="border-t pt-6">
                      <div className="flex items-center gap-2 text-sm">
                        {isFormValid ? (
                          <>
                            <CheckCircle className="text-green-500" size={16} />
                            <span className="text-green-600">
                              {language === "uz"
                                ? "Барча мажбурий қаторлар тўлдирилди"
                                : "Все обязательные поля заполнены"}
                            </span>
                          </>
                        ) : (
                          <>
                            <AlertCircle
                              className="text-orange-500"
                              size={16}
                            />
                            <span className="text-orange-600">
                              {language === "uz"
                                ? "Барча мажбурий қаторлар тўлдиринг (*)"
                                : "Заполните все обязательные поля (*)"}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t px-6 py-4 bg-gray-50">
                <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
                  {!isCreating && !isEditMode && (
                    <motion.button
                      onClick={handleEdit}
                      className="w-full sm:w-auto bg-yellow-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-yellow-600 transition-colors flex items-center gap-2 justify-center"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Edit size={16} />
                      {language === "uz" ? "Таҳрирлаш" : "Редактировать"}
                    </motion.button>
                  )}

                  {(isCreating || isEditMode) && (
                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                      <motion.button
                        onClick={handleCancel}
                        className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-100 transition-colors"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {language === "uz" ? "Бекор" : "Отмена"}
                      </motion.button>
                      <motion.button
                        onClick={handleSave}
                        disabled={!isFormValid}
                        className={`px-6 py-3 rounded-xl font-semibold transition-colors flex items-center gap-2 justify-center ${
                          isFormValid
                            ? "bg-green-500 text-white hover:bg-green-600 cursor-pointer"
                            : "bg-gray-300 text-gray-500 cursor-not-allowed"
                        }`}
                        whileHover={isFormValid ? { scale: 1.02 } : {}}
                        whileTap={isFormValid ? { scale: 0.98 } : {}}
                      >
                        <Save size={16} />
                        {language === "uz" ? "Сақлаш" : "Сохранить"}
                      </motion.button>
                    </div>
                  )}

                  {!isCreating && !isEditMode && (
                    <motion.button
                      onClick={handleCloseModal}
                      className="w-full sm:w-auto px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-100 transition-colors"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {language === "uz" ? "Ёпиш" : "Закрыть"}
                    </motion.button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MeterTypes;
