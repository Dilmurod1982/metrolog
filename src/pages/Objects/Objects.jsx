// src/pages/Objects/Objects.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
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
  Gauge,
  Building,
  FileText,
  CheckCircle,
  AlertCircle,
  MapPin,
  Shield,
  Calendar,
  Hash,
} from "lucide-react";
import { useAppStore } from "../../lib/zustand";
import { translations } from "../../lib/i18n";
import { useLogger } from "../../hooks/useLogger";
import { MODULES } from "../../services/logger";
import { toast } from "react-hot-toast";
import AddMeterModal from "../../components/Objects/AddMeterModal";
import AddPlombModal from "../../components/Plombalar/AddPlombModal";

const Objects = () => {
  const { language, userData } = useAppStore();
  const { logCreate, logUpdate, logError } = useLogger();

  const [objects, setObjects] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [objectTypes, setObjectTypes] = useState([]);
  const [regions, setRegions] = useState([]);
  const [cities, setCities] = useState([]);
  const [meters, setMeters] = useState([]);
  const [plombs, setPlombs] = useState([]);
  const [filteredCities, setFilteredCities] = useState([]);
  const [selectedObject, setSelectedObject] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState("main"); // "main" | "meters"
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [saving, setSaving] = useState(false);

  // Модальные окна
  const [isAddMeterOpen, setIsAddMeterOpen] = useState(false);
  const [isAddPlombOpen, setIsAddPlombOpen] = useState(false);
  const [selectedMeter, setSelectedMeter] = useState(null);

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

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        objectsSnap,
        orgsSnap,
        typesSnap,
        regionsSnap,
        citiesSnap,
        metersSnap,
        plombsSnap,
      ] = await Promise.all([
        getDocs(collection(db, "objects")),
        getDocs(collection(db, "organizations")),
        getDocs(collection(db, "objectTypes")),
        getDocs(collection(db, "regions")),
        getDocs(collection(db, "cities")),
        getDocs(collection(db, "meters")),
        getDocs(collection(db, "plombs")),
      ]);

      setObjects(
        objectsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      );
      setOrganizations(
        orgsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      );
      setObjectTypes(
        typesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      );
      setRegions(
        regionsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      );
      setCities(citiesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      setMeters(metersSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      setPlombs(plombsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error("Error loading data:", error);
      await logError(
        MODULES.OBJECTS,
        `Маълумотларни юклашда хатолик: ${error.message}`
      );
    } finally {
      setLoading(false);
    }
  }, [logError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  const filteredObjects = objects.filter(
    (obj) =>
      obj.billingAccount?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      obj.objectName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      obj.organizationName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      obj.regionName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      obj.cityName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  const handleObjectClick = (obj) => {
    setSelectedObject({ ...obj });
    setIsModalOpen(true);
    setIsEditMode(false);
    setIsCreating(false);
    setActiveTab("main");
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
    setIsEditMode(false);
    setActiveTab("main");
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
    setActiveTab("main");
  };

  const handleEdit = () => {
    setIsEditMode(true);
  };

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
          createdBy: userData?.email || "",
        });
        await logCreate(
          MODULES.OBJECTS,
          `Объект яратилди: ${newObject.objectName}`,
          docRef.id
        );
        toast.success("Объект муваффақиятли яратилди");
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
        toast.success("Объект муваффақиятли янгиланди");
      }

      await loadData();
      handleCloseModal();
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

  // Получить счётчики для объекта
  const getObjectMeters = (objectId) => {
    return meters.filter((m) => m.objectId === objectId);
  };

  // Получить пломбы для счётчика
  const getMeterPlombs = (meterId) => {
    return plombs.filter((p) => p.meterId === meterId);
  };

  // Получить активный счётчик объекта
  const getActiveMeter = (objectId) => {
    return meters.find((m) => m.objectId === objectId && !m.installedTo);
  };

  // Открыть модальное окно добавления счётчика
  const handleAddMeter = () => {
    setSelectedMeter(null);
    setIsAddMeterOpen(true);
  };

  // Открыть модальное окно установки пломбы
  const handleAddPlomb = (meter) => {
    setSelectedMeter(meter);
    setIsAddPlombOpen(true);
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
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
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
      </div>

      {/* Поиск */}
      <div className="bg-white rounded-2xl shadow-sm p-4 mb-6">
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
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Таблица объектов */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
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
                  Ҳисоблагич
                </th>
                <th className="px-4 py-4 text-left font-semibold hidden xl:table-cell">
                  Пломбалар
                </th>
                <th className="px-4 py-4 text-left font-semibold w-20">
                  Амаллар
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredObjects.map((obj, index) => {
                const activeMeter = getActiveMeter(obj.id);
                const objectPlombs = plombs.filter(
                  (p) => p.objectId === obj.id
                );
                return (
                  <motion.tr
                    key={obj.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.05 }}
                    className="hover:bg-indigo-50 transition-colors group"
                  >
                    <td
                      className="px-4 py-4 text-gray-600 cursor-pointer"
                      onClick={() => handleObjectClick(obj)}
                    >
                      {index + 1}
                    </td>
                    <td
                      className="px-4 py-4 cursor-pointer"
                      onClick={() => handleObjectClick(obj)}
                    >
                      <div className="font-mono font-medium text-gray-800">
                        {obj.billingAccount || "-"}
                      </div>
                    </td>
                    <td
                      className="px-4 py-4 cursor-pointer"
                      onClick={() => handleObjectClick(obj)}
                    >
                      <div>
                        <div className="font-semibold text-gray-800">
                          {obj.objectName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {obj.organizationName}
                        </div>
                      </div>
                    </td>
                    <td
                      className="px-4 py-4 hidden lg:table-cell cursor-pointer"
                      onClick={() => handleObjectClick(obj)}
                    >
                      <div className="text-sm">
                        <div className="font-medium text-gray-700">
                          {obj.regionName}
                        </div>
                        <div className="text-gray-500">
                          {obj.cityName}{" "}
                          {obj.cityType === "Шаҳар" || obj.cityType === "Город"
                            ? "шаҳар"
                            : obj.cityType === "Туман" ||
                              obj.cityType === "Район"
                            ? "тумани"
                            : ""}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell">
                      {activeMeter ? (
                        <div className="text-sm">
                          <div className="flex items-center gap-1 text-green-700 font-medium">
                            <Gauge size={14} />
                            {activeMeter.meterTypeName}
                          </div>
                          <div className="text-xs text-gray-500 font-mono">
                            № {activeMeter.serialNumber}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">Йўқ</span>
                      )}
                    </td>
                    <td className="px-4 py-4 hidden xl:table-cell">
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                          objectPlombs.length > 0
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        <Shield size={12} />
                        {objectPlombs.length} та
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {/* Кнопка прикрепить пломбу */}
                      <motion.button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!activeMeter) {
                            toast.error("Аввал объектга ҳисоблагич ўрнатинг");
                            return;
                          }
                          handleAddPlomb({
                            ...activeMeter,
                            objectId: obj.id,
                            objectName: obj.objectName,
                          });
                        }}
                        className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                        title="Пломба ўрнатиш"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <Shield size={16} />
                      </motion.button>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredObjects.length === 0 && (
          <div className="text-center py-12">
            <Factory className="mx-auto text-gray-400 mb-4" size={48} />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">
              {searchTerm ? "Объектлар топилмади" : "Объектлар қўшилмаган"}
            </h3>
            {!searchTerm && (
              <button
                onClick={handleCreateObject}
                className="bg-indigo-500 text-white px-6 py-2 rounded-lg hover:bg-indigo-600"
              >
                Объект қўшиш
              </button>
            )}
          </div>
        )}
      </div>

      {/* Модальное окно объекта */}
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
              <div className="bg-gradient-to-r from-indigo-500 to-blue-600 text-white p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold">
                    {isCreating
                      ? "Объект қўшиш"
                      : isEditMode
                      ? "Объектни таҳрирлаш"
                      : "Объект ҳақида маълумот"}
                  </h2>
                  <motion.button
                    onClick={handleCloseModal}
                    className="w-8 h-8 rounded-full bg-white bg-opacity-20 flex items-center justify-center hover:bg-opacity-30"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <X size={18} />
                  </motion.button>
                </div>

                {/* Табы */}
                {!isCreating && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setActiveTab("main")}
                      className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                        activeTab === "main"
                          ? "bg-white text-indigo-600"
                          : "bg-white bg-opacity-20 text-white hover:bg-opacity-30"
                      }`}
                    >
                      <Factory size={16} />
                      Асосий маълумот
                    </button>
                    <button
                      onClick={() => setActiveTab("meters")}
                      className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                        activeTab === "meters"
                          ? "bg-white text-indigo-600"
                          : "bg-white bg-opacity-20 text-white hover:bg-opacity-30"
                      }`}
                    >
                      <Gauge size={16} />
                      Ҳисоблагич
                      {getObjectMeters(selectedObject?.id).length > 0 && (
                        <span className="bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                          {getObjectMeters(selectedObject?.id).length}
                        </span>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Содержимое */}
              <div className="p-6 max-h-[60vh] overflow-y-auto">
                {activeTab === "main" && (
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
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50"
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
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50"
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
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50"
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
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50"
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
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50"
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
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50"
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
                              <CheckCircle
                                className="text-green-500"
                                size={16}
                              />
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
                )}

                {activeTab === "meters" && !isCreating && (
                  <MetersTabContent
                    objectId={selectedObject?.id}
                    objectName={selectedObject?.objectName}
                    meters={getObjectMeters(selectedObject?.id)}
                    plombs={plombs}
                    onAddMeter={handleAddMeter}
                    onAddPlomb={handleAddPlomb}
                    onRefresh={loadData}
                  />
                )}
              </div>

              {/* Кнопки */}
              <div className="border-t px-6 py-4 bg-gray-50">
                <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
                  {!isCreating && !isEditMode && activeTab === "main" && (
                    <motion.button
                      onClick={handleEdit}
                      className="w-full sm:w-auto bg-indigo-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-600 flex items-center gap-2 justify-center"
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
                        className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-100"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        Бекор
                      </motion.button>
                      <motion.button
                        onClick={handleSave}
                        disabled={saving || !isFormValid}
                        className={`px-6 py-3 rounded-xl font-semibold flex items-center gap-2 justify-center ${
                          saving || !isFormValid
                            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                            : "bg-green-500 text-white hover:bg-green-600"
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
                      className="w-full sm:w-auto px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-100"
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

      {/* Модальные окна */}
      <AddMeterModal
        isOpen={isAddMeterOpen}
        onClose={() => setIsAddMeterOpen(false)}
        objectId={selectedObject?.id}
        objectName={selectedObject?.objectName}
        onAdded={loadData}
      />

      <AddPlombModal
        isOpen={isAddPlombOpen}
        onClose={() => setIsAddPlombOpen(false)}
        meter={selectedMeter}
        object={selectedObject}
        onAdded={loadData}
        fromObjects={true}
      />
    </div>
  );
};

// Компонент вкладки "Ҳисоблагич"
const MetersTabContent = ({
  objectId,
  objectName,
  meters,
  plombs,
  onAddMeter,
  onAddPlomb,
  onRefresh,
}) => {
  const getMeterPlombs = (meterId) => {
    return plombs.filter((p) => p.meterId === meterId);
  };

  return (
    <div className="space-y-4">
      {/* Кнопка добавления */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-800">
          Ҳисоблагичлар рўйхати ({meters.length})
        </h3>
        <motion.button
          onClick={onAddMeter}
          className="bg-gradient-to-r from-indigo-500 to-blue-600 text-white px-4 py-2 rounded-lg font-medium shadow-lg hover:shadow-xl flex items-center gap-2"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Plus size={18} />
          Ҳисоблагич қўшиш
        </motion.button>
      </div>

      {meters.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
          <Gauge className="mx-auto text-gray-300 mb-3" size={48} />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">
            Ҳисоблагичлар қўшилмаган
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Биринчи ҳисоблагични қўшинг
          </p>
          <button
            onClick={onAddMeter}
            className="bg-indigo-500 text-white px-6 py-2 rounded-lg hover:bg-indigo-600"
          >
            Ҳисоблагич қўшиш
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {meters.map((meter) => {
            const meterPlombs = getMeterPlombs(meter.id);
            const isActive = !meter.installedTo;

            return (
              <motion.div
                key={meter.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`border-2 rounded-xl p-4 ${
                  isActive
                    ? "border-green-300 bg-green-50"
                    : "border-gray-200 bg-gray-50"
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        isActive ? "bg-green-200" : "bg-gray-200"
                      }`}
                    >
                      <Gauge
                        className={
                          isActive ? "text-green-700" : "text-gray-500"
                        }
                        size={24}
                      />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-800">
                        {meter.meterTypeName}
                      </div>
                      <div className="text-sm text-gray-500 font-mono">
                        № {meter.serialNumber}
                      </div>
                      <span
                        className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          isActive
                            ? "bg-green-200 text-green-800"
                            : "bg-gray-200 text-gray-600"
                        }`}
                      >
                        {isActive ? "Фаол" : "Ўрнатилган"}
                      </span>
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <div className="text-gray-500">Ўрнатилган:</div>
                    <div className="font-medium text-gray-700">
                      {meter.installedFrom}
                    </div>
                    {meter.installedTo && (
                      <>
                        <div className="text-gray-500 mt-1">
                          Олиб ташланган:
                        </div>
                        <div className="font-medium text-gray-700">
                          {meter.installedTo}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Пломбы счётчика */}
                <div className="border-t pt-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <Shield size={14} />
                      Пломбалар ({meterPlombs.length})
                    </div>
                    <button
                      onClick={() =>
                        onAddPlomb({ ...meter, objectId, objectName })
                      }
                      className="text-xs px-3 py-1 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-1"
                    >
                      <Plus size={12} />
                      Пломба ўрнатиш
                    </button>
                  </div>

                  {meterPlombs.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-2">
                      Пломбалар ўрнатилмаган
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {meterPlombs.map((plomb) => (
                        <div
                          key={plomb.id}
                          className="bg-white rounded-lg p-2 border border-gray-200"
                        >
                          <div className="text-xs text-gray-500">
                            {plomb.partName}
                          </div>
                          <div className="font-mono text-sm font-medium text-gray-800">
                            {plomb.series}-{plomb.number}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            {plomb.installedDate}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Objects;
