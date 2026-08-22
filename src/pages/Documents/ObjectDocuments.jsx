// src/pages/Documents/ObjectDocuments.jsx
import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebase/config";
import { motion } from "framer-motion";
import {
  Download,
  ArrowLeft,
  FileText,
  AlertCircle,
  Clock,
  Plus,
  Search,
} from "lucide-react";
import { useAppStore } from "../../lib/zustand";
import { useLogger } from "../../hooks/useLogger";
import { MODULES } from "../../services/logger";
import { toast } from "react-hot-toast";
import AddDocumentModalByObject from "../../components/AddDocumentModalByObject";

const ObjectDocuments = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { language, userData } = useAppStore();
  const { logError } = useLogger();

  const [docs, setDocs] = useState([]);
  const [filteredDocs, setFilteredDocs] = useState([]);
  const [objectData, setObjectData] = useState(null);
  const [typesMap, setTypesMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [showLatestOnly, setShowLatestOnly] = useState(true);
  const [selectedType, setSelectedType] = useState("Все");
  const [expiryFilter, setExpiryFilter] = useState("Все");
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Проверка прав на добавление
  const canAddDocuments =
    userData && (userData.role === "superadmin" || userData.role === "admin");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Загрузка объекта
      const objectSnap = await getDocs(
        query(collection(db, "objects"), where("__name__", "==", id))
      );
      if (!objectSnap.empty) {
        setObjectData(objectSnap.docs[0].data());
      }

      // Загрузка типов документов
      const typesSnap = await getDocs(collection(db, "document_types"));
      const types = {};
      typesSnap.forEach((doc) => {
        const data = doc.data();
        types[data.id || doc.id] = data.name;
      });
      setTypesMap(types);

      // Загрузка документов объекта
      const docsSnap = await getDocs(
        query(collection(db, "documents"), where("objectId", "==", id))
      );

      const docsData = docsSnap.docs.map((doc) => {
        const data = doc.data();
        const expiry = data.expiryDate ? new Date(data.expiryDate) : null;
        const issue = data.issueDate ? new Date(data.issueDate) : null;
        const now = new Date();
        const diffDays = expiry
          ? Math.ceil((expiry - now) / (1000 * 60 * 60 * 24))
          : Infinity;

        return {
          id: doc.id,
          typeId: data.docType,
          name: types[data.docType] || data.docType,
          docNumber: data.docNumber,
          issueDate: issue ? issue.toLocaleDateString("ru-RU") : "—",
          expiryDate: expiry ? expiry.toLocaleDateString("ru-RU") : "—",
          expiryRaw: expiry,
          diffDays,
          daysLeft:
            diffDays === Infinity
              ? "Муддатсиз"
              : diffDays < 0
              ? `Муддати ўтган: ${Math.abs(diffDays)} кун`
              : `${diffDays} кун қолди`,
          fileUrl: data.fileUrl || null,
          fileName: data.fileName || "",
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
  }, [loadData]);

  useEffect(() => {
    applyFilters();
  }, [docs, showLatestOnly, selectedType, expiryFilter, searchTerm]);

  const applyFilters = () => {
    let filtered = [...docs];

    if (searchTerm) {
      filtered = filtered.filter(
        (d) =>
          d.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          d.docNumber?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedType !== "Все") {
      filtered = filtered.filter((d) => d.name === selectedType);
    }

    if (expiryFilter !== "Все") {
      filtered = filtered.filter((d) => {
        const days = d.diffDays;
        if (expiryFilter === "30 кун") return days <= 30 && days > 15;
        if (expiryFilter === "15 кун") return days <= 15 && days > 5;
        if (expiryFilter === "5 кун") return days <= 5 && days >= 0;
        if (expiryFilter === "Муддати ўтган") return days < 0;
        return true;
      });
    }

    if (showLatestOnly) {
      const latestDocs = {};
      filtered.forEach((d) => {
        if (
          !latestDocs[d.typeId] ||
          d.expiryRaw > latestDocs[d.typeId].expiryRaw
        ) {
          latestDocs[d.typeId] = d;
        }
      });
      filtered = Object.values(latestDocs);
    }

    setFilteredDocs(filtered);
  };

  const getStatusColor = (diffDays) => {
    if (diffDays === Infinity) return "bg-gray-50 border-gray-200";
    if (diffDays < 0) return "bg-red-50 border-red-200";
    if (diffDays <= 5) return "bg-yellow-50 border-yellow-200";
    if (diffDays <= 15) return "bg-orange-50 border-orange-200";
    if (diffDays <= 30) return "bg-blue-50 border-blue-200";
    return "bg-green-50 border-green-200";
  };

  const getStatusDot = (diffDays) => {
    if (diffDays === Infinity) return "bg-gray-400";
    if (diffDays < 0) return "bg-red-500";
    if (diffDays <= 5) return "bg-yellow-500";
    if (diffDays <= 15) return "bg-orange-500";
    if (diffDays <= 30) return "bg-blue-500";
    return "bg-green-500";
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
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">
              {objectData?.objectName || "Объект"} ҳужжатлари
            </h1>
            <p className="text-sm text-gray-500">
              {objectData?.organizationName} • Л/с: {objectData?.billingAccount}
            </p>
          </div>
        </div>

        {/* Кнопка добавления */}
        {canAddDocuments && (
          <motion.button
            onClick={() => setIsModalOpen(true)}
            className="bg-gradient-to-r from-violet-500 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Plus size={20} />
            Янги ҳужжат қўшиш
          </motion.button>
        )}
      </div>

      {/* Фильтры */}
      <div className="flex flex-wrap gap-3 mb-6 bg-white rounded-xl p-4 shadow-sm">
        <div className="flex-1 min-w-[200px] relative">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Қидириш..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500"
          />
        </div>

        <select
          value={showLatestOnly ? "latest" : "all"}
          onChange={(e) => setShowLatestOnly(e.target.value === "latest")}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:ring-2 focus:ring-violet-500"
        >
          <option value="all">Барча ҳужжатлар</option>
          <option value="latest">Охирги ҳужжатлар</option>
        </select>

        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:ring-2 focus:ring-violet-500"
        >
          <option value="Все">Барча турлар</option>
          {Object.values(typesMap).map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>

        <select
          value={expiryFilter}
          onChange={(e) => setExpiryFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:ring-2 focus:ring-violet-500"
        >
          <option value="Все">Муддат бўйича</option>
          <option value="30 кун">30 кунгача</option>
          <option value="15 кун">15 кунгача</option>
          <option value="5 кун">5 кунгача</option>
          <option value="Муддати ўтган">Муддати ўтган</option>
        </select>
      </div>

      {/* Карточки документов */}
      {filteredDocs.length === 0 ? (
        <div className="text-center py-16">
          <FileText className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-lg font-semibold text-gray-600">
            Ҳужжатлар топилмади
          </h3>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredDocs.map((doc, index) => (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              whileHover={{ scale: 1.02 }}
              className={`rounded-2xl p-5 border ${getStatusColor(
                doc.diffDays
              )}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                    <FileText className="text-violet-600" size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 text-sm leading-tight">
                      {doc.name}
                    </h3>
                    <p className="text-xs text-gray-500">№ {doc.docNumber}</p>
                  </div>
                </div>
                <div
                  className={`w-3 h-3 rounded-full ${getStatusDot(
                    doc.diffDays
                  )}`}
                />
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500 flex items-center gap-1">
                    <Clock size={14} /> Берилган
                  </span>
                  <span className="text-gray-700">{doc.issueDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 flex items-center gap-1">
                    <Clock size={14} /> Тугаш
                  </span>
                  <span className="text-gray-700">{doc.expiryDate}</span>
                </div>
                <div className="pt-2 border-t">
                  <span
                    className={`text-sm font-medium ${
                      doc.diffDays === Infinity
                        ? "text-gray-600"
                        : doc.diffDays < 0
                        ? "text-red-600"
                        : doc.diffDays <= 5
                        ? "text-yellow-600"
                        : doc.diffDays <= 15
                        ? "text-orange-600"
                        : doc.diffDays <= 30
                        ? "text-blue-600"
                        : "text-green-600"
                    }`}
                  >
                    {doc.daysLeft}
                  </span>
                </div>
              </div>

              {doc.fileUrl && (
                <a
                  href={doc.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-2 text-violet-600 hover:text-violet-700 text-sm font-medium"
                >
                  <Download size={16} />
                  Файлни очиш
                </a>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Модальное окно добавления */}
      {canAddDocuments && (
        <AddDocumentModalByObject
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          objectId={id}
          objectData={objectData}
          onDocumentAdded={loadData}
        />
      )}
    </div>
  );
};

export default ObjectDocuments;
