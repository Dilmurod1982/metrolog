// src/pages/Documents/DocumentsByObject.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase/config";
import { motion } from "framer-motion";
import {
  Search,
  Factory,
  FileText,
  AlertCircle,
  Clock,
  ChevronRight,
} from "lucide-react";
import { useAppStore } from "../../lib/zustand";
import { useLogger } from "../../hooks/useLogger";
import { MODULES } from "../../services/logger";

const DocumentsByObject = () => {
  const { language, userData } = useAppStore();
  const { logError } = useLogger();
  const navigate = useNavigate();

  const [objects, setObjects] = useState([]);
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
      const objectsSnap = await getDocs(collection(db, "objects"));
      let objectsData = objectsSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      if (needsCityFilter) {
        if (userCityIds.length > 0) {
          objectsData = objectsData.filter(
            (obj) => obj.cityId && userCityIds.includes(obj.cityId)
          );
        } else {
          objectsData = [];
        }
      }

      setObjects(objectsData);

      const docsSnap = await getDocs(collection(db, "documents"));
      const docsData = docsSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const typesSnap = await getDocs(collection(db, "document_types"));
      const typesData = typesSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const filteredObjectIds = new Set(objectsData.map((obj) => obj.id));

      const counts = {};
      const now = new Date();

      docsData.forEach((docData) => {
        const objectId = docData.objectId;
        if (!objectId || !filteredObjectIds.has(objectId)) return;

        const docType = docData.docType;
        const expiry = docData.expiryDate ? new Date(docData.expiryDate) : null;
        const diffDays = expiry
          ? Math.ceil((expiry - now) / (1000 * 60 * 60 * 24))
          : Infinity;

        const typeInfo = typesData.find(
          (t) => t.id === docType || t.firebaseId === docType
        );

        if (!counts[objectId]) {
          counts[objectId] = {
            total: 0,
            expired: 0,
            less30: 0,
            less15: 0,
            less5: 0,
            infinity: 0,
            documentTypes: new Set(),
          };
        }

        counts[objectId].total++;
        if (typeInfo) {
          counts[objectId].documentTypes.add(typeInfo.name);
        }

        if (expiry === null) {
          counts[objectId].infinity++;
          return;
        }

        if (diffDays < 0) counts[objectId].expired++;
        else if (diffDays <= 5) counts[objectId].less5++;
        else if (diffDays <= 15) counts[objectId].less15++;
        else if (diffDays <= 30) counts[objectId].less30++;
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

  const filteredObjects = objects.filter(
    (obj) =>
      obj.objectName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      obj.organizationName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      obj.billingAccount?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      obj.regionName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      obj.cityName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleObjectClick = (objectId) => {
    navigate(`/object-documents/${objectId}`);
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
            Объектлар бўйича ҳужжатлар
          </h1>
          <p className="text-gray-600">
            Объектлар бўйича ҳужжатлар статистикаси
          </p>
        </div>

        {needsCityFilter && (
          <div className="px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
            <span className="font-medium">ℹ️ </span>
            Сизга бириктирилган ҳудудлар бўйича объектлар кўрсатилмоқда
            {userCityIds.length > 0 && (
              <span> ({userCityIds.length} та шаҳар/туман)</span>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-4 mb-6">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            size={20}
          />
          <input
            type="text"
            placeholder="Объект, МЧЖ, лицевой счет бўйича қидириш..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all duration-300"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredObjects.map((obj, index) => {
          const s = stats[obj.id] || {
            total: 0,
            expired: 0,
            less30: 0,
            less15: 0,
            less5: 0,
            infinity: 0,
            documentTypes: new Set(),
          };

          return (
            <motion.div
              key={obj.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              whileHover={{ scale: 1.02 }}
              onClick={() => handleObjectClick(obj.id)}
              className="bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all cursor-pointer p-5 group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center group-hover:bg-violet-200 transition-colors">
                    <Factory className="text-violet-600" size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 text-sm leading-tight">
                      {obj.objectName}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {obj.organizationName}
                    </p>
                    <p className="text-xs text-gray-400 font-mono">
                      Л/с: {obj.billingAccount || "—"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="bg-violet-500 text-white rounded-full min-w-8 h-8 px-2 flex items-center justify-center text-sm font-bold">
                    {s.total}
                  </div>
                  <ChevronRight
                    className="text-gray-300 group-hover:text-violet-500 transition-colors"
                    size={20}
                  />
                </div>
              </div>

              <div className="mb-3 text-xs text-gray-500">
                📍 {obj.regionName} • {obj.cityName}{" "}
                {obj.cityType === "Шаҳар" || obj.cityType === "Город"
                  ? "шаҳар"
                  : obj.cityType === "Туман" || obj.cityType === "Район"
                  ? "тумани"
                  : ""}
              </div>

              {s.documentTypes.size > 0 && (
                <div className="mb-3">
                  <div className="flex flex-wrap gap-1">
                    {Array.from(s.documentTypes)
                      .slice(0, 2)
                      .map((type, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs"
                        >
                          {type}
                        </span>
                      ))}
                    {s.documentTypes.size > 2 && (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
                        +{s.documentTypes.size - 2}
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-1.5 text-sm border-t pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 flex items-center gap-1">
                    <Clock size={14} /> 30 кун
                  </span>
                  <span className="font-medium text-blue-600">{s.less30}</span>
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
                  <span className="font-medium text-orange-600">{s.less5}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 flex items-center gap-1">
                    <AlertCircle size={14} /> Муддати ўтган
                  </span>
                  <span className="font-bold text-red-600">{s.expired}</span>
                </div>
                {s.infinity > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 flex items-center gap-1">
                      <FileText size={14} /> Муддатсиз
                    </span>
                    <span className="font-medium text-gray-600">
                      {s.infinity}
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-3 text-center py-2 bg-violet-50 text-violet-600 rounded-lg group-hover:bg-violet-100 transition-colors text-sm font-medium">
                Ҳужжатларни кўриш
              </div>
            </motion.div>
          );
        })}
      </div>

      {filteredObjects.length === 0 && (
        <div className="text-center py-12">
          <Factory className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-lg font-semibold text-gray-600">
            {searchTerm
              ? "Объектлар топилмади"
              : needsCityFilter && userCityIds.length === 0
              ? "Сизга ҳудудлар бириктирилмаган"
              : "Объектлар қўшилмаган"}
          </h3>
        </div>
      )}
    </div>
  );
};

export default DocumentsByObject;
