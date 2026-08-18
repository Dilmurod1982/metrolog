// src/pages/Regions/Regions.jsx
import React, { useState, useEffect } from "react";
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
  MapPin,
  CheckCircle,
  AlertCircle,
  Building,
} from "lucide-react";
import { useAppStore } from "../../lib/zustand";
import { translations } from "../../lib/i18n";
import { useLogger } from "../../hooks/useLogger";
import { MODULES } from "../../services/logger";

const Regions = () => {
  const { language } = useAppStore();
  const { logCreate, logUpdate, logError, logView } = useLogger();
  const t = translations[language];

  const [regions, setRegions] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Данные для новой области
  const [newRegion, setNewRegion] = useState({
    name: "",
    capital: "",
  });

  // Загрузка данных
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const regionsSnapshot = await getDocs(collection(db, "regions"));
        const regionsData = regionsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setRegions(regionsData);

        // Логируем просмотр
        await logView(MODULES.REGIONS, "Просмотр списка областей");
      } catch (error) {
        console.error("Error loading regions:", error);
        await logError(
          MODULES.REGIONS,
          `Ошибка загрузки областей: ${error.message}`
        );
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Проверка заполнения формы
  const checkFormValidity = () => {
    const currentData = isCreating ? newRegion : selectedRegion;

    if (!currentData) return false;

    const requiredFields = ["name"];

    const allFieldsFilled = requiredFields.every(
      (field) =>
        currentData[field] && currentData[field].toString().trim() !== ""
    );

    return allFieldsFilled;
  };

  // Фильтрация областей по поиску
  const filteredRegions = regions.filter(
    (region) =>
      region.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      region.capital?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Обработчик изменения полей
  const handleInputChange = (field, value) => {
    if (isCreating) {
      setNewRegion((prev) => ({ ...prev, [field]: value }));
    } else {
      setSelectedRegion((prev) => ({ ...prev, [field]: value }));
    }
  };

  // Открытие модального окна для просмотра области
  const handleRegionClick = (region) => {
    setSelectedRegion({ ...region });
    setIsModalOpen(true);
    setIsEditMode(false);
  };

  // Открытие модального окна для создания области
  const handleCreateRegion = () => {
    setIsCreating(true);
    setIsModalOpen(true);
    setNewRegion({
      name: "",
      capital: "",
    });
  };

  // Закрытие модального окна
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setIsEditMode(false);
    setIsCreating(false);
    setSelectedRegion(null);
  };

  // Редактирование области
  const handleEdit = () => {
    setIsEditMode(true);
  };

  // Сохранение изменений
  const handleSave = async () => {
    const isValid = checkFormValidity();
    if (!isValid) return;

    try {
      if (isCreating) {
        const docRef = await addDoc(collection(db, "regions"), {
          ...newRegion,
          country: "Узбекистан",
          createdAt: new Date(),
        });

        // Логируем создание
        await logCreate(
          MODULES.REGIONS,
          `Создана область: ${newRegion.name}`,
          docRef.id,
          { name: newRegion.name }
        );
      } else {
        await updateDoc(doc(db, "regions", selectedRegion.id), {
          ...selectedRegion,
          updatedAt: new Date(),
        });

        // Логируем обновление
        await logUpdate(
          MODULES.REGIONS,
          `Обновлена область: ${selectedRegion.name}`,
          selectedRegion.id,
          { name: selectedRegion.name }
        );
      }

      // Перезагрузка данных
      const regionsSnapshot = await getDocs(collection(db, "regions"));
      const regionsData = regionsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setRegions(regionsData);

      handleCloseModal();
    } catch (error) {
      console.error("Error saving region:", error);
      await logError(
        MODULES.REGIONS,
        `Ошибка сохранения области: ${error.message}`
      );
    }
  };

  // Отмена редактирования
  const handleCancel = () => {
    if (isCreating) {
      handleCloseModal();
    } else {
      setIsEditMode(false);
      const originalRegion = regions.find(
        (region) => region.id === selectedRegion.id
      );
      setSelectedRegion(originalRegion ? { ...originalRegion } : null);
    }
  };

  const isFormValid = checkFormValidity();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center">
        <motion.div
          className="w-12 h-12 border-4 border-pink-200 border-t-pink-600 rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-4 lg:p-8">
      {/* Заголовок и кнопка добавления */}
      <motion.div
        className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-800 mb-2">
            {language === "uz" ? "Вилоятлар" : "Области"}
          </h1>
          <p className="text-gray-600">
            {language === "uz"
              ? "Ўзбекистон вилоятларини бошқариш"
              : "Управление областями Узбекистана"}
          </p>
        </div>

        <motion.button
          className="bg-gradient-to-r from-red-500 to-pink-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2 w-full lg:w-auto justify-center"
          onClick={handleCreateRegion}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Plus size={20} />
          {language === "uz" ? "Вилоят қўшиш" : "Добавить область"}
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
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all duration-300"
          />
        </div>
      </motion.div>

      {/* Таблица областей */}
      <motion.div
        className="bg-white rounded-2xl shadow-sm overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-purple-500 to-pink-600 text-white">
                <th className="px-4 py-4 text-left font-semibold">
                  {language === "uz" ? "Вилоят" : "Область"}
                </th>
                <th className="px-4 py-4 text-left font-semibold">
                  {language === "uz" ? "Маркази" : "Центр"}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRegions.map((region, index) => (
                <motion.tr
                  key={region.id}
                  onClick={() => handleRegionClick(region)}
                  className="hover:bg-purple-50 transition-colors duration-200 cursor-pointer group"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  whileHover={{ scale: 1.01 }}
                >
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                        <MapPin className="text-purple-600" size={20} />
                      </div>
                      <div className="font-semibold text-gray-800">
                        {region.name}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-gray-600">
                    <div className="flex items-center gap-2">
                      <Building className="text-pink-500" size={16} />
                      <span>{region.capital || "Не указано"}</span>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredRegions.length === 0 && (
          <motion.div
            className="text-center py-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
          >
            <MapPin className="mx-auto text-gray-400 mb-4" size={48} />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">
              {searchTerm
                ? language === "uz"
                  ? "Вилоятлар топилмади"
                  : "Области не найдены"
                : language === "uz"
                ? "Вилоятлар қўшилмаган"
                : "Области не добавлены"}
            </h3>
            {!searchTerm && (
              <button
                onClick={handleCreateRegion}
                className="bg-purple-500 text-white px-6 py-2 rounded-lg hover:bg-purple-600 transition-colors"
              >
                {language === "uz" ? "Вилоят қўшиш" : "Добавить область"}
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
              {/* Заголовок модального окна */}
              <div className="bg-gradient-to-r from-purple-500 to-pink-600 text-white p-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold">
                    {isCreating
                      ? language === "uz"
                        ? "Вилоят яратиш"
                        : "Создание области"
                      : isEditMode
                      ? language === "uz"
                        ? "Вилоятни таҳрирлаш"
                        : "Редактирование области"
                      : language === "uz"
                      ? "Вилоят ҳақида маълумот"
                      : "Информация об области"}
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

              {/* Форма */}
              <div className="p-6 max-h-[60vh] overflow-y-auto">
                <div className="space-y-6">
                  <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                      <MapPin size={16} />
                      {language === "uz" ? "Вилоят номи" : "Название области"} *
                    </label>
                    <input
                      type="text"
                      value={
                        isCreating ? newRegion.name : selectedRegion?.name || ""
                      }
                      onChange={(e) =>
                        handleInputChange("name", e.target.value)
                      }
                      disabled={!isCreating && !isEditMode}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all disabled:bg-gray-50 disabled:text-gray-500"
                      placeholder={
                        language === "uz"
                          ? "Вилоят номини киритинг"
                          : "Введите название области"
                      }
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                      <Building size={16} />
                      {language === "uz" ? "Вилоят маркази" : "Центр области"}
                    </label>
                    <input
                      type="text"
                      value={
                        isCreating
                          ? newRegion.capital
                          : selectedRegion?.capital || ""
                      }
                      onChange={(e) =>
                        handleInputChange("capital", e.target.value)
                      }
                      disabled={!isCreating && !isEditMode}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all disabled:bg-gray-50 disabled:text-gray-500"
                      placeholder={
                        language === "uz"
                          ? "Вилоят марказини киритинг"
                          : "Введите центр области"
                      }
                    />
                  </div>

                  {/* Индикатор заполнения формы */}
                  {(isCreating || isEditMode) && (
                    <motion.div
                      className="border-t pt-6"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
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
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Кнопки */}
              <div className="border-t px-6 py-4 bg-gray-50">
                <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
                  {!isCreating && !isEditMode && (
                    <motion.button
                      onClick={handleEdit}
                      className="w-full sm:w-auto bg-purple-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-purple-600 transition-colors flex items-center gap-2 justify-center"
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

export default Regions;
