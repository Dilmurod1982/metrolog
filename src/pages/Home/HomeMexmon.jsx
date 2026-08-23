// src/pages/Home/HomeMexmon.jsx
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
  MapPin,
} from "lucide-react";
import { useAppStore } from "../../lib/zustand";
import { useLogger } from "../../hooks/useLogger";
import { MODULES } from "../../services/logger";

const HomeMexmon = () => {
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
    totalCities: 0,
    latestDocuments: [],
  });

  const userCityIds = useMemo(() => {
    return userData?.selectedCities || [];
  }, [userData?.selectedCities]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [docsSnap, objectsSnap] = await Promise.all([
        getDocs(collection(db, "documents")),
        getDocs(collection(db, "objects")),
      ]);

      const docs = docsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const objects = objectsSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const filteredObjects = objects.filter(
        (obj) => obj.cityId && userCityIds.includes(obj.cityId)
      );
      const filteredObjectIds = new Set(filteredObjects.map((obj) => obj.id));

      const filteredDocs = docs.filter(
        (doc) => doc.objectId && filteredObjectIds.has(doc.objectId)
      );

      const latestDocsMap = {};
      const now = new Date();

      filteredDocs.forEach((doc) => {
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
          } else if (currentExpiry > existingExpiry) {
            latestDocsMap[key] = { ...doc, expiryRaw: expiry, issueRaw: issue };
          }
        }
      });

      const latestDocs = Object.values(latestDocsMap);

      let expiredDocs = 0;
      let criticalDocs = 0;
      let warningDocs = 0;
      let attentionDocs = 0;
      let activeDocs = 0;

      latestDocs.forEach((doc) => {
        const expiry = doc.expiryRaw;
        const diffDays = expiry
          ? Math.ceil((expiry - now) / (1000 * 60 * 60 * 24))
          : Infinity;

        if (diffDays === Infinity) {
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
      });

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
            filteredObjects.find((obj) => obj.id === doc.objectId) || {};
          const expiry = doc.expiryRaw;
          const diffDays = expiry
            ? Math.ceil((expiry - now) / (1000 * 60 * 60 * 24))
            : Infinity;
          return {
            ...doc,
            objectName: objectInfo.objectName || "—",
            organizationName: objectInfo.organizationName || "—",
            cityName: objectInfo.cityName || "—",
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
        totalObjects: filteredObjects.length,
        totalCities: userCityIds.length,
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
  }, [logError, userCityIds]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
      <div className="mb-8">
        <h1 className="text-3xl lg:text-4xl font-bold text-gray-800 mb-2">
          Асосий панель
        </h1>
        <p className="text-gray-600">
          Хуш келибсиз, {userData?.firstName} {userData?.lastName}!
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
        <p className="text-blue-700 text-sm flex items-center gap-2">
          <MapPin size={16} />
          Сизга бириктирилган ҳудудлар: {userCityIds.length} та шаҳар/туман
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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

      <div className="bg-white rounded-2xl p-6 shadow-sm mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-6">
          Ҳужжатлар ҳолати
        </h2>
        {stats.totalDocs > 0 ? (
          <>
            <div className="flex h-8 rounded-full overflow-hidden bg-gray-100">
              {stats.expiredDocs > 0 && (
                <div
                  className="bg-red-500 h-full"
                  style={{
                    width: `${(stats.expiredDocs / stats.totalDocs) * 100}%`,
                  }}
                />
              )}
              {stats.criticalDocs > 0 && (
                <div
                  className="bg-yellow-500 h-full"
                  style={{
                    width: `${(stats.criticalDocs / stats.totalDocs) * 100}%`,
                  }}
                />
              )}
              {stats.warningDocs > 0 && (
                <div
                  className="bg-orange-500 h-full"
                  style={{
                    width: `${(stats.warningDocs / stats.totalDocs) * 100}%`,
                  }}
                />
              )}
              {stats.attentionDocs > 0 && (
                <div
                  className="bg-blue-500 h-full"
                  style={{
                    width: `${(stats.attentionDocs / stats.totalDocs) * 100}%`,
                  }}
                />
              )}
              {stats.activeDocs > 0 && (
                <div
                  className="bg-green-500 h-full"
                  style={{
                    width: `${(stats.activeDocs / stats.totalDocs) * 100}%`,
                  }}
                />
              )}
            </div>
            <div className="flex flex-wrap gap-4 mt-4 text-sm">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500" /> Муддати
                ўтган ({stats.expiredDocs})
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-yellow-500" /> 5
                кунгача ({stats.criticalDocs})
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-orange-500" /> 15
                кунгача ({stats.warningDocs})
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-500" /> 30 кунгача
                ({stats.attentionDocs})
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-green-500" /> Фаол (
                {stats.activeDocs})
              </span>
            </div>
          </>
        ) : (
          <p className="text-center text-gray-400 py-4">Ҳужжатлар топилмади</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-4 shadow-sm text-center"
        >
          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center mx-auto mb-2">
            <Factory className="text-indigo-600" size={20} />
          </div>
          <p className="text-2xl font-bold text-gray-800">
            {stats.totalObjects}
          </p>
          <p className="text-xs text-gray-500">Объектлар</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl p-4 shadow-sm text-center"
        >
          <div className="w-10 h-10 bg-pink-100 rounded-xl flex items-center justify-center mx-auto mb-2">
            <MapPin className="text-pink-600" size={20} />
          </div>
          <p className="text-2xl font-bold text-gray-800">
            {stats.totalCities}
          </p>
          <p className="text-xs text-gray-500">Шаҳар/туман</p>
        </motion.div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Охирги ҳужжатлар (муддати яқин)
        </h2>
        <div className="space-y-3">
          {stats.latestDocuments.slice(0, 5).map((doc) => (
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
                    {doc.organizationName} • {doc.cityName}
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

export default HomeMexmon;
