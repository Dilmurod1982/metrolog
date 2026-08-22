// src/pages/Documents/DocumentsByType.jsx
import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { collection, getDocs, onSnapshot } from "firebase/firestore";
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
  const { language } = useAppStore();
  const { logError } = useLogger();

  const [documentTypes, setDocumentTypes] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

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

      // Подсчет статистики
      const counts = {};
      const now = new Date();

      docsData.forEach((docData) => {
        const docType = docData.docType;
        const expiry = docData.expiryDate ? new Date(docData.expiryDate) : null;
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

        if (expiry === null) {
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
  }, [logError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredTypes = documentTypes.filter(
    (type) =>
      type.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      type.path?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
      <div className="mb-8">
        <h1 className="text-3xl lg:text-4xl font-bold text-gray-800 mb-2">
          Ҳужжат тури бўйича
        </h1>
        <p className="text-gray-600">Ҳужжат турлари бўйича статистика</p>
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
              className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow p-5"
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

              {s.total > 0 && (
                <Link
                  to={`/type-documents/${type.firebaseId}`}
                  className="mt-3 block text-center py-2 bg-violet-50 text-violet-600 rounded-lg hover:bg-violet-100 transition-colors text-sm font-medium"
                >
                  Ҳужжатларни кўриш
                </Link>
              )}
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
