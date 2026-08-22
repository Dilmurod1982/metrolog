// src/pages/Objects/Objects.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
} from "firebase/firestore";
import { db, storage } from "../../firebase/config";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  X,
  Edit,
  Save,
  Search,
  Factory,
  Gauge,
  Building,
  FileText,
  Upload,
  Download,
  CheckCircle,
  AlertCircle,
  Paperclip,
  MapPin,
} from "lucide-react";
import { useAppStore } from "../../lib/zustand";
import { translations } from "../../lib/i18n";
import { useLogger } from "../../hooks/useLogger";
import { MODULES } from "../../services/logger";
import { toast } from "react-hot-toast";

const Objects = () => {
  const { language } = useAppStore();
  const { logCreate, logUpdate, logError } = useLogger();

  const [objects, setObjects] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [objectTypes, setObjectTypes] = useState([]);
  const [regions, setRegions] = useState([]);
  const [cities, setCities] = useState([]);
  const [filteredCities, setFilteredCities] = useState([]);
  const [selectedObject, setSelectedObject] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [saving, setSaving] = useState(false);

  // Данные для нового объекта
  const [newObject, setNewObject] = useState({
    billingAccount: "",
    organizationId: "",
    organizationName: "",
    regionId: "",
    regionName: "",
    cityId: "",
    cityName: "",
    cityType: "",
    objectName: "",
    objectTypeId: "",
    objectTypeName: "",
  });

  // Загрузка данных
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Загрузка объектов
      const objectsSnapshot = await getDocs(collection(db, "objects"));
      const objectsData = objectsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setObjects(objectsData);

      // Загрузка организаций
      const orgsSnapshot = await getDocs(collection(db, "organizations"));
      const orgsData = orgsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setOrganizations(orgsData);

      // Загрузка типов объектов
      const objectTypesSnapshot = await getDocs(collection(db, "objectTypes"));
      const objectTypesData = objectTypesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setObjectTypes(objectTypesData);

      // Загрузка областей
      const regionsSnapshot = await getDocs(collection(db, "regions"));
      const regionsData = regionsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setRegions(regionsData);

      // Загрузка городов
      const citiesSnapshot = await getDocs(collection(db, "cities"));
      const citiesData = citiesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setCities(citiesData);
    } catch (error) {
      console.error("Error loading data:", error);
      await logError(
        MODULES.OBJECTS,
        `Объектларни юклашда хатолик: ${error.message}`
      );
    } finally {
      setLoading(false);
    }
  }, [logError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Проверка формы
  const checkFormValidity = () => {
    const currentData = isCreating ? newObject : selectedObject;
    if (!currentData) return false;

    const requiredFields = [
      "billingAccount",
      "organizationId",
      "regionId",
      "cityId",
      "objectName",
      "objectTypeId",
    ];

    return requiredFields.every(
      (field) =>
        currentData[field] && currentData[field].toString().trim() !== ""
    );
  };

  // Фильтрация
  const filteredObjects = objects.filter(
    (obj) =>
      obj.billingAccount?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      obj.objectName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      obj.organizationName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      obj.regionName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      obj.cityName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Обработчики
  const handleInputChange = (field, value) => {
    if (isCreating) {
      setNewObject((prev) => ({ ...prev, [field]: value }));
    } else {
      setSelectedObject((prev) => ({ ...prev, [field]: value }));
    }
  };

  const handleOrganizationChange = (orgId) => {
    const org = organizations.find((o) => o.id === orgId);
    if (org) {
      handleInputChange("organizationId", org.id);
      handleInputChange("organizationName", org.name);
    }
  };

  // Обработчик выбора области
  const handleRegionChange = (regionId) => {
    const region = regions.find((r) => r.id === regionId);
    if (region) {
      handleInputChange("regionId", region.id);
      handleInputChange("regionName", region.name);
      handleInputChange("cityId", "");
      handleInputChange("cityName", "");
      handleInputChange("cityType", "");
      const citiesInRegion = cities.filter(
        (city) => city.regionId === regionId
      );
      setFilteredCities(citiesInRegion);
    } else {
      handleInputChange("regionId", "");
      handleInputChange("regionName", "");
      handleInputChange("cityId", "");
      handleInputChange("cityName", "");
      handleInputChange("cityType", "");
      setFilteredCities([]);
    }
  };

  // Обработчик выбора города
  const handleCityChange = (cityId) => {
    const city = cities.find((c) => c.id === cityId);
    if (city) {
      handleInputChange("cityId", city.id);
      handleInputChange("cityName", city.name);
      handleInputChange("cityType", city.type);
    }
  };

  const handleObjectTypeChange = (typeId) => {
    const type = objectTypes.find((t) => t.id === typeId);
    if (type) {
      handleInputChange("objectTypeId", type.id);
      handleInputChange("objectTypeName", type.name);
    }
  };

  // Открытие/закрытие модального окна
  const handleObjectClick = (obj) => {
    setSelectedObject({ ...obj });
    setIsModalOpen(true);
    setIsEditMode(false);
    if (obj.regionId) {
      const citiesInRegion = cities.filter(
        (city) => city.regionId === obj.regionId
      );
      setFilteredCities(citiesInRegion);
    }
  };

  const handleCreateObject = () => {
    setIsCreating(true);
    setIsModalOpen(true);
    setNewObject({
      billingAccount: "",
      organizationId: "",
      organizationName: "",
      regionId: "",
      regionName: "",
      cityId: "",
      cityName: "",
      cityType: "",
      objectName: "",
      objectTypeId: "",
      objectTypeName: "",
    });
    setFilteredCities([]);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setIsEditMode(false);
    setIsCreating(false);
    setSelectedObject(null);
    setFilteredCities([]);
  };

  const handleEdit = () => {
    setIsEditMode(true);
  };

  // Сохранение
  const handleSave = async () => {
    const isValid = checkFormValidity();
    if (!isValid) {
      toast.error("Барча мажбурий қаторларни тўлдиринг");
      return;
    }

    setSaving(true);
    try {
      if (isCreating) {
        const docRef = await addDoc(collection(db, "objects"), {
          ...newObject,
          createdAt: new Date(),
        });
        await logCreate(
          MODULES.OBJECTS,
          `Объект яратилди: ${newObject.objectName}`,
          docRef.id
        );
      } else {
        await updateDoc(doc(db, "objects", selectedObject.id), {
          ...selectedObject,
          updatedAt: new Date(),
        });
        await logUpdate(
          MODULES.OBJECTS,
          `Объект янгиланди: ${selectedObject.objectName}`,
          selectedObject.id
        );
      }

      await loadData();
      handleCloseModal();
      toast.success("Муваффақиятли сақланди");
    } catch (error) {
      console.error("Error saving object:", error);
      await logError(
        MODULES.OBJECTS,
        `Объектни сақлашда хатолик: ${error.message}`
      );
      toast.error("Сақлашда хатолик");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (isCreating) {
      handleCloseModal();
    } else {
      setIsEditMode(false);
      const originalObj = objects.find((obj) => obj.id === selectedObject.id);
      setSelectedObject(originalObj ? { ...originalObj } : null);
    }
  };

  const isFormValid = checkFormValidity();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 flex items-center justify-center">
        <motion.div
          className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 p-4 lg:p-8">
      {/* Заголовок */}
      <motion.div
        className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-800 mb-2">
            Объектлар
          </h1>
          <p className="text-gray-600">Метрология объектларини бошқариш</p>
        </div>

        <motion.button
          className="bg-gradient-to-r from-indigo-500 to-blue-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2 w-full lg:w-auto justify-center"
          onClick={handleCreateObject}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Plus size={20} />
          Объект қўшиш
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
            placeholder="Қидириш..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300"
          />
        </div>
      </motion.div>

      {/* Таблица объектов */}
      <motion.div
        className="bg-white rounded-2xl shadow-sm overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-indigo-500 to-blue-600 text-white">
                <th className="px-4 py-4 text-left font-semibold w-16">№</th>
                <th className="px-4 py-4 text-left font-semibold">
                  Лицевой счет
                </th>
                <th className="px-4 py-4 text-left font-semibold">
                  Объект / МЧЖ
                </th>
                <th className="px-4 py-4 text-left font-semibold hidden lg:table-cell">
                  Ҳудуд
                </th>
                <th className="px-4 py-4 text-left font-semibold hidden md:table-cell">
                  Объект тури
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredObjects.map((obj, index) => (
                <motion.tr
                  key={obj.id}
                  onClick={() => handleObjectClick(obj)}
                  className="hover:bg-indigo-50 transition-colors duration-200 cursor-pointer group"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  whileHover={{ scale: 1.01 }}
                >
                  <td className="px-4 py-4 text-gray-600">{index + 1}</td>
                  <td className="px-4 py-4">
                    <div className="font-mono font-medium text-gray-800">
                      {obj.billingAccount || "-"}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div>
                      <div className="font-semibold text-gray-800">
                        {obj.objectName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {obj.organizationName}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 hidden lg:table-cell">
                    <div className="text-sm">
                      <div className="font-medium text-gray-700">
                        {obj.regionName}
                      </div>
                      <div className="text-gray-500">
                        {obj.cityName}{" "}
                        {obj.cityType === "Шаҳар" || obj.cityType === "Город"
                          ? "шаҳар"
                          : obj.cityType === "Туман" || obj.cityType === "Район"
                          ? "тумани"
                          : ""}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 hidden md:table-cell">
                    <span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm">
                      {obj.objectTypeName || "-"}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredObjects.length === 0 && (
          <motion.div
            className="text-center py-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
          >
            <Factory className="mx-auto text-gray-400 mb-4" size={48} />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">
              {searchTerm ? "Объектлар топилмади" : "Объектлар қўшилмаган"}
            </h3>
            {!searchTerm && (
              <button
                onClick={handleCreateObject}
                className="bg-indigo-500 text-white px-6 py-2 rounded-lg hover:bg-indigo-600 transition-colors"
              >
                Объект қўшиш
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
              className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Заголовок */}
              <div className="bg-gradient-to-r from-indigo-500 to-blue-600 text-white p-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold">
                    {isCreating
                      ? "Объект қўшиш"
                      : isEditMode
                      ? "Объектни таҳрирлаш"
                      : "Объект ҳақида маълумот"}
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
                  {/* Лицевой счет */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                      <FileText size={16} />
                      Биллингдаги лицевой рақами *
                    </label>
                    <input
                      type="text"
                      value={
                        isCreating
                          ? newObject.billingAccount
                          : selectedObject?.billingAccount || ""
                      }
                      onChange={(e) =>
                        handleInputChange("billingAccount", e.target.value)
                      }
                      disabled={!isCreating && !isEditMode}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:bg-gray-50 disabled:text-gray-500"
                      placeholder="Лицевой рақамни киритинг"
                    />
                  </div>

                  {/* Организация и регион */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                        <Building size={16} />
                        МЧЖ / ЯТТ *
                      </label>
                      <select
                        value={
                          isCreating
                            ? newObject.organizationId
                            : selectedObject?.organizationId || ""
                        }
                        onChange={(e) =>
                          handleOrganizationChange(e.target.value)
                        }
                        disabled={!isCreating && !isEditMode}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:bg-gray-50 disabled:text-gray-500"
                      >
                        <option value="">Танланг...</option>
                        {organizations.map((org) => (
                          <option key={org.id} value={org.id}>
                            {org.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                        <MapPin size={16} />
                        Вилоят *
                      </label>
                      <select
                        value={
                          isCreating
                            ? newObject.regionId
                            : selectedObject?.regionId || ""
                        }
                        onChange={(e) => handleRegionChange(e.target.value)}
                        disabled={!isCreating && !isEditMode}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:bg-gray-50 disabled:text-gray-500"
                      >
                        <option value="">Танланг...</option>
                        {regions.map((region) => (
                          <option key={region.id} value={region.id}>
                            {region.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Город и объект */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                        <MapPin size={16} />
                        Туман/Шаҳар *
                      </label>
                      <select
                        value={
                          isCreating
                            ? newObject.cityId
                            : selectedObject?.cityId || ""
                        }
                        onChange={(e) => handleCityChange(e.target.value)}
                        disabled={
                          (!isCreating && !isEditMode) ||
                          !(isCreating
                            ? newObject.regionId
                            : selectedObject?.regionId)
                        }
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:bg-gray-50 disabled:text-gray-500"
                      >
                        <option value="">
                          {isCreating
                            ? newObject.regionId
                              ? "Танланг..."
                              : "Аввал вилоятни танланг"
                            : selectedObject?.regionId
                            ? "Танланг..."
                            : "Аввал вилоятни танланг"}
                        </option>
                        {filteredCities.map((city) => (
                          <option key={city.id} value={city.id}>
                            {city.name}{" "}
                            {city.type === "Шаҳар" || city.type === "Город"
                              ? "шаҳар"
                              : city.type === "Туман" || city.type === "Район"
                              ? "тумани"
                              : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                        <Factory size={16} />
                        Объект номи *
                      </label>
                      <input
                        type="text"
                        value={
                          isCreating
                            ? newObject.objectName
                            : selectedObject?.objectName || ""
                        }
                        onChange={(e) =>
                          handleInputChange("objectName", e.target.value)
                        }
                        disabled={!isCreating && !isEditMode}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:bg-gray-50 disabled:text-gray-500"
                        placeholder="Объект номини киритинг"
                      />
                    </div>
                  </div>

                  {/* Тип объекта */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                      <Factory size={16} />
                      Объект тури *
                    </label>
                    <select
                      value={
                        isCreating
                          ? newObject.objectTypeId
                          : selectedObject?.objectTypeId || ""
                      }
                      onChange={(e) => handleObjectTypeChange(e.target.value)}
                      disabled={!isCreating && !isEditMode}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:bg-gray-50 disabled:text-gray-500"
                    >
                      <option value="">Танланг...</option>
                      {objectTypes.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Индикатор */}
                  {(isCreating || isEditMode) && (
                    <div className="border-t pt-6">
                      <div className="flex items-center gap-2 text-sm">
                        {isFormValid ? (
                          <>
                            <CheckCircle className="text-green-500" size={16} />
                            <span className="text-green-600">
                              Барча мажбурий қаторлар тўлдирилди
                            </span>
                          </>
                        ) : (
                          <>
                            <AlertCircle
                              className="text-orange-500"
                              size={16}
                            />
                            <span className="text-orange-600">
                              Барча мажбурий қаторлар тўлдиринг (*)
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
                      className="w-full sm:w-auto bg-indigo-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-600 transition-colors flex items-center gap-2 justify-center"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Edit size={16} />
                      Таҳрирлаш
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
                        Бекор
                      </motion.button>
                      <motion.button
                        onClick={handleSave}
                        disabled={saving || !isFormValid}
                        className={`px-6 py-3 rounded-xl font-semibold transition-colors flex items-center gap-2 justify-center ${
                          saving || !isFormValid
                            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                            : "bg-green-500 text-white hover:bg-green-600 cursor-pointer"
                        }`}
                        whileHover={!saving ? { scale: 1.02 } : {}}
                        whileTap={!saving ? { scale: 0.98 } : {}}
                      >
                        {saving ? (
                          <motion.div
                            className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                            animate={{ rotate: 360 }}
                            transition={{
                              duration: 1,
                              repeat: Infinity,
                              ease: "linear",
                            }}
                          />
                        ) : (
                          <Save size={16} />
                        )}
                        Сақлаш
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
                      Ёпиш
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

export default Objects;
