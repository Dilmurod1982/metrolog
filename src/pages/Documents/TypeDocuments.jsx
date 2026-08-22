// src/pages/Documents/TypeDocuments.jsx
import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { collection, getDocs, query, where, addDoc } from "firebase/firestore";
import { db, storage } from "../../firebase/config";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download,
  ArrowLeft,
  FileText,
  AlertCircle,
  Clock,
  Plus,
  Search,
  Factory,
  X,
  Hash,
  Calendar,
  Upload,
  Save,
  Building,
  ChevronDown,
  Filter,
} from "lucide-react";
import { useAppStore } from "../../lib/zustand";
import { useLogger } from "../../hooks/useLogger";
import { MODULES } from "../../services/logger";
import { toast } from "react-hot-toast";

const TypeDocuments = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { language, userData } = useAppStore();
  const { logCreate, logError } = useLogger();

  const [docs, setDocs] = useState([]);
  const [filteredDocs, setFilteredDocs] = useState([]);
  const [typeData, setTypeData] = useState(null);
  const [objectsMap, setObjectsMap] = useState({});
  const [organizationsMap, setOrganizationsMap] = useState({});
  const [objects, setObjects] = useState([]);
  const [objectTypesMap, setObjectTypesMap] = useState({});
  const [objectTypesList, setObjectTypesList] = useState([]);
  const [regions, setRegions] = useState([]);
  const [regionsMap, setRegionsMap] = useState({});
  const [cities, setCities] = useState([]);
  const [filteredCities, setFilteredCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [showLatestOnly, setShowLatestOnly] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [filters, setFilters] = useState({
    search: "",
    orgType: "Все",
    objectType: "Все",
    region: "Все",
    city: "Все",
    expiry: "Все",
  });

  const [formData, setFormData] = useState({
    objectId: "",
    objectName: "",
    docNumber: "",
    issueDate: "",
    expiryDate: "",
  });
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [objectSearchTerm, setObjectSearchTerm] = useState("");
  const [showObjectDropdown, setShowObjectDropdown] = useState(false);

  const canAddDocuments =
    userData && (userData.role === "superadmin" || userData.role === "admin");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Загрузка типа документа
      const typesSnap = await getDocs(collection(db, "document_types"));
      typesSnap.forEach((doc) => {
        const data = doc.data();
        if (data.id === id || doc.id === id) {
          setTypeData({ ...data, firebaseId: doc.id });
        }
      });

      // Загрузка типов объектов
      const objectTypesSnap = await getDocs(collection(db, "objectTypes"));
      const objectTypesData = {};
      const objectTypesArr = [];
      objectTypesSnap.forEach((doc) => {
        const data = doc.data();
        objectTypesData[doc.id] = data.name;
        objectTypesArr.push({ id: doc.id, name: data.name });
      });
      setObjectTypesMap(objectTypesData);
      setObjectTypesList(objectTypesArr);

      // Загрузка областей
      const regionsSnap = await getDocs(collection(db, "regions"));
      const regionsList = [];
      const regionsData = {};
      regionsSnap.forEach((doc) => {
        const data = doc.data();
        regionsList.push({ id: doc.id, ...data });
        regionsData[doc.id] = { ...data, id: doc.id };
      });
      setRegions(regionsList);
      setRegionsMap(regionsData);

      // Загрузка городов
      const citiesSnap = await getDocs(collection(db, "cities"));
      const citiesList = [];
      citiesSnap.forEach((doc) => {
        citiesList.push({ id: doc.id, ...doc.data() });
      });
      setCities(citiesList);

      // Загрузка организаций
      const orgsSnap = await getDocs(collection(db, "organizations"));
      const orgsData = {};
      orgsSnap.forEach((doc) => {
        orgsData[doc.id] = { ...doc.data(), id: doc.id };
      });
      setOrganizationsMap(orgsData);

      // Загрузка объектов с обогащением данными организаций
      const objectsSnap = await getDocs(collection(db, "objects"));
      const objectsData = {};
      const objectsList = [];
      objectsSnap.forEach((doc) => {
        const data = doc.data();
        const orgInfo = orgsData[data.organizationId] || {};
        const regionInfo = regionsData[data.regionId] || {};
        const objectTypeName = data.objectTypeId
          ? objectTypesData[data.objectTypeId] || data.objectTypeName || "—"
          : data.objectTypeName || "—";

        const fullObject = {
          ...data,
          id: doc.id,
          organizationType: orgInfo.type || "—",
          inn: orgInfo.inn || "—",
          jshshir: orgInfo.jshshir || "—",
          regionName: data.regionName || regionInfo.name || "—",
          objectTypeName: objectTypeName,
        };

        objectsData[doc.id] = fullObject;
        objectsList.push(fullObject);
      });
      setObjectsMap(objectsData);
      setObjects(objectsList);

      // Загрузка документов
      const docsSnap = await getDocs(
        query(collection(db, "documents"), where("docType", "==", id))
      );

      const docsData = docsSnap.docs.map((doc) => {
        const data = doc.data();
        const expiry = data.expiryDate ? new Date(data.expiryDate) : null;
        const issue = data.issueDate ? new Date(data.issueDate) : null;
        const now = new Date();
        const diffDays = expiry
          ? Math.ceil((expiry - now) / (1000 * 60 * 60 * 24))
          : Infinity;

        const objectInfo = objectsData[data.objectId] || {};

        return {
          id: doc.id,
          objectId: data.objectId,
          objectName: objectInfo.objectName || data.objectName || "—",
          organizationName: objectInfo.organizationName || "—",
          organizationType: objectInfo.organizationType || "—",
          inn: objectInfo.inn || "—",
          jshshir: objectInfo.jshshir || "—",
          billingAccount: objectInfo.billingAccount || "—",
          regionName: objectInfo.regionName || "—",
          cityName: objectInfo.cityName || "—",
          objectTypeName: objectInfo.objectTypeName || "—",
          docNumber: data.docNumber,
          issueDate: issue ? issue.toLocaleDateString("ru-RU") : "—",
          expiryDate: expiry ? expiry.toLocaleDateString("ru-RU") : "—",
          expiryRaw: expiry,
          issueRaw: issue,
          diffDays,
          daysLeft:
            diffDays === Infinity
              ? "Муддатсиз"
              : diffDays < 0
              ? `Муддати ўтган: ${Math.abs(diffDays)} кун`
              : `${diffDays} кун қолди`,
          fileUrl: data.fileUrl || null,
        };
      });

      setDocs(docsData);
    } catch (error) {
      console.error("Ошибка загрузки документов:", error);
      await logError(
        MODULES.DOCUMENTS,
        `Ҳужжатларни юклашда хатолик: ${error.message}`
      );
      toast.error("Ҳужжатларни юклашда хатолик");
    } finally {
      setLoading(false);
    }
  }, [id, logError]);

  useEffect(() => {
    loadData();
  }, [loadData, refreshTrigger]);

  useEffect(() => {
    applyFilters();
  }, [docs, filters, showLatestOnly]);

  // При изменении региона фильтруем города
  useEffect(() => {
    if (filters.region === "Все") {
      setFilteredCities([]);
    } else {
      const regionObj = regions.find((r) => r.name === filters.region);
      if (regionObj) {
        const citiesInRegion = cities.filter(
          (city) => city.regionId === regionObj.id
        );
        setFilteredCities(citiesInRegion);
      } else {
        setFilteredCities([]);
      }
    }
    setFilters((prev) => ({ ...prev, city: "Все" }));
  }, [filters.region, regions, cities]);

  const applyFilters = () => {
    let filtered = [...docs];

    // 1. Поиск
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (d) =>
          d.objectName?.toLowerCase().includes(searchLower) ||
          d.organizationName?.toLowerCase().includes(searchLower) ||
          d.billingAccount?.toLowerCase().includes(searchLower) ||
          d.inn?.toLowerCase().includes(searchLower) ||
          d.jshshir?.toLowerCase().includes(searchLower) ||
          d.docNumber?.toLowerCase().includes(searchLower)
      );
    }

    // 2. Тип организации
    if (filters.orgType !== "Все") {
      filtered = filtered.filter((d) => d.organizationType === filters.orgType);
    }

    // 3. Тип объекта
    if (filters.objectType !== "Все") {
      filtered = filtered.filter(
        (d) => d.objectTypeName === filters.objectType
      );
    }

    // 4. Регион
    if (filters.region !== "Все") {
      filtered = filtered.filter((d) => d.regionName === filters.region);
    }

    // 5. Город
    if (filters.city !== "Все") {
      filtered = filtered.filter((d) => d.cityName === filters.city);
    }

    // 6. ВАЖНО: Сначала определяем последние документы
    if (showLatestOnly) {
      const latestDocsMap = {};
      filtered.forEach((d) => {
        const key = d.objectId;
        if (!latestDocsMap[key]) {
          latestDocsMap[key] = d;
        } else {
          const currentExpiry = d.expiryRaw;
          const existingExpiry = latestDocsMap[key].expiryRaw;

          if (currentExpiry === null) {
            if (existingExpiry === null) {
              const currentIssue = d.issueRaw;
              const existingIssue = latestDocsMap[key].issueRaw;
              if (
                currentIssue &&
                existingIssue &&
                currentIssue > existingIssue
              ) {
                latestDocsMap[key] = d;
              }
            } else {
              latestDocsMap[key] = d;
            }
          } else if (existingExpiry === null) {
            // Оставляем существующий без срока
          } else if (currentExpiry > existingExpiry) {
            latestDocsMap[key] = d;
          }
        }
      });
      filtered = Object.values(latestDocsMap);
    }

    // 7. Только теперь применяем фильтр по сроку
    if (filters.expiry !== "Все") {
      filtered = filtered.filter((d) => {
        const days = d.diffDays;
        if (filters.expiry === "30 кун") return days <= 30 && days > 15;
        if (filters.expiry === "15 кун") return days <= 15 && days > 5;
        if (filters.expiry === "5 кун") return days <= 5 && days >= 0;
        if (filters.expiry === "Муддати ўтган") return days < 0;
        return true;
      });
    }

    // 8. Сортировка
    filtered.sort((a, b) => {
      if (a.diffDays === Infinity && b.diffDays === Infinity) return 0;
      if (a.diffDays === Infinity) return 1;
      if (b.diffDays === Infinity) return -1;
      return a.diffDays - b.diffDays;
    });

    setFilteredDocs(filtered);
  };

  const handleOpenModal = () => {
    setIsModalOpen(true);
    setObjectSearchTerm("");
    setShowObjectDropdown(false);
    setFormData({
      objectId: "",
      objectName: "",
      docNumber: "",
      issueDate: "",
      expiryDate: "",
    });
    setFile(null);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormData({
      objectId: "",
      objectName: "",
      docNumber: "",
      issueDate: "",
      expiryDate: "",
    });
    setFile(null);
    setObjectSearchTerm("");
    setShowObjectDropdown(false);
  };

  const getStatusBadge = (diffDays) => {
    if (diffDays === Infinity) return "bg-gray-100 text-gray-600";
    if (diffDays < 0) return "bg-red-100 text-red-700";
    if (diffDays <= 5) return "bg-yellow-100 text-yellow-700";
    if (diffDays <= 15) return "bg-orange-100 text-orange-700";
    if (diffDays <= 30) return "bg-blue-100 text-blue-700";
    return "bg-green-100 text-green-700";
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      search: "",
      orgType: "Все",
      objectType: "Все",
      region: "Все",
      city: "Все",
      expiry: "Все",
    });
  };

  const activeFiltersCount = Object.values(filters).filter(
    (v) => v !== "" && v !== "Все"
  ).length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          className="w-12 h-12 border-4 border-violet-200 border-t-violet-600 rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-purple-100 p-4 lg:p-8">
      {/* Заголовок */}
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <div className="flex items-center gap-4">
          <motion.button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg bg-white shadow-sm hover:bg-gray-50 transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <ArrowLeft size={20} />
          </motion.button>
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm"
              style={{ backgroundColor: typeData?.color || "#16a34a" }}
            >
              <FileText className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">
                {typeData?.name || "Ҳужжатлар"}
              </h1>
              <p className="text-sm text-gray-500">
                Жами: {filteredDocs.length} та ҳужжат
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <motion.button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 ${
              showFilters || activeFiltersCount > 0
                ? "bg-violet-600 text-white"
                : "bg-white text-gray-700 border border-gray-200"
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Filter size={18} />
            Фильтрлар
            {activeFiltersCount > 0 && (
              <span className="bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                {activeFiltersCount}
              </span>
            )}
          </motion.button>

          {canAddDocuments && (
            <motion.button
              onClick={handleOpenModal}
              className="bg-gradient-to-r from-violet-500 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Plus size={20} />
              Янги ҳужжат
            </motion.button>
          )}
        </div>
      </div>

      {/* Основные фильтры */}
      <div className="flex flex-wrap gap-3 mb-4 bg-white rounded-xl p-4 shadow-sm">
        <div className="flex gap-2">
          <button
            onClick={() => setShowLatestOnly(true)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              showLatestOnly
                ? "bg-violet-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Охирги ҳужжатлар
          </button>
          <button
            onClick={() => setShowLatestOnly(false)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              !showLatestOnly
                ? "bg-violet-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Барча ҳужжатлар
          </button>
        </div>

        <div className="flex-1 min-w-[200px] relative">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Лицевой счет, ИНН, ЖШШИР, объект..."
            value={filters.search}
            onChange={(e) => handleFilterChange("search", e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500"
          />
        </div>
      </div>

      {/* Расширенные фильтры */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="mb-4 bg-white rounded-xl p-4 shadow-sm"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                МЧЖ/ЯТТ тури
              </label>
              <select
                value={filters.orgType}
                onChange={(e) => handleFilterChange("orgType", e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500"
              >
                <option value="Все">Барчаси</option>
                <option value="МЧЖ">МЧЖ</option>
                <option value="ЯТТ">ЯТТ</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Объект тури
              </label>
              <select
                value={filters.objectType}
                onChange={(e) =>
                  handleFilterChange("objectType", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500"
              >
                <option value="Все">Барчаси</option>
                {objectTypesList.map((type) => (
                  <option key={type.id} value={type.name}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Вилоят
              </label>
              <select
                value={filters.region}
                onChange={(e) => handleFilterChange("region", e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500"
              >
                <option value="Все">Барчаси</option>
                {regions.map((region) => (
                  <option key={region.id} value={region.name}>
                    {region.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Туман/Шаҳар
              </label>
              <select
                value={filters.city}
                onChange={(e) => handleFilterChange("city", e.target.value)}
                disabled={filters.region === "Все"}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 disabled:bg-gray-100"
              >
                <option value="Все">
                  {filters.region === "Все"
                    ? "Аввал вилоятни танланг"
                    : "Барчаси"}
                </option>
                {filteredCities.map((city) => (
                  <option key={city.id} value={city.name}>
                    {city.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Муддат
              </label>
              <select
                value={filters.expiry}
                onChange={(e) => handleFilterChange("expiry", e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500"
              >
                <option value="Все">Барчаси</option>
                <option value="30 кун">30 кунгача</option>
                <option value="15 кун">15 кунгача</option>
                <option value="5 кун">5 кунгача</option>
                <option value="Муддати ўтган">Муддати ўтган</option>
              </select>
            </div>
          </div>

          {activeFiltersCount > 0 && (
            <div className="mt-3 text-right">
              <button
                onClick={resetFilters}
                className="text-sm text-red-500 hover:text-red-700"
              >
                Фильтрларни тозалаш
              </button>
            </div>
          )}
        </motion.div>
      )}

      {/* Таблица документов */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-violet-500 to-purple-600 text-white">
                <th className="px-4 py-4 text-left font-semibold w-16">№</th>
                <th className="px-4 py-4 text-left font-semibold">
                  Объект / МЧЖ
                </th>
                <th className="px-4 py-4 text-left font-semibold hidden lg:table-cell">
                  ИНН/ЖШШИР
                </th>
                <th className="px-4 py-4 text-left font-semibold hidden md:table-cell">
                  Объект тури
                </th>
                <th className="px-4 py-4 text-left font-semibold hidden xl:table-cell">
                  Ҳудуд
                </th>
                <th className="px-4 py-4 text-left font-semibold">Ҳужжат №</th>
                <th className="px-4 py-4 text-left font-semibold">Тугаш</th>
                <th className="px-4 py-4 text-left font-semibold">Ҳолат</th>
                <th className="px-4 py-4 text-left font-semibold w-20">Файл</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredDocs.map((doc, index) => (
                <motion.tr
                  key={doc.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.03 }}
                  className="hover:bg-violet-50 transition-colors"
                >
                  <td className="px-4 py-4 text-gray-600">{index + 1}</td>
                  <td className="px-4 py-4">
                    <div>
                      <div className="font-medium text-gray-800">
                        {doc.objectName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {doc.organizationName}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        <span
                          className={`px-2 py-0.5 rounded-full ${
                            doc.organizationType === "МЧЖ"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {doc.organizationType}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-gray-600 hidden lg:table-cell">
                    {doc.organizationType === "МЧЖ" ? doc.inn : doc.jshshir}
                  </td>
                  <td className="px-4 py-4 hidden md:table-cell">
                    <span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs font-medium">
                      {doc.objectTypeName}
                    </span>
                  </td>
                  <td className="px-4 py-4 hidden xl:table-cell">
                    <div className="text-sm">
                      <div className="text-gray-700">{doc.regionName}</div>
                      <div className="text-gray-500">{doc.cityName}</div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-gray-700">{doc.docNumber}</td>
                  <td className="px-4 py-4 text-gray-600">{doc.expiryDate}</td>
                  <td className="px-4 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(
                        doc.diffDays
                      )}`}
                    >
                      {doc.daysLeft}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    {doc.fileUrl && (
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-violet-500 hover:text-violet-700"
                      >
                        <Download size={18} />
                      </a>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredDocs.length === 0 && (
          <div className="text-center py-12">
            <FileText className="mx-auto text-gray-400 mb-4" size={48} />
            <h3 className="text-lg font-semibold text-gray-600">
              Ҳужжатлар топилмади
            </h3>
          </div>
        )}
      </div>

      {/* Модальное окно добавления */}
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
              className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-violet-500 to-purple-600 text-white p-6 sticky top-0 z-10">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <FileText size={22} />
                    Янги ҳужжат қўшиш
                  </h2>
                  <motion.button
                    onClick={handleCloseModal}
                    className="p-2 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 transition-all"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <X size={20} />
                  </motion.button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <FileText size={16} />
                    Ҳужжат тури
                  </label>
                  <input
                    type="text"
                    value={typeData?.name || id}
                    disabled
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-500"
                  />
                </div>

                <div className="relative">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <Building size={16} />
                    Объект *
                  </label>

                  <div
                    onClick={() => setShowObjectDropdown(!showObjectDropdown)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl cursor-pointer flex items-center justify-between hover:border-violet-300 transition-all bg-white"
                  >
                    <span
                      className={
                        formData.objectName ? "text-gray-800" : "text-gray-400"
                      }
                    >
                      {formData.objectName || "Объектни танланг..."}
                    </span>
                    <ChevronDown
                      size={18}
                      className={`text-gray-400 transition-transform ${
                        showObjectDropdown ? "rotate-180" : ""
                      }`}
                    />
                  </div>

                  {showObjectDropdown && (
                    <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                      <div className="p-2 border-b sticky top-0 bg-white z-10">
                        <div className="relative">
                          <Search
                            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                            size={16}
                          />
                          <input
                            type="text"
                            value={objectSearchTerm}
                            onChange={(e) =>
                              setObjectSearchTerm(e.target.value)
                            }
                            placeholder="Қидириш..."
                            autoFocus
                            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                          />
                        </div>
                      </div>

                      {filteredObjects.length === 0 ? (
                        <div className="px-4 py-3 text-gray-500 text-center text-sm">
                          Объектлар топилмади
                        </div>
                      ) : (
                        filteredObjects.map((obj) => (
                          <div
                            key={obj.id}
                            onClick={() => handleObjectSelect(obj)}
                            className={`px-4 py-3 hover:bg-violet-50 cursor-pointer border-b last:border-b-0 transition-colors ${
                              formData.objectId === obj.id ? "bg-violet-50" : ""
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <Factory className="text-violet-500" size={16} />
                              <span className="font-medium text-gray-800">
                                {obj.objectName}
                              </span>
                              {formData.objectId === obj.id && (
                                <span className="text-green-500">✓</span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500 mt-0.5">
                              {obj.organizationName} • Л/с: {obj.billingAccount}
                            </div>
                            <div className="text-xs text-gray-400">
                              {obj.regionName} • {obj.cityName}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {formData.objectId && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-xl">
                    <p className="text-sm font-medium text-green-700">
                      Танланган объект: {formData.objectName}
                    </p>
                  </div>
                )}

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <Hash size={16} />
                    Ҳужжат рақами *
                  </label>
                  <input
                    type="text"
                    value={formData.docNumber}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        docNumber: e.target.value,
                      }))
                    }
                    placeholder="Ҳужжат рақамини киритинг"
                    required
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                      <Calendar size={16} />
                      Берилган сана *
                    </label>
                    <input
                      type="date"
                      value={formData.issueDate}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          issueDate: e.target.value,
                        }))
                      }
                      required
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                      <Calendar size={16} />
                      Тугаш санаси
                    </label>
                    <input
                      type="date"
                      value={formData.expiryDate}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          expiryDate: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <Upload size={16} />
                    Ҳужжат файли * (max 10 MB)
                  </label>
                  <input
                    type="file"
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    required
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                  />
                  {file && (
                    <p className="mt-2 text-sm text-green-600">
                      Танланган файл: {file.name}
                    </p>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                  <motion.button
                    type="button"
                    onClick={handleCloseModal}
                    disabled={saving}
                    className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Бекор
                  </motion.button>

                  <motion.button
                    type="submit"
                    disabled={saving || !formData.objectId}
                    className="flex-1 px-4 py-3 bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {saving ? (
                      <>
                        <motion.div
                          className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                          animate={{ rotate: 360 }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            ease: "linear",
                          }}
                        />
                        Сақланмоқда...
                      </>
                    ) : (
                      <>
                        <Save size={18} />
                        Сақлаш
                      </>
                    )}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TypeDocuments;
