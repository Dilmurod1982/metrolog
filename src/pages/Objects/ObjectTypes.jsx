// src/pages/Objects/ObjectTypes.jsx
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
  Factory,
  CheckCircle,
  AlertCircle,
  FileText,
} from "lucide-react";
import { useAppStore } from "../../lib/zustand";
import { translations } from "../../lib/i18n";
import { useLogger } from "../../hooks/useLogger";
import { MODULES } from "../../services/logger";

const ObjectTypes = () => {
  const { language } = useAppStore();
  const { logCreate, logUpdate, logError } = useLogger();
  const t = translations[language];

  const [objectTypes, setObjectTypes] = useState([]);
  const [selectedType, setSelectedType] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [newType, setNewType] = useState({
    name: "",
    note: "",
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const typesSnapshot = await getDocs(collection(db, "objectTypes"));
      const typesData = typesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setObjectTypes(typesData);
    } catch (error) {
      console.error("Error loading object types:", error);
      await logError(
        MODULES.OBJECTS,
        `Ошибка загрузки типов объектов: ${error.message}`
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

  const filteredTypes = objectTypes.filter(
    (type) =>
      type.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      type.note?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleInputChange = (field, value) => {
    if (isCreating) {
      setNewType((prev) => ({ ...prev, [field]: value }));
    } else {
      setSelectedType((prev) => ({ ...prev, [field]: value }));
    }
  };

  const handleTypeClick = (type) => {
    setSelectedType({ ...type });
    setIsModalOpen(true);
    setIsEditMode(false);
  };

  const handleCreateType = () => {
    setIsCreating(true);
    setIsModalOpen(true);
    setNewType({ name: "", note: "" });
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
    if (!isValid) return;

    try {
      if (isCreating) {
        const docRef = await addDoc(collection(db, "objectTypes"), {
          ...newType,
          createdAt: new Date(),
        });
        await logCreate(
          MODULES.OBJECTS,
          `Создан тип объекта: ${newType.name}`,
          docRef.id
        );
      } else {
        await updateDoc(doc(db, "objectTypes", selectedType.id), {
          ...selectedType,
          updatedAt: new Date(),
        });
        await logUpdate(
          MODULES.OBJECTS,
          `Обновлен тип объекта: ${selectedType.name}`,
          selectedType.id
        );
      }

      await loadData();
      handleCloseModal();
    } catch (error) {
      console.error("Error saving object type:", error);
      await logError(
        MODULES.OBJECTS,
        `Ошибка сохранения типа объекта: ${error.message}`
      );
    }
  };

  const handleCancel = () => {
    if (isCreating) {
      handleCloseModal();
    } else {
      setIsEditMode(false);
      const originalType = objectTypes.find(
        (type) => type.id === selectedType.id
      );
      setSelectedType(originalType ? { ...originalType } : null);
    }
  };

  const isFormValid = checkFormValidity();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-100 flex items-center justify-center">
        <motion.div
          className="w-12 h-12 border-4 border-amber-200 border-t-amber-600 rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-100 p-4 lg:p-8">
      <motion.div
        className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-800 mb-2">
            {language === "uz" ? "Объект турлари" : "Типы объектов"}
          </h1>
          <p className="text-gray-600">
            {language === "uz"
              ? "Объект турларини бошқариш"
              : "Управление типами объектов"}
          </p>
        </div>

        <motion.button
          className="bg-gradient-to-r from-orange-500 to-amber-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2 w-full lg:w-auto justify-center"
          onClick={handleCreateType}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Plus size={20} />
          {language === "uz" ? "Тур қўшиш" : "Добавить тип"}
        </motion.button>
      </motion.div>

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
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-300"
          />
        </div>
      </motion.div>

      <motion.div
        className="bg-white rounded-2xl shadow-sm overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-orange-500 to-amber-600 text-white">
                <th className="px-4 py-4 text-left font-semibold w-20">№</th>
                <th className="px-4 py-4 text-left font-semibold">
                  {language === "uz"
                    ? "Объект тури номи"
                    : "Название типа объекта"}
                </th>
                <th className="px-4 py-4 text-left font-semibold">
                  {language === "uz" ? "Изоҳ" : "Примечание"}
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
                      <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center group-hover:bg-orange-200 transition-colors">
                        <Factory className="text-orange-600" size={20} />
                      </div>
                      <div className="font-semibold text-gray-800">
                        {type.name}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-gray-600">
                    {type.note || "-"}
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
            transition={{ duration: 0.6 }}
          >
            <Factory className="mx-auto text-gray-400 mb-4" size={48} />
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
                className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 transition-colors"
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
              <div className="bg-gradient-to-r from-orange-500 to-amber-600 text-white p-6">
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

              <div className="p-6 max-h-[60vh] overflow-y-auto">
                <div className="space-y-6">
                  <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                      <Factory size={16} />
                      {language === "uz"
                        ? "Объект тури номи"
                        : "Название типа объекта"}{" "}
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
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all disabled:bg-gray-50 disabled:text-gray-500"
                      placeholder={
                        language === "uz"
                          ? "Тур номини киритинг"
                          : "Введите название типа"
                      }
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                      <FileText size={16} />
                      {language === "uz" ? "Изоҳ" : "Примечание"}
                    </label>
                    <textarea
                      value={
                        isCreating ? newType.note : selectedType?.note || ""
                      }
                      onChange={(e) =>
                        handleInputChange("note", e.target.value)
                      }
                      disabled={!isCreating && !isEditMode}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all disabled:bg-gray-50 disabled:text-gray-500"
                      placeholder={
                        language === "uz"
                          ? "Изоҳ киритинг"
                          : "Введите примечание"
                      }
                    />
                  </div>

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
                      className="w-full sm:w-auto bg-orange-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-orange-600 transition-colors flex items-center gap-2 justify-center"
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

export default ObjectTypes;
