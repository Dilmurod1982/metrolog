// src/pages/Ltds/Ltds.jsx
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
  Building,
  MapPin,
  User,
  Phone,
  Search,
  Filter,
  FileText,
  Users,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { useAppStore } from "../../lib/zustand";
import { translations } from "../../lib/i18n";
import { useLogger } from "../../hooks/useLogger";
import { MODULES } from "../../services/logger";

const Ltds = () => {
  const { language } = useAppStore();
  const { logCreate, logUpdate, logError } = useLogger();
  const t = translations[language];

  const [organizations, setOrganizations] = useState([]);
  const [selectedOrganization, setSelectedOrganization] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [innError, setInnError] = useState("");
  const [jshshirError, setJshshirError] = useState("");

  // Данные для новой организации
  const [newOrganization, setNewOrganization] = useState({
    name: "",
    type: "", // "МЧЖ" или "ЯТТ"
    inn: "", // ИНН для МЧЖ (9 цифр)
    jshshir: "", // ЖШШИР для ЯТТ (14 цифр)
    city: "",
    street: "",
    building: "",
    directorName: "",
    directorPhone: "",
    accountantName: "",
    accountantPhone: "",
  });

  // Загрузка данных - только один раз
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const orgsSnapshot = await getDocs(collection(db, "organizations"));
      const orgsData = orgsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setOrganizations(orgsData);
    } catch (error) {
      console.error("Error loading data:", error);
      await logError(
        MODULES.LTDS,
        `Ошибка загрузки организаций: ${error.message}`
      );
    } finally {
      setLoading(false);
    }
  }, [logError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Валидация ИНН (9 цифр для МЧЖ)
  const validateInn = (inn, currentOrgId = null) => {
    if (!inn) {
      return { isValid: true, error: "" };
    }

    const innRegex = /^\d{9}$/;
    if (!innRegex.test(inn)) {
      return { isValid: false, error: "ИНН должен содержать 9 цифр" };
    }

    const existingOrg = organizations.find(
      (org) => org.inn === inn && org.id !== currentOrgId
    );

    if (existingOrg) {
      return {
        isValid: false,
        error: `Организация с ИНН ${inn} уже существует: "${existingOrg.name}"`,
      };
    }

    return { isValid: true, error: "" };
  };

  // Валидация ЖШШИР (14 цифр для ЯТТ)
  const validateJshshir = (jshshir, currentOrgId = null) => {
    if (!jshshir) {
      return { isValid: true, error: "" };
    }

    const jshshirRegex = /^\d{14}$/;
    if (!jshshirRegex.test(jshshir)) {
      return { isValid: false, error: "ЖШШИР должен содержать 14 цифр" };
    }

    const existingOrg = organizations.find(
      (org) => org.jshshir === jshshir && org.id !== currentOrgId
    );

    if (existingOrg) {
      return {
        isValid: false,
        error: `Организация с ЖШШИР ${jshshir} уже существует: "${existingOrg.name}"`,
      };
    }

    return { isValid: true, error: "" };
  };

  // Форматирование телефона
  const formatPhone = (phone) => {
    if (!phone) return phone;
    const cleaned = phone.replace(/\D/g, "");

    if (cleaned.length === 12 && cleaned.startsWith("998")) {
      return `+998 (${cleaned.substring(3, 5)}) ${cleaned.substring(
        5,
        8
      )}-${cleaned.substring(8, 10)}-${cleaned.substring(10, 12)}`;
    } else if (cleaned.length === 9) {
      return `+998 (${cleaned.substring(0, 2)}) ${cleaned.substring(
        2,
        5
      )}-${cleaned.substring(5, 7)}-${cleaned.substring(7, 9)}`;
    }
    return phone;
  };

  // Проверка заполнения формы
  const checkFormValidity = () => {
    const currentData = isCreating ? newOrganization : selectedOrganization;

    if (!currentData) return false;

    // Обязательные поля: название и тип
    if (!currentData.name || !currentData.name.trim()) return false;
    if (!currentData.type) return false;

    // Проверка в зависимости от типа
    if (currentData.type === "МЧЖ") {
      const innValidation = validateInn(
        currentData.inn,
        isCreating ? null : selectedOrganization?.id
      );
      if (!innValidation.isValid) return false;
    } else if (currentData.type === "ЯТТ") {
      const jshshirValidation = validateJshshir(
        currentData.jshshir,
        isCreating ? null : selectedOrganization?.id
      );
      if (!jshshirValidation.isValid) return false;
    }

    return true;
  };

  // Фильтрация организаций по поиску
  const filteredOrganizations = organizations.filter(
    (org) =>
      org.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      org.inn?.includes(searchTerm) ||
      org.jshshir?.includes(searchTerm) ||
      org.directorName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Обработчик изменения полей
  const handleInputChange = (field, value) => {
    let processedValue = value;

    // Форматирование телефона
    if ((field === "directorPhone" || field === "accountantPhone") && value) {
      processedValue = formatPhone(value);
    }

    if (isCreating) {
      setNewOrganization((prev) => ({ ...prev, [field]: processedValue }));
    } else {
      setSelectedOrganization((prev) => ({ ...prev, [field]: processedValue }));
    }

    // Валидация при изменении
    if (field === "inn") {
      const innValidation = validateInn(
        processedValue,
        isCreating ? null : selectedOrganization?.id
      );
      setInnError(innValidation.error);
    }

    if (field === "jshshir") {
      const jshshirValidation = validateJshshir(
        processedValue,
        isCreating ? null : selectedOrganization?.id
      );
      setJshshirError(jshshirValidation.error);
    }

    // При изменении типа очищаем ошибки
    if (field === "type") {
      setInnError("");
      setJshshirError("");
    }
  };

  // Открытие модального окна для просмотра
  const handleOrganizationClick = (org) => {
    setSelectedOrganization({ ...org });
    setIsModalOpen(true);
    setIsEditMode(false);
    setInnError("");
    setJshshirError("");
  };

  // Открытие модального окна для создания
  const handleCreateOrganization = () => {
    setIsCreating(true);
    setIsModalOpen(true);
    setNewOrganization({
      name: "",
      type: "",
      inn: "",
      jshshir: "",
      city: "",
      street: "",
      building: "",
      directorName: "",
      directorPhone: "",
      accountantName: "",
      accountantPhone: "",
    });
    setInnError("");
    setJshshirError("");
  };

  // Закрытие модального окна
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setIsEditMode(false);
    setIsCreating(false);
    setSelectedOrganization(null);
    setInnError("");
    setJshshirError("");
  };

  // Редактирование
  const handleEdit = () => {
    setIsEditMode(true);
  };

  // Сохранение
  const handleSave = async () => {
    const isValid = checkFormValidity();
    if (!isValid) return;

    try {
      if (isCreating) {
        const docRef = await addDoc(collection(db, "organizations"), {
          ...newOrganization,
          createdAt: new Date(),
        });

        await logCreate(
          MODULES.LTDS,
          `Создана организация: ${newOrganization.name}`,
          docRef.id,
          { name: newOrganization.name, type: newOrganization.type }
        );
      } else {
        await updateDoc(doc(db, "organizations", selectedOrganization.id), {
          ...selectedOrganization,
          updatedAt: new Date(),
        });

        await logUpdate(
          MODULES.LTDS,
          `Обновлена организация: ${selectedOrganization.name}`,
          selectedOrganization.id,
          { name: selectedOrganization.name, type: selectedOrganization.type }
        );
      }

      await loadData();
      handleCloseModal();
    } catch (error) {
      console.error("Error saving organization:", error);
      await logError(
        MODULES.LTDS,
        `Ошибка сохранения организации: ${error.message}`
      );
    }
  };

  // Отмена
  const handleCancel = () => {
    if (isCreating) {
      handleCloseModal();
    } else {
      setIsEditMode(false);
      const originalOrg = organizations.find(
        (org) => org.id === selectedOrganization.id
      );
      setSelectedOrganization(originalOrg ? { ...originalOrg } : null);
    }
    setInnError("");
    setJshshirError("");
  };

  const isFormValid = checkFormValidity();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center">
        <motion.div
          className="w-12 h-12 border-4 border-teal-200 border-t-teal-600 rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 p-4 lg:p-8">
      {/* Заголовок */}
      <motion.div
        className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-800 mb-2">
            {language === "uz" ? "МЧЖ ва ЯТТлар" : "Организации"}
          </h1>
          <p className="text-gray-600">
            {language === "uz"
              ? "Юридик шахслар ва ташкилотларни бошқариш"
              : "Управление юридическими лицами и организациями"}
          </p>
        </div>

        <motion.button
          className="bg-gradient-to-r from-red-500 to-pink-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2 w-full lg:w-auto justify-center"
          onClick={handleCreateOrganization}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Plus size={20} />
          {language === "uz" ? "Ташкилот қўшиш" : "Добавить организацию"}
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
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-300"
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
              <tr className="bg-gradient-to-r from-teal-500 to-emerald-600 text-white">
                <th className="px-4 py-4 text-left font-semibold">
                  {language === "uz" ? "Ташкилот" : "Организация"}
                </th>
                <th className="px-4 py-4 text-left font-semibold">
                  {language === "uz" ? "Тури" : "Тип"}
                </th>
                <th className="px-4 py-4 text-left font-semibold hidden md:table-cell">
                  {language === "uz" ? "ИНН / ЖШШИР" : "ИНН / ЖШШИР"}
                </th>
                <th className="px-4 py-4 text-left font-semibold">
                  {language === "uz" ? "Директор" : "Директор"}
                </th>
                <th className="px-4 py-4 text-left font-semibold hidden sm:table-cell">
                  {language === "uz" ? "Телефон" : "Телефон"}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredOrganizations.map((org, index) => (
                <motion.tr
                  key={org.id}
                  onClick={() => handleOrganizationClick(org)}
                  className="hover:bg-teal-50 transition-colors duration-200 cursor-pointer group"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  whileHover={{ scale: 1.01 }}
                >
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center group-hover:bg-teal-200 transition-colors">
                        <Building className="text-teal-600" size={20} />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-800">
                          {org.name}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        org.type === "МЧЖ"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-green-100 text-green-800"
                      }`}
                    >
                      {org.type}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-gray-600 hidden md:table-cell">
                    {org.type === "МЧЖ" ? org.inn : org.jshshir}
                  </td>
                  <td className="px-4 py-4">
                    <div className="font-medium text-gray-800">
                      {org.directorName || "-"}
                    </div>
                    <div className="text-sm text-gray-500 sm:hidden">
                      {org.directorPhone || "-"}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-gray-600 hidden sm:table-cell">
                    {org.directorPhone || "-"}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredOrganizations.length === 0 && (
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
                  ? "Ташкилотлар топилмади"
                  : "Организации не найдены"
                : language === "uz"
                ? "Ташкилотлар қўшилмаган"
                : "Организации не добавлены"}
            </h3>
            {!searchTerm && (
              <button
                onClick={handleCreateOrganization}
                className="bg-teal-500 text-white px-6 py-2 rounded-lg hover:bg-teal-600 transition-colors"
              >
                {language === "uz" ? "Ташкилот қўшиш" : "Добавить организацию"}
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
              className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Заголовок */}
              <div className="bg-gradient-to-r from-teal-500 to-emerald-600 text-white p-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold">
                    {isCreating
                      ? language === "uz"
                        ? "Ташкилот яратиш"
                        : "Создание организации"
                      : isEditMode
                      ? language === "uz"
                        ? "Ташкилотни таҳрирлаш"
                        : "Редактирование организации"
                      : language === "uz"
                      ? "Ташкилот ҳақида маълумот"
                      : "Информация об организации"}
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
                  {/* Основная информация */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                        <Building size={16} />
                        {language === "uz"
                          ? "Ташкилот номи"
                          : "Наименование организации"}{" "}
                        *
                      </label>
                      <input
                        type="text"
                        value={
                          isCreating
                            ? newOrganization.name
                            : selectedOrganization?.name || ""
                        }
                        onChange={(e) =>
                          handleInputChange("name", e.target.value)
                        }
                        disabled={!isCreating && !isEditMode}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all disabled:bg-gray-50 disabled:text-gray-500"
                        placeholder={
                          language === "uz"
                            ? "Ташкилот номини киритинг"
                            : "Введите название организации"
                        }
                      />
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                        <FileText size={16} />
                        {language === "uz" ? "Тури" : "Тип"} *
                      </label>
                      <select
                        value={
                          isCreating
                            ? newOrganization.type
                            : selectedOrganization?.type || ""
                        }
                        onChange={(e) =>
                          handleInputChange("type", e.target.value)
                        }
                        disabled={!isCreating && !isEditMode}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all disabled:bg-gray-50 disabled:text-gray-500"
                      >
                        <option value="">
                          {language === "uz"
                            ? "Турини танланг"
                            : "Выберите тип"}
                        </option>
                        <option value="МЧЖ">МЧЖ</option>
                        <option value="ЯТТ">ЯТТ</option>
                      </select>
                    </div>
                  </div>

                  {/* Условные поля */}
                  {(isCreating
                    ? newOrganization.type
                    : selectedOrganization?.type) === "МЧЖ" && (
                    <div>
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                        <FileText size={16} />
                        {language === "uz" ? "ИНН" : "ИНН"} *
                      </label>
                      <input
                        type="text"
                        value={
                          isCreating
                            ? newOrganization.inn
                            : selectedOrganization?.inn || ""
                        }
                        onChange={(e) =>
                          handleInputChange("inn", e.target.value)
                        }
                        disabled={!isCreating && !isEditMode}
                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:border-transparent transition-all disabled:bg-gray-50 disabled:text-gray-500 ${
                          innError
                            ? "border-red-300 focus:ring-red-500"
                            : "border-gray-200 focus:ring-teal-500"
                        }`}
                        placeholder="9 цифр"
                        maxLength={9}
                      />
                      {innError && (
                        <div className="flex items-center gap-2 text-red-600 text-sm mt-2">
                          <AlertCircle size={16} />
                          {innError}
                        </div>
                      )}
                    </div>
                  )}

                  {(isCreating
                    ? newOrganization.type
                    : selectedOrganization?.type) === "ЯТТ" && (
                    <div>
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                        <FileText size={16} />
                        {language === "uz" ? "ЖШШИР" : "ЖШШИР"} *
                      </label>
                      <input
                        type="text"
                        value={
                          isCreating
                            ? newOrganization.jshshir
                            : selectedOrganization?.jshshir || ""
                        }
                        onChange={(e) =>
                          handleInputChange("jshshir", e.target.value)
                        }
                        disabled={!isCreating && !isEditMode}
                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:border-transparent transition-all disabled:bg-gray-50 disabled:text-gray-500 ${
                          jshshirError
                            ? "border-red-300 focus:ring-red-500"
                            : "border-gray-200 focus:ring-teal-500"
                        }`}
                        placeholder="14 цифр"
                        maxLength={14}
                      />
                      {jshshirError && (
                        <div className="flex items-center gap-2 text-red-600 text-sm mt-2">
                          <AlertCircle size={16} />
                          {jshshirError}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Адрес (необязательно) */}
                  <div className="border-t pt-6">
                    <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-800 mb-4">
                      <MapPin size={18} />
                      {language === "uz"
                        ? "Ташкилот манзили"
                        : "Адрес организации"}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {language === "uz" ? "Шаҳар" : "Город"}
                        </label>
                        <input
                          type="text"
                          value={
                            isCreating
                              ? newOrganization.city
                              : selectedOrganization?.city || ""
                          }
                          onChange={(e) =>
                            handleInputChange("city", e.target.value)
                          }
                          disabled={!isCreating && !isEditMode}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all disabled:bg-gray-50 disabled:text-gray-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {language === "uz" ? "Кўча" : "Улица"}
                        </label>
                        <input
                          type="text"
                          value={
                            isCreating
                              ? newOrganization.street
                              : selectedOrganization?.street || ""
                          }
                          onChange={(e) =>
                            handleInputChange("street", e.target.value)
                          }
                          disabled={!isCreating && !isEditMode}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all disabled:bg-gray-50 disabled:text-gray-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {language === "uz" ? "Уй" : "Дом"}
                        </label>
                        <input
                          type="text"
                          value={
                            isCreating
                              ? newOrganization.building
                              : selectedOrganization?.building || ""
                          }
                          onChange={(e) =>
                            handleInputChange("building", e.target.value)
                          }
                          disabled={!isCreating && !isEditMode}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all disabled:bg-gray-50 disabled:text-gray-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Руководство (необязательно) */}
                  <div className="border-t pt-6">
                    <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-800 mb-4">
                      <Users size={18} />
                      {language === "uz" ? "Раҳбарият" : "Руководство"}
                    </h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h4 className="font-semibold text-gray-700 flex items-center gap-2">
                          <User size={16} />
                          {language === "uz" ? "Директор" : "Директор"}
                        </h4>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {language === "uz"
                              ? "Директор ФИО"
                              : "ФИО директора"}
                          </label>
                          <input
                            type="text"
                            value={
                              isCreating
                                ? newOrganization.directorName
                                : selectedOrganization?.directorName || ""
                            }
                            onChange={(e) =>
                              handleInputChange("directorName", e.target.value)
                            }
                            disabled={!isCreating && !isEditMode}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all disabled:bg-gray-50 disabled:text-gray-500"
                          />
                        </div>
                        <div>
                          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                            <Phone size={16} />
                            {language === "uz"
                              ? "Директор тел."
                              : "Тел. директора"}
                          </label>
                          <input
                            type="tel"
                            value={
                              isCreating
                                ? newOrganization.directorPhone
                                : selectedOrganization?.directorPhone || ""
                            }
                            onChange={(e) =>
                              handleInputChange("directorPhone", e.target.value)
                            }
                            disabled={!isCreating && !isEditMode}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all disabled:bg-gray-50 disabled:text-gray-500"
                            placeholder="+998-XX-XXX-XX-XX"
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="font-semibold text-gray-700 flex items-center gap-2">
                          <User size={16} />
                          {language === "uz" ? "Бухгалтер" : "Бухгалтер"}
                        </h4>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {language === "uz"
                              ? "Бухгалтер ФИО"
                              : "ФИО бухгалтера"}
                          </label>
                          <input
                            type="text"
                            value={
                              isCreating
                                ? newOrganization.accountantName
                                : selectedOrganization?.accountantName || ""
                            }
                            onChange={(e) =>
                              handleInputChange(
                                "accountantName",
                                e.target.value
                              )
                            }
                            disabled={!isCreating && !isEditMode}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all disabled:bg-gray-50 disabled:text-gray-500"
                          />
                        </div>
                        <div>
                          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                            <Phone size={16} />
                            {language === "uz"
                              ? "Бухгалтер тел."
                              : "Тел. бухгалтера"}
                          </label>
                          <input
                            type="tel"
                            value={
                              isCreating
                                ? newOrganization.accountantPhone
                                : selectedOrganization?.accountantPhone || ""
                            }
                            onChange={(e) =>
                              handleInputChange(
                                "accountantPhone",
                                e.target.value
                              )
                            }
                            disabled={!isCreating && !isEditMode}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all disabled:bg-gray-50 disabled:text-gray-500"
                            placeholder="+998-XX-XXX-XX-XX"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Индикатор */}
                  {(isCreating || isEditMode) && (
                    <div className="border-t pt-6">
                      <div className="flex items-center gap-2 text-sm">
                        {isFormValid ? (
                          <>
                            <CheckCircle className="text-green-500" size={16} />
                            <span className="text-green-600">
                              {language === "uz"
                                ? "Барча мажбурий қаторлар тўлдирилди"
                                : "Все обязательные поля заполнены корректно"}
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

              {/* Кнопки */}
              <div className="border-t px-6 py-4 bg-gray-50">
                <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
                  {!isCreating && !isEditMode && (
                    <motion.button
                      onClick={handleEdit}
                      className="w-full sm:w-auto bg-teal-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-teal-600 transition-colors flex items-center gap-2 justify-center"
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

export default Ltds;
