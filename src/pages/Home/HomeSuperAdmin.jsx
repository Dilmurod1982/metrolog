// src/pages/Home/HomeSuperAdmin.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase/config";
import { motion } from "framer-motion";
import {
  FileText,
  AlertCircle,
  Clock,
  CheckCircle,
  Factory,
  Building,
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart3,
  PieChart,
  Users,
  MapPin,
} from "lucide-react";
import { useAppStore } from "../../lib/zustand";
import { useLogger } from "../../hooks/useLogger";
import { MODULES } from "../../services/logger";

const HomeSuperAdmin = () => {
  const { language, userData } = useAppStore();
  const { logError } = useLogger();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalDocs: 0,
    expiredDocs: 0,
    criticalDocs: 0,
    warningDocs: 0,
    attentionDocs: 0,
    activeDocs: 0,
    totalObjects: 0,
    totalOrganizations: 0,
    totalUsers: 0,
    totalRegions: 0,
    totalCities: 0,
    documentTypes: [],
    byRegion: [],
    byObjectType: [],
    latestDocuments: [],
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Загрузка всех данных
      const [
        docsSnap,
        objectsSnap,
        orgsSnap,
        usersSnap,
        regionsSnap,
        citiesSnap,
        typesSnap,
      ] = await Promise.all([
        getDocs(collection(db, "documents")),
        getDocs(collection(db, "objects")),
        getDocs(collection(db, "organizations")),
        getDocs(collection(db, "users")),
        getDocs(collection(db, "regions")),
        getDocs(collection(db, "cities")),
        getDocs(collection(db, "document_types")),
      ]);

      const docs = docsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const objects = objectsSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      const types = typesSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Получаем только последние документы для каждого объекта
      const latestDocsMap = {};
      const now = new Date();

      docs.forEach((doc) => {
        const key = doc.objectId;
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
            // Оставляем существующий
          } else if (currentExpiry > existingExpiry) {
            latestDocsMap[key] = { ...doc, expiryRaw: expiry, issueRaw: issue };
          }
        }
      });

      const latestDocs = Object.values(latestDocsMap);

      // Подсчет статистики
      let expiredDocs = 0;
      let criticalDocs = 0; // < 5 дней
      let warningDocs = 0; // 5-15 дней
      let attentionDocs = 0; // 15-30 дней
      let activeDocs = 0; // > 30 дней
      let infinityDocs = 0;

      const byRegionMap = {};
      const byObjectTypeMap = {};
      const byDocTypeMap = {};

      latestDocs.forEach((doc) => {
        const expiry = doc.expiryRaw;
        const diffDays = expiry
          ? Math.ceil((expiry - now) / (1000 * 60 * 60 * 24))
          : Infinity;

        const objectInfo = objects.find((obj) => obj.id === doc.objectId) || {};
        const typeInfo =
          types.find(
            (t) => t.id === doc.docType || t.firebaseId === doc.docType
          ) || {};

        // По срокам
        if (diffDays === Infinity) {
          infinityDocs++;
        } else if (diffDays < 0) {
          expiredDocs++;
        } else if (diffDays <= 5) {
          criticalDocs++;
        } else if (diffDays <= 15) {
          warningDocs++;
        } else if (diffDays <= 30) {
          attentionDocs++;
        } else {
          activeDocs++;
        }

        // По регионам
        const regionName = objectInfo.regionName || "Ноаниқ";
        if (!byRegionMap[regionName]) {
          byRegionMap[regionName] = { total: 0, expired: 0, critical: 0 };
        }
        byRegionMap[regionName].total++;
        if (diffDays < 0) byRegionMap[regionName].expired++;
        if (diffDays > 0 && diffDays <= 5) byRegionMap[regionName].critical++;

        // По типам объектов
        const objectTypeName = objectInfo.objectTypeName || "Ноаниқ";
        if (!byObjectTypeMap[objectTypeName]) {
          byObjectTypeMap[objectTypeName] = { total: 0, expired: 0 };
        }
        byObjectTypeMap[objectTypeName].total++;
        if (diffDays < 0) byObjectTypeMap[objectTypeName].expired++;

        // По типам документов
        const docTypeName = typeInfo.name || doc.docType || "Ноаниқ";
        if (!byDocTypeMap[docTypeName]) {
          byDocTypeMap[docTypeName] = {
            total: 0,
            expired: 0,
            critical: 0,
            color: typeInfo.color || "#16a34a",
          };
        }
        byDocTypeMap[docTypeName].total++;
        if (diffDays < 0) byDocTypeMap[docTypeName].expired++;
        if (diffDays > 0 && diffDays <= 5) byDocTypeMap[docTypeName].critical++;
      });

      // Сортировка
      const byRegion = Object.entries(byRegionMap).sort(
        (a, b) => b[1].total - a[1].total
      );
      const byObjectType = Object.entries(byObjectTypeMap).sort(
        (a, b) => b[1].total - a[1].total
      );
      const documentTypes = Object.entries(byDocTypeMap).sort(
        (a, b) => b[1].total - a[1].total
      );

      // Последние документы (сортировка по дате истечения)
      const latestDocuments = latestDocs
        .sort((a, b) => {
          const aDiff = a.expiryRaw
            ? (a.expiryRaw - now) / (1000 * 60 * 60 * 24)
            : Infinity;
          const bDiff = b.expiryRaw
            ? (b.expiryRaw - now) / (1000 * 60 * 60 * 24)
            : Infinity;
          return aDiff - bDiff;
        })
        .slice(0, 10)
        .map((doc) => {
          const objectInfo =
            objects.find((obj) => obj.id === doc.objectId) || {};
          const expiry = doc.expiryRaw;
          const diffDays = expiry
            ? Math.ceil((expiry - now) / (1000 * 60 * 60 * 24))
            : Infinity;
          return {
            ...doc,
            objectName: objectInfo.objectName || "—",
            organizationName: objectInfo.organizationName || "—",
            daysLeft:
              diffDays === Infinity
                ? "Муддатсиз"
                : diffDays < 0
                ? `${Math.abs(diffDays)} кун ўтган`
                : `${diffDays} кун`,
          };
        });

      setStats({
        totalDocs: latestDocs.length,
        expiredDocs,
        criticalDocs,
        warningDocs,
        attentionDocs,
        activeDocs,
        infinityDocs,
        totalObjects: objectsSnap.size,
        totalOrganizations: orgsSnap.size,
        totalUsers: usersSnap.size,
        totalRegions: regionsSnap.size,
        totalCities: citiesSnap.size,
        documentTypes,
        byRegion,
        byObjectType,
        latestDocuments,
      });
    } catch (error) {
      console.error("Ошибка загрузки статистики:", error);
      await logError(
        MODULES.REPORTS,
        `Статистикани юклашда хатолик: ${error.message}`
      );
    } finally {
      setLoading(false);
    }
  }, [logError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalExpiring =
    stats.criticalDocs + stats.warningDocs + stats.attentionDocs;
  const healthPercent =
    stats.totalDocs > 0
      ? Math.round(
          ((stats.totalDocs - stats.expiredDocs) / stats.totalDocs) * 100
        )
      : 100;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-4 lg:p-8">
      {/* Заголовок */}
      <div className="mb-8">
        <h1 className="text-3xl lg:text-4xl font-bold text-gray-800 mb-2">
          Асосий панель
        </h1>
        <p className="text-gray-600">
          Хуш келибсиз, {userData?.firstName} {userData?.lastName}!
        </p>
      </div>

      {/* Основные показатели */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Всего документов */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-5 shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
              <FileText className="text-indigo-600" size={24} />
            </div>
            <span className="text-3xl font-bold text-gray-800">
              {stats.totalDocs}
            </span>
          </div>
          <p className="text-gray-500 text-sm">Жами ҳужжатлар</p>
        </motion.div>

        {/* Просроченные */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl p-5 shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <AlertCircle className="text-red-600" size={24} />
            </div>
            <span className="text-3xl font-bold text-red-600">
              {stats.expiredDocs}
            </span>
          </div>
          <p className="text-gray-500 text-sm">Муддати ўтган</p>
        </motion.div>

        {/* Критические */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl p-5 shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
              <Clock className="text-yellow-600" size={24} />
            </div>
            <span className="text-3xl font-bold text-yellow-600">
              {stats.criticalDocs}
            </span>
          </div>
          <p className="text-gray-500 text-sm">5 кунгача қолган</p>
        </motion.div>

        {/* Активные */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl p-5 shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <CheckCircle className="text-green-600" size={24} />
            </div>
            <span className="text-3xl font-bold text-green-600">
              {stats.activeDocs}
            </span>
          </div>
          <p className="text-gray-500 text-sm">Фаол ҳужжатлар</p>
        </motion.div>
      </div>

      {/* График состояния */}
      <div className="bg-white rounded-2xl p-6 shadow-sm mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-6">
          Ҳужжатлар ҳолати
        </h2>
        <div className="flex h-8 rounded-full overflow-hidden bg-gray-100">
          {stats.expiredDocs > 0 && (
            <div
              className="bg-red-500 h-full transition-all duration-500"
              style={{
                width: `${(stats.expiredDocs / stats.totalDocs) * 100}%`,
              }}
              title={`Муддати ўтган: ${stats.expiredDocs}`}
            />
          )}
          {stats.criticalDocs > 0 && (
            <div
              className="bg-yellow-500 h-full transition-all duration-500"
              style={{
                width: `${(stats.criticalDocs / stats.totalDocs) * 100}%`,
              }}
              title={`5 кунгача: ${stats.criticalDocs}`}
            />
          )}
          {stats.warningDocs > 0 && (
            <div
              className="bg-orange-500 h-full transition-all duration-500"
              style={{
                width: `${(stats.warningDocs / stats.totalDocs) * 100}%`,
              }}
              title={`15 кунгача: ${stats.warningDocs}`}
            />
          )}
          {stats.attentionDocs > 0 && (
            <div
              className="bg-blue-500 h-full transition-all duration-500"
              style={{
                width: `${(stats.attentionDocs / stats.totalDocs) * 100}%`,
              }}
              title={`30 кунгача: ${stats.attentionDocs}`}
            />
          )}
          {stats.activeDocs > 0 && (
            <div
              className="bg-green-500 h-full transition-all duration-500"
              style={{
                width: `${(stats.activeDocs / stats.totalDocs) * 100}%`,
              }}
              title={`Фаол: ${stats.activeDocs}`}
            />
          )}
        </div>
        <div className="flex flex-wrap gap-4 mt-4 text-sm">
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500" /> Муддати ўтган (
            {stats.expiredDocs})
          </span>
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-yellow-500" /> 5 кунгача (
            {stats.criticalDocs})
          </span>
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-orange-500" /> 15 кунгача (
            {stats.warningDocs})
          </span>
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500" /> 30 кунгача (
            {stats.attentionDocs})
          </span>
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500" /> Фаол (
            {stats.activeDocs})
          </span>
        </div>
      </div>

      {/* Дополнительная статистика */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {[
          {
            label: "Объектлар",
            value: stats.totalObjects,
            icon: Factory,
            color: "bg-indigo-100 text-indigo-600",
          },
          {
            label: "МЧЖ/ЯТТ",
            value: stats.totalOrganizations,
            icon: Building,
            color: "bg-teal-100 text-teal-600",
          },
          {
            label: "Фойдаланувчилар",
            value: stats.totalUsers,
            icon: Users,
            color: "bg-purple-100 text-purple-600",
          },
          {
            label: "Вилоятлар",
            value: stats.totalRegions,
            icon: MapPin,
            color: "bg-pink-100 text-pink-600",
          },
          {
            label: "Шаҳар/туман",
            value: stats.totalCities,
            icon: MapPin,
            color: "bg-cyan-100 text-cyan-600",
          },
        ].map((item, index) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-2xl p-4 shadow-sm text-center"
          >
            <div
              className={`w-10 h-10 ${item.color} rounded-xl flex items-center justify-center mx-auto mb-2`}
            >
              <item.icon size={20} />
            </div>
            <p className="text-2xl font-bold text-gray-800">{item.value}</p>
            <p className="text-xs text-gray-500">{item.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Последние документы */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Охирги ҳужжатлар (муддати яқин)
        </h2>
        <div className="space-y-3">
          {stats.latestDocuments.slice(0, 5).map((doc, index) => (
            <div
              key={doc.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-3 h-3 rounded-full ${
                    doc.daysLeft === "Муддатсиз"
                      ? "bg-gray-400"
                      : doc.daysLeft.includes("ўтган")
                      ? "bg-red-500"
                      : parseInt(doc.daysLeft) <= 5
                      ? "bg-yellow-500"
                      : parseInt(doc.daysLeft) <= 15
                      ? "bg-orange-500"
                      : parseInt(doc.daysLeft) <= 30
                      ? "bg-blue-500"
                      : "bg-green-500"
                  }`}
                />
                <div>
                  <p className="font-medium text-gray-800 text-sm">
                    {doc.objectName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {doc.organizationName}
                  </p>
                </div>
              </div>
              <span
                className={`text-sm font-medium ${
                  doc.daysLeft === "Муддатсиз"
                    ? "text-gray-600"
                    : doc.daysLeft.includes("ўтган")
                    ? "text-red-600"
                    : parseInt(doc.daysLeft) <= 5
                    ? "text-yellow-600"
                    : parseInt(doc.daysLeft) <= 15
                    ? "text-orange-600"
                    : parseInt(doc.daysLeft) <= 30
                    ? "text-blue-600"
                    : "text-green-600"
                }`}
              >
                {doc.daysLeft}
              </span>
            </div>
          ))}
          {stats.latestDocuments.length === 0 && (
            <p className="text-center text-gray-400 py-4">
              Ҳужжатлар топилмади
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomeSuperAdmin;
