// src/components/Plombalar/AddPlombModal.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  query,
  where,
} from "firebase/firestore";
import { db } from "../../firebase/config";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Shield,
  Search,
  Calendar,
  Save,
  AlertCircle,
  CheckCircle,
  QrCode,
  MapPin,
  Building,
  Factory,
  ChevronDown,
  ShieldCheck,
  ShieldOff,
  Package,
} from "lucide-react";
import { useAppStore } from "../../lib/zustand";
import { useLogger } from "../../hooks/useLogger";
import { MODULES } from "../../services/logger";
import { toast } from "react-hot-toast";
import QrScannerModal from "./QrScannerModal";

const AddPlombModal = ({
  isOpen,
  onClose,
  meter = null,
  object = null,
  onAdded,
  fromObjects = false,
}) => {
  const { userData } = useAppStore();
  const { logCreate, logUpdate, logError } = useLogger();

  const [myPlombs, setMyPlombs] = useState([]);
  const [myObjects, setMyObjects] = useState([]);
  const [meterTypes, setMeterTypes] = useState([]);
  const [allPlombs, setAllPlombs] = useState([]); // Все пломбы для проверки установленных
  const [selectedObject, setSelectedObject] = useState(null);
  const [selectedMeter, setSelectedMeter] = useState(null);
  const [availableMeters, setAvailableMeters] = useState([]);
  const [availableParts, setAvailableParts] = useState([]);

  const [formData, setFormData] = useState({
    objectId: "",
    objectName: "",
    meterId: "",
    meterSerialNumber: "",
    meterTypeName: "",
    meterTypeId: "",
    installedDate: new Date().toISOString().split("T")[0],
    latitude: null,
    longitude: null,
    locationAccuracy: null,
  });

  const [showObjectDropdown, setShowObjectDropdown] = useState(false);
  const [showMeterDropdown, setShowMeterDropdown] = useState(false);
  const [objectSearchTerm, setObjectSearchTerm] = useState("");
  const [locationStatus, setLocationStatus] = useState("idle");

  // Модалка установки пломбы на конкретную часть
  const [selectedPart, setSelectedPart] = useState(null);
  const [isInstallPartModalOpen, setIsInstallPartModalOpen] = useState(false);

  // Модалка снятия пломбы
  const [partToRemove, setPartToRemove] = useState(null);
  const [isRemovePlombOpen, setIsRemovePlombOpen] = useState(false);
  const [removalDate, setRemovalDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [removing, setRemoving] = useState(false);

  // QR-сканер
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);

  const currentUserId = userData?.uid;

  const isMobile = useMemo(() => {
    if (typeof window === "undefined") return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  }, []);

  // === Загрузка данных ===
  const loadData = useCallback(async () => {
    if (!currentUserId) return;

    try {
      const [myPlombsSnap, allPlombsSnap, objectsSnap, meterTypesSnap] =
        await Promise.all([
          getDocs(
            query(
              collection(db, "plombs"),
              where("assignedTo", "==", currentUserId)
            )
          ),
          getDocs(collection(db, "plombs")),
          getDocs(collection(db, "objects")),
          getDocs(collection(db, "meterTypes")),
        ]);

      setMyPlombs(myPlombsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setAllPlombs(allPlombsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setMeterTypes(
        meterTypesSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
      );

      const userCityIds = userData.selectedCities || [];
      const allObjects = objectsSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      const filteredObjects = allObjects.filter(
        (obj) => obj.cityId && userCityIds.includes(obj.cityId)
      );
      setMyObjects(filteredObjects);
    } catch (error) {
      console.error("Ошибка загрузки:", error);
      await logError(
        MODULES.SETTINGS,
        `Маълумотларни юклашда хатолик: ${error.message}`
      );
    }
  }, [currentUserId, userData?.selectedCities, logError]);

  // === Инициализация при открытии ===
  useEffect(() => {
    if (!isOpen) return;

    loadData();

    if (fromObjects && meter && object) {
      setFormData({
        objectId: object.id,
        objectName: object.objectName,
        meterId: meter.id,
        meterSerialNumber: meter.serialNumber,
        meterTypeName: meter.meterTypeName,
        meterTypeId: meter.meterTypeId || "",
        installedDate: new Date().toISOString().split("T")[0],
        latitude: null,
        longitude: null,
        locationAccuracy: null,
      });
      setSelectedObject(object);
      setSelectedMeter(meter);
    } else {
      setFormData({
        objectId: "",
        objectName: "",
        meterId: "",
        meterSerialNumber: "",
        meterTypeName: "",
        meterTypeId: "",
        installedDate: new Date().toISOString().split("T")[0],
        latitude: null,
        longitude: null,
        locationAccuracy: null,
      });
      setSelectedObject(null);
      setSelectedMeter(null);
    }

    setObjectSearchTerm("");

    if (isMobile) {
      getLocation();
    }
  }, [isOpen, fromObjects, meter, object, isMobile, loadData]);

  // === Подгрузка частей при выборе типа счётчика ===
  useEffect(() => {
    if (!formData.meterTypeId || meterTypes.length === 0) {
      setAvailableParts([]);
      return;
    }

    const meterType = meterTypes.find((t) => t.id === formData.meterTypeId);
    if (meterType && meterType.plombParts) {
      // Преобразуем части в массив с именами
      const partsArray = meterType.plombParts
        .map((part) => {
          if (typeof part === "string") return { name: part };
          return { name: part.name };
        })
        .filter((p) => p.name && p.name.trim());

      setAvailableParts(partsArray);
    } else {
      setAvailableParts([]);
    }
  }, [formData.meterTypeId, meterTypes]);

  // === Для каждой части ищем установленную пломбу ===
  const getPartPlombStatus = useCallback(
    (partName) => {
      if (!formData.meterId) return { installed: null, available: null };

      // Ищем установленную пломбу на этот метр + часть
      const installedPlomb = allPlombs.find(
        (p) =>
          p.installedMeterId === formData.meterId &&
          p.installedPartName === partName &&
          !p.removedDate // ещё не снята
      );

      if (installedPlomb) {
        return { installed: installedPlomb, available: null };
      }

      // Пломбы в наличии у пользователя (не установленные)
      const availablePlombs = myPlombs.filter(
        (p) => !p.installedOn && !p.removedDate
      );

      return { installed: null, available: availablePlombs };
    },
    [allPlombs, myPlombs, formData.meterId]
  );

  // === Геолокация ===
  const getLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus("error");
      return;
    }

    setLocationStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData((prev) => ({
          ...prev,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          locationAccuracy: position.coords.accuracy,
        }));
        setLocationStatus("success");
      },
      (error) => {
        console.error("Ошибка геолокации:", error);
        setLocationStatus("error");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // === Обработчики ===
  const handleObjectSelect = (obj) => {
    setSelectedObject(obj);
    setFormData((prev) => ({
      ...prev,
      objectId: obj.id,
      objectName: obj.objectName,
      meterId: "",
      meterSerialNumber: "",
      meterTypeName: "",
      meterTypeId: "",
    }));
    setSelectedMeter(null);
    setAvailableParts([]);
    setShowObjectDropdown(false);
    setObjectSearchTerm(obj.objectName);
    loadObjectMeters(obj.id);
  };

  const loadObjectMeters = async (objectId) => {
    try {
      const metersSnap = await getDocs(
        query(collection(db, "meters"), where("objectId", "==", objectId))
      );
      const allMeters = metersSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      const activeMeters = allMeters.filter((m) => !m.installedTo);
      setAvailableMeters(activeMeters);
    } catch (error) {
      console.error("Ошибка загрузки счётчиков:", error);
      setAvailableMeters([]);
    }
  };

  const handleMeterSelect = (meter) => {
    setSelectedMeter(meter);
    setFormData((prev) => ({
      ...prev,
      meterId: meter.id,
      meterSerialNumber: meter.serialNumber,
      meterTypeName: meter.meterTypeName,
      meterTypeId: meter.meterTypeId || "",
    }));
    setShowMeterDropdown(false);
  };

  // === Установка пломбы на часть ===
  const handleOpenInstallPart = (partName) => {
    setSelectedPart(partName);
    setIsInstallPartModalOpen(true);
  };

  const handleCloseInstallPart = () => {
    setSelectedPart(null);
    setIsInstallPartModalOpen(false);
  };

  // === Снятие пломбы с части ===
  const handleOpenRemovePart = (partName, plomb) => {
    setPartToRemove({ partName, plomb });
    setRemovalDate(new Date().toISOString().split("T")[0]);
    setIsRemovePlombOpen(true);
  };

  const handleCloseRemovePart = () => {
    setPartToRemove(null);
    setIsRemovePlombOpen(false);
  };

  const handleRemovePlomb = async () => {
    if (!partToRemove || !removalDate) {
      toast.error("Санани танланг");
      return;
    }

    setRemoving(true);
    try {
      await updateDoc(doc(db, "plombs", partToRemove.plomb.id), {
        removedDate: removalDate,
        removedBy: currentUserId,
        removedByEmail: userData?.email || "",
        status: "Олиб ташланган",
        removedAt: new Date(),
      });

      await logUpdate(
        MODULES.SETTINGS,
        `Пломба олиб ташланди: ${partToRemove.plomb.series}-${partToRemove.plomb.number} (${partToRemove.partName})`,
        partToRemove.plomb.id
      );

      toast.success("Пломба олиб ташланди");
      await loadData();
      handleCloseRemovePart();
      if (onAdded) await onAdded();
    } catch (error) {
      console.error("Ошибка снятия пломбы:", error);
      await logError(
        MODULES.SETTINGS,
        `Пломбани олиб ташлашда хатолик: ${error.message}`
      );
      toast.error("Хатолик: " + error.message);
    } finally {
      setRemoving(false);
    }
  };

  // === QR успешно отсканирован ===
  const handleQrScan = (decodedText) => {
    setIsQrScannerOpen(false);
    handleQrResult(decodedText);
  };

  const handleQrResult = async (decodedText) => {
    try {
      console.log("🔵 QR отсканирован:", decodedText);

      const urlParts = decodedText.split("/").filter(Boolean);
      const markerIndex = urlParts.findIndex(
        (part) =>
          part.toLowerCase() === "metrologiyatexkarta" ||
          part.toLowerCase().includes("metrologiya")
      );

      let series = "";
      let number = "";

      if (markerIndex !== -1 && urlParts.length > markerIndex + 2) {
        series = urlParts[markerIndex + 1];
        number = urlParts[markerIndex + 2];
      } else if (urlParts.length >= 2) {
        series = urlParts[urlParts.length - 2];
        number = urlParts[urlParts.length - 1];
      } else {
        toast.error("QR код формати нотўғри");
        return;
      }

      console.log("✅ Серия:", series, "Номер:", number);

      // Ищем пломбу
      const snap = await getDocs(
        query(
          collection(db, "plombs"),
          where("series", "==", series),
          where("number", "==", number)
        )
      );

      if (snap.empty) {
        toast.error(`Пломба ${series}-${number} тизимда топилмади`);
        return;
      }

      const plombData = { id: snap.docs[0].id, ...snap.docs[0].data() };

      if (plombData.installedOn && !plombData.removedDate) {
        toast.error("Бу пломба аллақачон ўрнатилган");
        return;
      }

      if (plombData.assignedTo !== currentUserId) {
        toast.error("Бу пломба сизга бириктирилмаган");
        return;
      }

      // Открываем модалку установки с выбранной пломбой
      setScannedPlomb(plombData);
      setSelectedPart(null);
      setIsInstallPartModalOpen(true);
    } catch (error) {
      console.error("Ошибка обработки QR:", error);
      toast.error("QR кодни ўқишда хатолик");
    }
  };

  // Состояние отсканированной пломбы
  const [scannedPlomb, setScannedPlomb] = useState(null);

  const handleClose = () => {
    setScannedPlomb(null);
    setSelectedPart(null);
    setIsInstallPartModalOpen(false);
    setIsRemovePlombOpen(false);
    setObjectSearchTerm("");
    onClose();
  };

  const filteredObjects = useMemo(() => {
    if (!objectSearchTerm) return myObjects.slice(0, 50);
    const lower = objectSearchTerm.toLowerCase();
    return myObjects
      .filter(
        (o) =>
          o.objectName?.toLowerCase().includes(lower) ||
          o.billingAccount?.toLowerCase().includes(lower) ||
          o.organizationName?.toLowerCase().includes(lower)
      )
      .slice(0, 50);
  }, [myObjects, objectSearchTerm]);

  if (!isOpen) return null;

  return (
    <>
      <AnimatePresence>
        <motion.div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
        >
          <motion.div
            className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[95vh] overflow-hidden flex flex-col"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-green-500 to-teal-600 text-white p-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Shield size={22} />
                  Пломба ўрнатиш
                </h2>
                <button
                  onClick={handleClose}
                  className="w-8 h-8 rounded-full bg-white bg-opacity-20 flex items-center justify-center hover:bg-opacity-30"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Объект */}
              <div className="relative">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                  <Building size={16} />
                  Истеъмолчи (объект) *
                </label>

                {fromObjects && object ? (
                  <div className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-700 font-medium">
                    {object.objectName}
                  </div>
                ) : (
                  <>
                    <div
                      onClick={() => setShowObjectDropdown(!showObjectDropdown)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl cursor-pointer flex items-center justify-between hover:border-green-300 bg-white"
                    >
                      <span
                        className={
                          formData.objectName
                            ? "text-gray-800"
                            : "text-gray-400"
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
                              placeholder="Объект қидириш..."
                              autoFocus
                              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
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
                              className="px-4 py-3 hover:bg-green-50 cursor-pointer border-b last:border-b-0"
                            >
                              <div className="font-medium text-gray-800">
                                {obj.objectName}
                              </div>
                              <div className="text-xs text-gray-500">
                                {obj.organizationName} • Л/с:{" "}
                                {obj.billingAccount}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Счётчик */}
              {formData.objectId && (
                <div className="relative">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <Factory size={16} />
                    Ҳисоблагич *
                  </label>

                  {fromObjects && meter ? (
                    <div className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-700">
                      <div className="font-medium">{meter.meterTypeName}</div>
                      <div className="text-sm font-mono text-gray-500">
                        № {meter.serialNumber}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div
                        onClick={() => setShowMeterDropdown(!showMeterDropdown)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl cursor-pointer flex items-center justify-between hover:border-green-300 bg-white"
                      >
                        <span
                          className={
                            formData.meterSerialNumber
                              ? "text-gray-800"
                              : "text-gray-400"
                          }
                        >
                          {formData.meterSerialNumber
                            ? `${formData.meterTypeName} №${formData.meterSerialNumber}`
                            : "Ҳисоблагични танланг..."}
                        </span>
                        <ChevronDown
                          size={18}
                          className={`text-gray-400 transition-transform ${
                            showMeterDropdown ? "rotate-180" : ""
                          }`}
                        />
                      </div>

                      {showMeterDropdown && (
                        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                          {availableMeters.length === 0 ? (
                            <div className="px-4 py-3 text-gray-500 text-center text-sm">
                              Бу объектда фаол ҳисоблагич топилмади
                            </div>
                          ) : (
                            availableMeters.map((m) => (
                              <div
                                key={m.id}
                                onClick={() => handleMeterSelect(m)}
                                className="px-4 py-3 hover:bg-green-50 cursor-pointer border-b last:border-b-0"
                              >
                                <div className="font-medium text-gray-800">
                                  {m.meterTypeName}
                                </div>
                                <div className="text-sm font-mono text-gray-500">
                                  № {m.serialNumber}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Дата установки (общая) */}
              {formData.meterId && (
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <Calendar size={16} />
                    Ўрнатиш санаси
                  </label>
                  <input
                    type="date"
                    value={formData.installedDate}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        installedDate: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500"
                  />
                </div>
              )}

              {/* Части пломб - список */}
              {formData.meterId && availableParts.length > 0 && (
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-800">
                      <Shield size={18} />
                      Пломба ўрнатиладиган қисмлар
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        setScannedPlomb(null);
                        setSelectedPart(null);
                        setIsInstallPartModalOpen(true);
                      }}
                      className="flex items-center gap-2 text-xs px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                    >
                      <QrCode size={14} />
                      Скан QR
                    </button>
                  </div>

                  <div className="space-y-2">
                    {availableParts.map((part, index) => {
                      const { installed, available } = getPartPlombStatus(
                        part.name
                      );

                      return (
                        <div
                          key={index}
                          className={`flex items-center justify-between p-3 rounded-xl border-2 ${
                            installed
                              ? "bg-green-50 border-green-300"
                              : "bg-gray-50 border-gray-200"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                installed ? "bg-green-200" : "bg-gray-200"
                              }`}
                            >
                              {installed ? (
                                <ShieldCheck
                                  className="text-green-700"
                                  size={20}
                                />
                              ) : (
                                <Shield className="text-gray-500" size={20} />
                              )}
                            </div>
                            <div>
                              <div className="font-semibold text-gray-800">
                                {part.name}
                              </div>
                              {installed ? (
                                <div className="text-xs text-green-700">
                                  Ўрнатилган: {installed.series}-
                                  {installed.number}
                                </div>
                              ) : (
                                <div className="text-xs text-gray-500">
                                  Ўрнатилмаган
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex gap-2">
                            {installed ? (
                              <button
                                onClick={() =>
                                  handleOpenRemovePart(part.name, installed)
                                }
                                className="flex items-center gap-1 px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm"
                              >
                                <ShieldOff size={14} />
                                Снять
                              </button>
                            ) : (
                              <button
                                onClick={() => handleOpenInstallPart(part.name)}
                                disabled={!available || available.length === 0}
                                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm ${
                                  available && available.length > 0
                                    ? "bg-green-500 text-white hover:bg-green-600"
                                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                                }`}
                              >
                                <Package size={14} />
                                Ўрнатиш
                                {available && (
                                  <span className="ml-1 text-xs">
                                    ({available.length})
                                  </span>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {myPlombs.filter((p) => !p.installedOn && !p.removedDate)
                    .length === 0 && (
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
                      Сизда остатокда пломбалар йўқ. Администраторга мурожаат
                      қилинг.
                    </div>
                  )}
                </div>
              )}

              {/* Если нет частей */}
              {formData.meterId && availableParts.length === 0 && (
                <div className="border-t pt-4">
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
                    <AlertCircle
                      className="text-yellow-600 flex-shrink-0 mt-0.5"
                      size={18}
                    />
                    <div className="text-sm text-yellow-700">
                      <b>
                        Бу ҳисоблагич турида пломба ўрнатиладиган қисмлар йўқ
                      </b>
                      <p className="mt-1">
                        Администратордан ҳисоблагич турига қисмларни қўшишни
                        сўранг (Меню: Ҳисоблагич турлари)
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Геолокация */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <MapPin size={16} />
                    Жойлашув
                  </label>
                  <button
                    type="button"
                    onClick={getLocation}
                    className="text-xs px-3 py-1.5 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600"
                  >
                    {locationStatus === "loading" ? "Юкланмоқда..." : "Янгилаш"}
                  </button>
                </div>

                {formData.latitude && formData.longitude ? (
                  <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                    <div className="font-mono text-sm text-indigo-800">
                      {formData.latitude.toFixed(6)},{" "}
                      {formData.longitude.toFixed(6)}
                    </div>
                    {formData.locationAccuracy && (
                      <div className="text-xs text-indigo-600 mt-1">
                        Аниқлик: ±{Math.round(formData.locationAccuracy)} м
                      </div>
                    )}
                  </div>
                ) : locationStatus === "error" ? (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
                    Жойлашувни олишда хатолик
                  </div>
                ) : (
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500">
                    {isMobile
                      ? "Жойлашув аниқланмоқда..."
                      : "Компьютерда жойлашув олинмайди"}
                  </div>
                )}
              </div>
            </div>

            <div className="border-t px-6 py-4 bg-gray-50 flex gap-3 justify-end">
              <button
                onClick={handleClose}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-100"
              >
                Ёпиш
              </button>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {/* Модалка установки пломбы на часть */}
      {isInstallPartModalOpen && (
        <InstallPartPlombModal
          isOpen={isInstallPartModalOpen}
          onClose={() => {
            handleCloseInstallPart();
            setScannedPlomb(null);
          }}
          selectedPart={selectedPart}
          parts={availableParts}
          scannedPlomb={scannedPlomb}
          availablePlombs={myPlombs.filter(
            (p) => !p.installedOn && !p.removedDate
          )}
          formData={formData}
          currentUserId={currentUserId}
          userEmail={userData?.email || ""}
          onQrScan={() => setIsQrScannerOpen(true)}
          onInstalled={async () => {
            await loadData();
            if (onAdded) await onAdded();
          }}
          logCreate={logCreate}
          logError={logError}
        />
      )}

      {/* Модалка снятия пломбы */}
      <AnimatePresence>
        {isRemovePlombOpen && partToRemove && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[65] p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCloseRemovePart}
          >
            <motion.div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-red-500 to-pink-600 text-white p-4 flex justify-between items-center">
                <h3 className="font-bold flex items-center gap-2">
                  <ShieldOff size={18} />
                  Пломбани олиб ташлаш
                </h3>
                <button
                  onClick={handleCloseRemovePart}
                  className="w-8 h-8 rounded-full bg-white bg-opacity-20 flex items-center justify-center"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-xs text-gray-500">Қисм:</div>
                  <div className="font-semibold text-gray-800">
                    {partToRemove.partName}
                  </div>
                  <div className="text-xs text-gray-500 mt-2">Пломба:</div>
                  <div className="font-mono font-semibold text-gray-800">
                    {partToRemove.plomb.series}-{partToRemove.plomb.number}
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <Calendar size={16} />
                    Олиб ташлаш санаси *
                  </label>
                  <input
                    type="date"
                    value={removalDate}
                    onChange={(e) => setRemovalDate(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              <div className="border-t px-5 py-4 bg-gray-50 flex gap-3 justify-end">
                <button
                  onClick={handleCloseRemovePart}
                  disabled={removing}
                  className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-100"
                >
                  Бекор
                </button>
                <button
                  onClick={handleRemovePlomb}
                  disabled={removing || !removalDate}
                  className={`px-5 py-2 rounded-lg font-semibold flex items-center gap-2 ${
                    removing || !removalDate
                      ? "bg-gray-300 text-gray-500"
                      : "bg-red-500 text-white hover:bg-red-600"
                  }`}
                >
                  {removing ? "Олиб ташланмоқда..." : "Олиб ташлаш"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* QR-сканер */}
      <QrScannerModal
        isOpen={isQrScannerOpen}
        onClose={() => setIsQrScannerOpen(false)}
        onScan={handleQrScan}
      />
    </>
  );
};

// =============================================
// Подкомпонент: модалка установки пломбы на конкретную часть
// =============================================
const InstallPartPlombModal = ({
  isOpen,
  onClose,
  selectedPart,
  parts,
  scannedPlomb,
  availablePlombs,
  formData,
  currentUserId,
  userEmail,
  onQrScan,
  onInstalled,
  logCreate,
  logError,
}) => {
  const [chosenPart, setChosenPart] = useState(selectedPart || "");
  const [chosenPlombId, setChosenPlombId] = useState(scannedPlomb?.id || "");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setChosenPart(selectedPart || "");
  }, [selectedPart]);

  useEffect(() => {
    if (scannedPlomb) {
      setChosenPlombId(scannedPlomb.id);
    }
  }, [scannedPlomb]);

  const chosenPlomb = useMemo(() => {
    if (scannedPlomb && scannedPlomb.id === chosenPlombId) return scannedPlomb;
    return availablePlombs.find((p) => p.id === chosenPlombId) || null;
  }, [chosenPlombId, availablePlombs, scannedPlomb]);

  const filteredPlombs = useMemo(() => {
    if (!search) return availablePlombs.slice(0, 30);
    const lower = search.toLowerCase();
    return availablePlombs
      .filter(
        (p) =>
          p.series?.toLowerCase().includes(lower) ||
          p.number?.toLowerCase().includes(lower)
      )
      .slice(0, 30);
  }, [availablePlombs, search]);

  const handleInstall = async () => {
    if (!chosenPart) {
      toast.error("Қисмни танланг");
      return;
    }
    if (!chosenPlombId) {
      toast.error("Пломбани танланг");
      return;
    }
    if (!formData.installedDate) {
      toast.error("Ўрнатиш санасини танланг");
      return;
    }

    setSaving(true);
    try {
      await updateDoc(doc(db, "plombs", chosenPlombId), {
        installedOn: formData.objectId,
        installedMeterId: formData.meterId,
        installedPartName: chosenPart,
        installedDate: formData.installedDate,
        installedBy: currentUserId,
        installedByEmail: userEmail,
        status: "Ўрнатилган",
        location: {
          latitude: formData.latitude,
          longitude: formData.longitude,
          accuracy: formData.locationAccuracy,
        },
        installedAt: new Date(),
      });

      const plombInfo = chosenPlomb || {};
      await logCreate(
        MODULES.SETTINGS,
        `Пломба ўрнатилди: ${plombInfo.series}-${plombInfo.number} → ${formData.objectName} (${chosenPart})`,
        chosenPlombId
      );

      toast.success(`Пломба ўрнатилди: ${chosenPart}`);
      if (onInstalled) await onInstalled();
      onClose();
    } catch (error) {
      console.error("Ошибка установки:", error);
      await logError(
        MODULES.SETTINGS,
        `Пломба ўрнатишда хатолик: ${error.message}`
      );
      toast.error("Хатолик: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[65] p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.9 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-gradient-to-r from-green-500 to-teal-600 text-white p-4 flex justify-between items-center">
            <h3 className="font-bold flex items-center gap-2">
              <ShieldCheck size={18} />
              Пломба ўрнатиш
            </h3>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white bg-opacity-20 flex items-center justify-center"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Выбор части (если не была выбрана) */}
            {!selectedPart && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Қисм *
                </label>
                <select
                  value={chosenPart}
                  onChange={(e) => setChosenPart(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Қисмни танланг</option>
                  {parts.map((p, i) => (
                    <option key={i} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {selectedPart && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="text-xs text-green-700">Қисм:</div>
                <div className="font-semibold text-green-800">
                  {selectedPart}
                </div>
              </div>
            )}

            {/* Выбор пломбы */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Пломба *
                </label>
                <button
                  type="button"
                  onClick={onQrScan}
                  className="flex items-center gap-1 text-xs px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  <QrCode size={14} />
                  Скан QR
                </button>
              </div>

              {chosenPlomb ? (
                <div className="p-3 bg-green-50 border-2 border-green-300 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="font-mono font-bold text-green-800">
                      {chosenPlomb.series}-{chosenPlomb.number}
                    </div>
                    <div className="text-xs text-green-600">
                      Партия: {chosenPlomb.batchNumber}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setChosenPlombId("");
                    }}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Search
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                      size={16}
                    />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Пломба қидириш..."
                      className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                    {filteredPlombs.length === 0 ? (
                      <div className="px-4 py-3 text-gray-500 text-center text-sm">
                        {availablePlombs.length === 0
                          ? "Сизда остатокда пломбалар йўқ"
                          : "Пломбалар топилмади"}
                      </div>
                    ) : (
                      filteredPlombs.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => setChosenPlombId(p.id)}
                          className="px-4 py-2 hover:bg-green-50 cursor-pointer border-b last:border-b-0 flex items-center justify-between"
                        >
                          <div>
                            <div className="font-mono font-medium text-gray-800">
                              {p.series}-{p.number}
                            </div>
                            <div className="text-xs text-gray-500">
                              {p.batchNumber}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Дата установки */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <Calendar size={16} />
                Ўрнатиш санаси *
              </label>
              <div className="px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-700">
                {formData.installedDate}
              </div>
            </div>
          </div>

          <div className="border-t px-5 py-4 bg-gray-50 flex gap-3 justify-end">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-100"
            >
              Бекор
            </button>
            <button
              onClick={handleInstall}
              disabled={saving || !chosenPart || !chosenPlombId}
              className={`px-5 py-2 rounded-lg font-semibold flex items-center gap-2 ${
                saving || !chosenPart || !chosenPlombId
                  ? "bg-gray-300 text-gray-500"
                  : "bg-green-500 text-white hover:bg-green-600"
              }`}
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
                  <Save size={16} />
                  Ўрнатиш
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AddPlombModal;
