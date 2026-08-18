// src/pages/Regions/Cities.jsx
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
  Building,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { useAppStore } from "../../lib/zustand";
import { translations } from "../../lib/i18n";
import { useLogger } from "../../hooks/useLogger";
import { MODULES } from "../../services/logger";

const Cities = () => {
  const { language } = useAppStore();
  const { logCreate, logUpdate, logError, logView } = useLogger();
  const t = translations[language];

  const [cities, setCities] = useState([]);
  const [regions, setRegions] = useState([]);
  const [selectedCity, setSelectedCity] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Данные для нового города/района
  const [newCity, setNewCity] = useState({
    name: "",
    regionId: "",
    regionName: "",
    type: "Город",
  });

  // Загрузка данных
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Загрузка городов
        const citiesSnapshot = await getDocs(collection(db, "cities"));
        const citiesData = citiesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setCities(citiesData);

        // Загрузка областей
        const regionsSnapshot = await getDocs(collection(db, "regions"));
        const regionsData = regionsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setRegions(regionsData);

        // Логируем просмотр
        await logView(MODULES.CITIES, "Просмотр списка городов и районов");
      } catch (error) {
        console.error("Error loading data:", error);
        await logError(
          MODULES.CITIES,
          `Ошибка загрузки городов: ${error.message}`
        );
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Проверка заполнения формы
  const checkFormValidity = () => {
    const currentData = isCreating ? newCity : selectedCity;

    if (!currentData) return false;

    const requiredFields = ["name", "regionId"];

    const allFieldsFilled = requiredFields.every(
      (field) =>
        currentData[field] && currentData[field].toString().trim() !== ""
    );

    return allFieldsFilled;
  };

  // Обработчик выбора области
  const handleRegionChange = (regionId) => {
    const selectedRegion = regions.find((region) => region.id === regionId);
    if (selectedRegion) {
      if (isCreating) {
        setNewCity((prev) => ({
          ...prev,
          regionId: selectedRegion.id,
          regionName: selectedRegion.name,
        }));
      } else {
        setSelectedCity((prev) => ({
          ...prev,
          regionId: selectedRegion.id,
          regionName: selectedRegion.name,
        }));
      }
    }
  };

  // Фильтрация городов по поиску
  const filteredCities = cities.filter(
    (city) =>
      city.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      city.regionName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      city.type?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Обработчик изменения полей
  const handleInputChange = (field, value) => {
    if (isCreating) {
      setNewCity((prev) => ({ ...prev, [field]: value }));
    } else {
      setSelectedCity((prev) => ({ ...prev, [field]: value }));
    }
  };

  // Открытие модального окна для просмотра города
  const handleCityClick = (city) => {
    setSelectedCity({ ...city });
    setIsModalOpen(true);
    setIsEditMode(false);
  };

  // Открытие модального окна для создания города
  const handleCreateCity = () => {
    setIsCreating(true);
    setIsModalOpen(true);
    setNewCity({
      name: "",
      regionId: "",
      regionName: "",
      type: "Город",
    });
  };

  // Закрытие модального окна
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setIsEditMode(false);
    setIsCreating(false);
    setSelectedCity(null);
  };

  // Редактирование города
  const handleEdit = () => {
    setIsEditMode(true);
  };

  // Сохранение изменений
  const handleSave = async () => {
    const isValid = checkFormValidity();
    if (!isValid) return;

    try {
      if (isCreating) {
        const docRef = await addDoc(collection(db, "cities"), {
          ...newCity,
          createdAt: new Date(),
        });

        // Логируем создание
        await logCreate(
          MODULES.CITIES,
          `Создан город/район: ${newCity.name}`,
          docRef.id,
          { name: newCity.name, regionName: newCity.regionName }
        );
      } else {
        await updateDoc(doc(db, "cities", selectedCity.id), {
          ...selectedCity,
          updatedAt: new Date(),
        });

        // Логируем обновление
        await logUpdate(
          MODULES.CITIES,
          `Обновлен город/район: ${selectedCity.name}`,
          selectedCity.id,
          { name: selectedCity.name, regionName: selectedCity.regionName }
        );
      }

      // Перезагрузка данных
      const citiesSnapshot = await getDocs(collection(db, "cities"));
      const citiesData = citiesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setCities(citiesData);

      handleCloseModal();
    } catch (error) {
      console.error("Error saving city:", error);
      await logError(
        MODULES.CITIES,
        `Ошибка сохранения города: ${error.message}`
      );
    }
  };

  // Отмена редактирования
  const handleCancel = () => {
    if (isCreating) {
      handleCloseModal();
    } else {
      setIsEditMode(false);
      const originalCity = cities.find((city) => city.id === selectedCity.id);
      setSelectedCity(originalCity ? { ...originalCity } : null);
    }
  };

  const isFormValid = checkFormValidity();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-100 flex items-center justify-center">
        <motion.div
          className="w-12 h-12 border-4 border-cyan-200 border-t-cyan-600 rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-100 p-4 lg:p-8">
      {/* Заголовок и кнопка добавления */}
      <motion.div
        className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-800 mb-2">
            {language === "uz" ? "Шаҳар ва туманлар" : "Города и районы"}
          </h1>
          <p className="text-gray-600">
            {language === "uz"
              ? "Шаҳар ва туман номларини бошқариш"
              : "Управление городами и районами"}
          </p>
        </div>

        <motion.button
          className="bg-gradient-to-r from-red-500 to-pink-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2 w-full lg:w-auto justify-center"
          onClick={handleCreateCity}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Plus size={20} />
          {language === "uz" ? "Шаҳар/туман қўшиш" : "Добавить город/район"}
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
            placeholder={
              language === "uz"
                ? "Номи билан қидириш..."
                : "Поиск по названию..."
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-300"
          />
        </div>
      </motion.div>

      {/* Таблица городов */}
      <motion.div
        className="bg-white rounded-2xl shadow-sm overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white">
                <th className="px-4 py-4 text-left font-semibold">
                  {language === "uz" ? "Шаҳар/туман" : "Город/район"}
                </th>
                <th className="px-4 py-4 text-left font-semibold">
                  {language === "uz" ? "Тип" : "Тип"}
                </th>
                <th className="px-4 py-4 text-left font-semibold hidden md:table-cell">
                  {language === "uz" ? "Вилоят" : "Область"}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredCities.map((city, index) => (
                <motion.tr
                  key={city.id}
                  onClick={() => handleCityClick(city)}
                  className="hover:bg-cyan-50 transition-colors duration-200 cursor-pointer group"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  whileHover={{ scale: 1.01 }}
                >
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center group-hover:bg-cyan-200 transition-colors">
                        <Building className="text-cyan-600" size={20} />
                      </div>
                      <div className="font-semibold text-gray-800">
                        {city.name}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        city.type === "Город"
                          ? "bg-blue-100 text-blue-800"
                          : city.type === "Район"
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {city.type === "Город"
                        ? language === "uz"
                          ? "Шаҳар"
                          : "Город"
                        : city.type === "Район"
                        ? language === "uz"
                          ? "Туман"
                          : "Район"
                        : language === "uz"
                        ? "Қишлоқ"
                        : "Посёлок"}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-gray-600 hidden md:table-cell">
                    <div className="flex items-center gap-2">
                      <MapPin className="text-cyan-500" size={16} />
                      <span>{city.regionName}</span>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredCities.length === 0 && (
          <motion.div
            className="text-center py-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
          >
            <Building className="mx-auto text-gray-400 mb-4" size={48} />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">
              {searchTerm
                ? language === "uz"
                  ? "Шаҳар/туманлар топилмади"
                  : "Города/районы не найдены"
                : language === "uz"
                ? "Шаҳар/туманлар қўшилмаган"
                : "Города/районы не добавлены"}
            </h3>
            {!searchTerm && (
              <button
                onClick={handleCreateCity}
                className="bg-cyan-500 text-white px-6 py-2 rounded-lg hover:bg-cyan-600 transition-colors"
              >
                {language === "uz"
                  ? "Шаҳар/туман қўшиш"
                  : "Добавить город/район"}
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
              <div className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white p-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold">
                    {isCreating
                      ? language === "uz"
                        ? "Шаҳар/туман яратиш"
                        : "Создание города/района"
                      : isEditMode
                      ? language === "uz"
                        ? "Шаҳар/туман таҳрирлаш"
                        : "Редактирование города/района"
                      : language === "uz"
                      ? "Шаҳар/туман ҳақида маълумот"
                      : "Информация о городе/районе"}
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
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                        <Building size={16} />
                        {language === "uz" ? "Номи" : "Название"} *
                      </label>
                      <input
                        type="text"
                        value={
                          isCreating ? newCity.name : selectedCity?.name || ""
                        }
                        onChange={(e) =>
                          handleInputChange("name", e.target.value)
                        }
                        disabled={!isCreating && !isEditMode}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all disabled:bg-gray-50 disabled:text-gray-500"
                        placeholder={
                          language === "uz"
                            ? "Номини киритинг"
                            : "Введите название"
                        }
                      />
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                        <MapPin size={16} />
                        {language === "uz" ? "Тури" : "Тип"}
                      </label>
                      <select
                        value={
                          isCreating ? newCity.type : selectedCity?.type || ""
                        }
                        onChange={(e) =>
                          handleInputChange("type", e.target.value)
                        }
                        disabled={!isCreating && !isEditMode}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all disabled:bg-gray-50 disabled:text-gray-500"
                      >
                        <option value="Город">
                          {language === "uz" ? "Шаҳар" : "Город"}
                        </option>
                        <option value="Район">
                          {language === "uz" ? "Туман" : "Район"}
                        </option>
                        <option value="Посёлок">
                          {language === "uz" ? "Қишлоқ" : "Посёлок"}
                        </option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                      <MapPin size={16} />
                      {language === "uz" ? "Вилоят" : "Область"} *
                    </label>
                    <select
                      value={
                        isCreating
                          ? newCity.regionId
                          : selectedCity?.regionId || ""
                      }
                      onChange={(e) => handleRegionChange(e.target.value)}
                      disabled={!isCreating && !isEditMode}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all disabled:bg-gray-50 disabled:text-gray-500"
                    >
                      <option value="">
                        {language === "uz"
                          ? "Вилоятни танланг"
                          : "Выберите область"}
                      </option>
                      {regions.map((region) => (
                        <option key={region.id} value={region.id}>
                          {region.name}
                        </option>
                      ))}
                    </select>
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
                      className="w-full sm:w-auto bg-cyan-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-cyan-600 transition-colors flex items-center gap-2 justify-center"
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

export default Cities;
