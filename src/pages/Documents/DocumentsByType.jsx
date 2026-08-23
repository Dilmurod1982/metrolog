// src/pages/Documents/DocumentsByType.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase/config";
import { motion } from "framer-motion";
import {
  Search,
  FileText,
  AlertCircle,
  Clock,
  CheckCircle,
} from "lucide-react";
import { useAppStore } from "../../lib/zustand";
import { useLogger } from "../../hooks/useLogger";
import { MODULES } from "../../services/logger";

const DocumentsByType = () => {
  const { language, userData } = useAppStore();
  const { logError } = useLogger();
  const navigate = useNavigate();

  const [documentTypes, setDocumentTypes] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const rolesWithCityFilter = ["tummetrolog", "metrolog", "mexmon"];
  const needsCityFilter = rolesWithCityFilter.includes(userData?.role);

  const userCityIds = useMemo(() => {
    return userData?.selectedCities || [];
  }, [userData?.selectedCities]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Загрузка типов документов
      const typesSnap = await getDocs(collection(db, "document_types"));
      const typesData = typesSnap.docs.map((doc) => ({
        id: doc.id,
        firebaseId: doc.id,
        ...doc.data(),
      }));
      typesData.sort((a, b) => (a.number || 0) - (b.number || 0));
      setDocumentTypes(typesData);

      // Загрузка документов
      const docsSnap = await getDocs(collection(db, "documents"));
      const docsData = docsSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Загрузка объектов для фильтрации по городам
      const objectsSnap = await getDocs(collection(db, "objects"));
      const objectsData = {};
      objectsSnap.forEach((doc) => {
        objectsData[doc.id] = { ...doc.data(), id: doc.id };
      });

      // Фильтруем документы по городам пользователя
      let filteredDocs = docsData;
      if (needsCityFilter) {
        if (userCityIds.length > 0) {
          filteredDocs = docsData.filter((doc) => {
            const objectInfo = objectsData[doc.objectId];
            return (
              objectInfo &&
              objectInfo.cityId &&
              userCityIds.includes(objectInfo.cityId)
            );
          });
        } else {
          filteredDocs = [];
        }
      }

      // Получаем только последние документы для каждого объекта
      const latestDocsMap = {};
      const now = new Date();

      filteredDocs.forEach((doc) => {
        const key = doc.objectId;
        if (!key) return;

        const expiry = doc.expiryDate ? new Date(doc.expiryDate) : null;
        const issue = doc.issueDate ? new Date(doc.issueDate) : null;

        if (!latestDocsMap[key]) {
          latestDocsMap[key] = { ...doc, expiryRaw: expiry, issueRaw: issue };
        } else {
          const currentExpiry = expiry;
          const existingExpiry = latestDocsMap[key].expiryRaw;

          if (currentExpiry === null) {
            if (existingExpiry === null) {
              if (
                issue &&
                latestDocsMap[key].issueRaw &&
                issue > latestDocsMap[key].issueRaw
              ) {
                latestDocsMap[key] = {
                  ...doc,
                  expiryRaw: expiry,
                  issueRaw: issue,
                };
              }
            } else {
              latestDocsMap[key] = {
                ...doc,
                expiryRaw: expiry,
                issueRaw: issue,
              };
            }
          } else if (existingExpiry === null) {
            // Оставляем существующий без срока
          } else if (currentExpiry > existingExpiry) {
            latestDocsMap[key] = { ...doc, expiryRaw: expiry, issueRaw: issue };
          }
        }
      });

      const latestDocs = Object.values(latestDocsMap);

      // Подсчет статистики по типам документов
      const counts = {};

      latestDocs.forEach((doc) => {
        const docType = doc.docType;
        const expiry = doc.expiryRaw;
        const diffDays = expiry
          ? Math.ceil((expiry - now) / (1000 * 60 * 60 * 24))
          : Infinity;

        if (!counts[docType]) {
          counts[docType] = {
            total: 0,
            expired: 0,
            less30: 0,
            less15: 0,
            less5: 0,
            infinity: 0,
          };
        }

        counts[docType].total++;

        if (expiry === null || diffDays === Infinity) {
          counts[docType].infinity++;
          return;
        }

        if (diffDays < 0) counts[docType].expired++;
        else if (diffDays <= 5) counts[docType].less5++;
        else if (diffDays <= 15) counts[docType].less15++;
        else if (diffDays <= 30) counts[docType].less30++;
      });

      setStats(counts);
    } catch (error) {
      console.error("Ошибка загрузки данных:", error);
      await logError(
        MODULES.DOCUMENTS,
        `Ҳужжатларни юклашда хатолик: ${error.message}`
      );
    } finally {
      setLoading(false);
    }
  }, [logError, needsCityFilter, userCityIds]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredTypes = documentTypes.filter(
    (type) =>
      type.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      type.path?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleTypeClick = (typeId) => {
    navigate(`/type-documents/${typeId}`);
  };

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
      <div className="flex flex-wrap justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-800 mb-2">
            Ҳужжат тури бўйича
          </h1>
          <p className="text-gray-600">Ҳужжат турлари бўйича статистика</p>
        </div>

        {needsCityFilter && (
          <div className="px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
            <span className="font-medium">ℹ️ </span>
            Сизга бириктирилган ҳудудлар бўйича ҳужжатлар кўрсатилмоқда
            {userCityIds.length > 0 && (
              <span> ({userCityIds.length} та шаҳар/туман)</span>
            )}
          </div>
        )}
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
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all duration-300"
          />
        </div>
      </div>

      {/* Сетка типов документов */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredTypes.map((type, index) => {
          const s = stats[type.id] ||
            stats[type.firebaseId] || {
              total: 0,
              expired: 0,
              less30: 0,
              less15: 0,
              less5: 0,
              infinity: 0,
            };

          return (
            <motion.div
              key={type.firebaseId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              whileHover={{ scale: 1.02 }}
              onClick={() => handleTypeClick(type.firebaseId || type.id)}
              className="bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all cursor-pointer p-5 group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: type.color || "#16a34a" }}
                  >
                    <FileText className="text-white" size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 text-sm">
                      {type.name}
                    </h3>
                    <p className="text-xs text-gray-500">{type.path}</p>
                  </div>
                </div>
                <div className="bg-violet-500 text-white rounded-full min-w-8 h-8 px-2 flex items-center justify-center text-sm font-bold">
                  {s.total}
                </div>
              </div>

              <div className="space-y-1.5 text-sm">
                {type.validity === "infinity" ? (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 flex items-center gap-1">
                      <CheckCircle size={14} /> Муддатсиз
                    </span>
                    <span className="font-medium text-green-600">
                      {s.infinity}
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 flex items-center gap-1">
                        <Clock size={14} /> 30 кун
                      </span>
                      <span className="font-medium text-blue-600">
                        {s.less30}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 flex items-center gap-1">
                        <Clock size={14} /> 15 кун
                      </span>
                      <span className="font-medium text-yellow-600">
                        {s.less15}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 flex items-center gap-1">
                        <Clock size={14} /> 5 кун
                      </span>
                      <span className="font-medium text-orange-600">
                        {s.less5}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 flex items-center gap-1">
                        <AlertCircle size={14} /> Муддати ўтган
                      </span>
                      <span className="font-bold text-red-600">
                        {s.expired}
                      </span>
                    </div>
                  </>
                )}
              </div>

              <div className="mt-3 text-center py-2 bg-violet-50 text-violet-600 rounded-lg group-hover:bg-violet-100 transition-colors text-sm font-medium">
                Ҳужжатларни кўриш
              </div>
            </motion.div>
          );
        })}
      </div>

      {filteredTypes.length === 0 && (
        <div className="text-center py-12">
          <FileText className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-lg font-semibold text-gray-600">
            {searchTerm
              ? "Ҳужжат турлари топилмади"
              : "Ҳужжат турлари қўшилмаган"}
          </h3>
        </div>
      )}
    </div>
  );
};

export default DocumentsByType;
