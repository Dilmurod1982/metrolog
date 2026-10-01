// src/components/Plombalar/AddPlombModal.jsx
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
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
} from "lucide-react";
import { useAppStore } from "../../lib/zustand";
import { useLogger } from "../../hooks/useLogger";
import { MODULES } from "../../services/logger";
import { toast } from "react-hot-toast";
import { Html5Qrcode } from "html5-qrcode";

const AddPlombModal = ({
  isOpen,
  onClose,
  meter = null,
  object = null,
  onAdded,
  fromObjects = false,
}) => {
  const { userData } = useAppStore();
  const { logCreate, logError } = useLogger();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [myPlombs, setMyPlombs] = useState([]);
  const [myObjects, setMyObjects] = useState([]);
  const [selectedObject, setSelectedObject] = useState(null);
  const [selectedMeter, setSelectedMeter] = useState(null);
  const [availableMeters, setAvailableMeters] = useState([]);

  const [formData, setFormData] = useState({
    objectId: "",
    objectName: "",
    meterId: "",
    meterSerialNumber: "",
    meterTypeName: "",
    plombId: "",
    series: "",
    number: "",
    installedDate: new Date().toISOString().split("T")[0],
    latitude: null,
    longitude: null,
    locationAccuracy: null,
  });

  const [showObjectDropdown, setShowObjectDropdown] = useState(false);
  const [showMeterDropdown, setShowMeterDropdown] = useState(false);
  const [showPlombDropdown, setShowPlombDropdown] = useState(false);
  const [plombSearchTerm, setPlombSearchTerm] = useState("");
  const [objectSearchTerm, setObjectSearchTerm] = useState("");
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);
  const [qrError, setQrError] = useState("");
  const [validationError, setValidationError] = useState("");
  const [locationStatus, setLocationStatus] = useState("idle");

  const qrScannerRef = useRef(null);
  const qrContainerRef = useRef(null);

  // ВСЕГДА используем uid
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

    setLoading(true);
    try {
      // Пломбы пользователя по UID
      const plombsSnap = await getDocs(
        query(
          collection(db, "plombs"),
          where("assignedTo", "==", currentUserId)
        )
      );
      const plombsData = plombsSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setMyPlombs(plombsData);

      // Объекты из прикреплённых городов
      const userCityIds = userData.selectedCities || [];
      const objectsSnap = await getDocs(collection(db, "objects"));
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
    } finally {
      setLoading(false);
    }
  }, [currentUserId, userData?.selectedCities, logError]);

  // === Инициализация ===
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
        plombId: "",
        series: "",
        number: "",
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
        plombId: "",
        series: "",
        number: "",
        installedDate: new Date().toISOString().split("T")[0],
        latitude: null,
        longitude: null,
        locationAccuracy: null,
      });
      setSelectedObject(null);
      setSelectedMeter(null);
    }

    setValidationError("");
    setPlombSearchTerm("");
    setObjectSearchTerm("");

    if (isMobile) {
      getLocation();
    }
  }, [isOpen, fromObjects, meter, object, isMobile, loadData]);

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
        toast.error("Жойлашувни олишда хатолик");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
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
    }));
    setSelectedMeter(null);
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
    }));
    setShowMeterDropdown(false);
  };

  const handlePlombSelect = (plomb) => {
    setFormData((prev) => ({
      ...prev,
      plombId: plomb.id,
      series: plomb.series,
      number: plomb.number,
    }));
    setShowPlombDropdown(false);
    setPlombSearchTerm("");
    setValidationError("");
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (field === "series" || field === "number") {
      setValidationError("");
      const newSeries = field === "series" ? value : formData.series;
      const newNumber = field === "number" ? value : formData.number;
      validatePlomb(newSeries, newNumber);
    }
  };

  // === Валидация ===
  const validatePlomb = (series, number) => {
    if (!series || !number) {
      setValidationError("");
      return;
    }

    const found = myPlombs.find(
      (p) =>
        p.series?.toLowerCase() === series.toLowerCase() && p.number === number
    );

    if (!found) {
      checkPlombInDatabase(series, number);
      return;
    }

    if (found.installedOn) {
      setValidationError("Бу пломба аллақачон ўрнатилган");
      return;
    }

    setValidationError("");
    setFormData((prev) => ({ ...prev, plombId: found.id }));
  };

  const checkPlombInDatabase = async (series, number) => {
    try {
      const snap = await getDocs(
        query(
          collection(db, "plombs"),
          where("series", "==", series),
          where("number", "==", number)
        )
      );

      if (snap.empty) {
        setValidationError("Бундай пломба тизимда топилмади");
        return;
      }

      const plombData = { id: snap.docs[0].id, ...snap.docs[0].data() };

      if (plombData.installedOn) {
        setValidationError("Бу пломба аллақачон ўрнатилган");
        return;
      }

      if (plombData.assignedTo !== currentUserId) {
        setValidationError(
          "Бу пломба сизга бириктирилмаган. Администраторга мурожаат қилинг."
        );
        return;
      }

      setValidationError("");
      setFormData((prev) => ({ ...prev, plombId: plombData.id }));
    } catch (error) {
      console.error("Ошибка проверки пломбы:", error);
    }
  };

  // === QR-сканер ===
  const startQrScanner = () => {
    setQrError("");
    setIsQrScannerOpen(true);
  };

  useEffect(() => {
    if (!isQrScannerOpen || !qrContainerRef.current) return;

    const scanner = new Html5Qrcode("qr-reader");
    qrScannerRef.current = scanner;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          handleQrResult(decodedText);
          scanner.stop().then(() => setIsQrScannerOpen(false));
        },
        () => {}
      )
      .catch((err) => {
        console.error("Ошибка запуска QR-сканера:", err);
        setQrError("Камерани ишга туширишда хатолик");
      });

    return () => {
      if (qrScannerRef.current) {
        qrScannerRef.current
          .stop()
          .catch((err) => console.log("Scanner stop error:", err));
      }
    };
  }, [isQrScannerOpen]);

  const handleQrResult = async (decodedText) => {
    try {
      const urlParts = decodedText.split("/").filter(Boolean);
      if (urlParts.length < 2) {
        setQrError("QR код формати нотўғри");
        toast.error("QR код формати нотўғри");
        return;
      }

      const number = urlParts[urlParts.length - 1];
      const series = urlParts[urlParts.length - 2];

      setFormData((prev) => ({ ...prev, series, number }));

      await validatePlombFromQr(series, number);
    } catch (error) {
      console.error("Ошибка обработки QR:", error);
      toast.error("QR кодни ўқишда хатолик");
    }
  };

  const validatePlombFromQr = async (series, number) => {
    try {
      const snap = await getDocs(
        query(
          collection(db, "plombs"),
          where("series", "==", series),
          where("number", "==", number)
        )
      );

      if (snap.empty) {
        setValidationError("Бундай пломба тизимда топилмади");
        toast.error("Пломба тизимда топилмади");
        return;
      }

      const plombData = { id: snap.docs[0].id, ...snap.docs[0].data() };

      if (plombData.installedOn) {
        let existingObjectName = "ноаниқ";
        try {
          const objSnap = await getDocs(
            query(
              collection(db, "objects"),
              where("__name__", "==", plombData.installedOn)
            )
          );
          if (!objSnap.empty) {
            existingObjectName = objSnap.docs[0].data().objectName;
          }
        } catch (e) {
          console.error(e);
        }

        setValidationError(
          `Бу пломба аллақачон ўрнатилган! Объект: ${existingObjectName}`
        );
        toast.error("Пломба аллақачон ўрнатилган");
        return;
      }

      if (plombData.assignedTo !== currentUserId) {
        setValidationError(
          "Бу пломба сизга бириктирилмаган. Администраторга мурожаат қилинг."
        );
        toast.error("Пломба сизга бириктирилмаган");
        return;
      }

      setValidationError("");
      setFormData((prev) => ({ ...prev, plombId: plombData.id }));
      toast.success(`Пломба топилди: ${series}-${number}`);
    } catch (error) {
      console.error("Ошибка валидации:", error);
      setValidationError("Пломбани текширишда хатолик");
    }
  };

  // === Сохранение ===
  const checkFormValidity = () => {
    return (
      formData.objectId &&
      formData.meterId &&
      formData.plombId &&
      formData.installedDate &&
      !validationError
    );
  };

  const handleSave = async () => {
    if (!checkFormValidity()) {
      toast.error("Барча мажбурий қаторларни тўлдиринг");
      return;
    }

    setSaving(true);
    try {
      await updateDoc(doc(db, "plombs", formData.plombId), {
        installedOn: formData.objectId,
        installedMeterId: formData.meterId,
        installedDate: formData.installedDate,
        installedBy: currentUserId,
        installedByEmail: userData?.email || "",
        status: "Ўрнатилган",
        location: {
          latitude: formData.latitude,
          longitude: formData.longitude,
          accuracy: formData.locationAccuracy,
        },
        installedAt: new Date(),
      });

      await logCreate(
        MODULES.SETTINGS,
        `Пломба ўрнатилди: ${formData.series}-${formData.number} → ${formData.objectName}`,
        formData.plombId
      );

      toast.success("Пломба муваффақиятли ўрнатилди");
      if (onAdded) await onAdded();
      onClose();
    } catch (error) {
      console.error("Ошибка сохранения:", error);
      await logError(
        MODULES.SETTINGS,
        `Пломба ўрнатишда хатолик: ${error.message}`
      );
      toast.error("Сақлашда хатолик");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (qrScannerRef.current) {
      qrScannerRef.current
        .stop()
        .catch((err) => console.log("Scanner stop error:", err));
    }
    setIsQrScannerOpen(false);
    setValidationError("");
    setPlombSearchTerm("");
    setObjectSearchTerm("");
    onClose();
  };

  // === Фильтры ===
  const filteredPlombs = useMemo(() => {
    let list = myPlombs.filter((p) => !p.installedOn);

    if (plombSearchTerm) {
      const lower = plombSearchTerm.toLowerCase();
      list = list.filter(
        (p) =>
          p.series?.toLowerCase().includes(lower) ||
          p.number?.includes(plombSearchTerm) ||
          p.batchNumber?.toLowerCase().includes(lower)
      );
    }

    return list.slice(0, 50);
  }, [myPlombs, plombSearchTerm]);

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

  const isFormValid = checkFormValidity();

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
      >
        <motion.div
          className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[95vh] overflow-hidden flex flex-col"
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
                              {obj.organizationName} • Л/с: {obj.billingAccount}
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

            {/* Дата */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <Calendar size={16} />
                Ўрнатилган сана *
              </label>
              <input
                type="date"
                value={formData.installedDate}
                onChange={(e) =>
                  handleInputChange("installedDate", e.target.value)
                }
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* Пломба */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <Shield size={16} />
                  Пломба *
                </label>
                <button
                  type="button"
                  onClick={startQrScanner}
                  className="flex items-center gap-1 text-xs px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  <QrCode size={14} />
                  Скан QR
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Серия
                  </label>
                  <input
                    type="text"
                    value={formData.series}
                    onChange={(e) =>
                      handleInputChange("series", e.target.value)
                    }
                    onFocus={() => setShowPlombDropdown(true)}
                    placeholder="FER"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 ${
                      validationError
                        ? "border-red-300 focus:ring-red-500"
                        : "border-gray-200 focus:ring-green-500"
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Номер
                  </label>
                  <input
                    type="text"
                    value={formData.number}
                    onChange={(e) =>
                      handleInputChange("number", e.target.value)
                    }
                    onFocus={() => setShowPlombDropdown(true)}
                    placeholder="0166248"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 ${
                      validationError
                        ? "border-red-300 focus:ring-red-500"
                        : "border-gray-200 focus:ring-green-500"
                    }`}
                  />
                </div>
              </div>

              {showPlombDropdown && !formData.plombId && (
                <div className="relative">
                  <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                    <div className="p-2 border-b sticky top-0 bg-white z-10">
                      <div className="relative">
                        <Search
                          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                          size={16}
                        />
                        <input
                          type="text"
                          value={plombSearchTerm}
                          onChange={(e) => setPlombSearchTerm(e.target.value)}
                          placeholder="Пломба қидириш..."
                          autoFocus
                          className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                    </div>

                    {filteredPlombs.length === 0 ? (
                      <div className="px-4 py-3 text-gray-500 text-center text-sm">
                        Пломбалар топилмади
                      </div>
                    ) : (
                      filteredPlombs.map((plomb) => (
                        <div
                          key={plomb.id}
                          onClick={() => handlePlombSelect(plomb)}
                          className="px-4 py-2 hover:bg-green-50 cursor-pointer border-b last:border-b-0 flex items-center justify-between"
                        >
                          <div>
                            <div className="font-mono font-medium text-gray-800">
                              {plomb.series}-{plomb.number}
                            </div>
                            <div className="text-xs text-gray-500">
                              {plomb.batchNumber}
                            </div>
                          </div>
                          <CheckCircle className="text-green-500" size={16} />
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {validationError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2"
                >
                  <AlertCircle
                    className="text-red-500 flex-shrink-0 mt-0.5"
                    size={18}
                  />
                  <span className="text-sm text-red-700">
                    {validationError}
                  </span>
                </motion.div>
              )}

              {formData.plombId && !validationError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2"
                >
                  <CheckCircle className="text-green-500" size={16} />
                  <span className="text-sm text-green-700">
                    Пломба тасдиқланди: {formData.series}-{formData.number}
                  </span>
                </motion.div>
              )}
            </div>

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
                  <div className="text-xs text-indigo-700">
                    <b>Координаталар:</b>
                  </div>
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
                  Жойлашувни олишда хатолик. Қўлда текширинг.
                </div>
              ) : (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500">
                  {isMobile
                    ? "Жойлашув аниқланмоқда..."
                    : "Компьютерда жойлашув олинмайди"}
                </div>
              )}
            </div>

            {/* Индикатор */}
            <div className="border-t pt-4">
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
                    <AlertCircle className="text-orange-500" size={16} />
                    <span className="text-orange-600">
                      Барча мажбурий қаторларни тўлдиринг
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Кнопки */}
          <div className="border-t px-6 py-4 bg-gray-50 flex gap-3 justify-end">
            <button
              onClick={handleClose}
              disabled={saving}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-100 disabled:opacity-50"
            >
              Бекор
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !isFormValid}
              className={`px-6 py-3 rounded-xl font-semibold flex items-center gap-2 ${
                saving || !isFormValid
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
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

        {/* QR-сканер */}
        <AnimatePresence>
          {isQrScannerOpen && (
            <motion.div
              className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[60] p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={(e) => {
                e.stopPropagation();
                if (qrScannerRef.current) {
                  qrScannerRef.current.stop().catch((err) => console.log(err));
                }
                setIsQrScannerOpen(false);
              }}
            >
              <motion.div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-4 flex justify-between items-center">
                  <h3 className="font-bold flex items-center gap-2">
                    <QrCode size={20} />
                    QR кодни сканерлаш
                  </h3>
                  <button
                    onClick={() => {
                      if (qrScannerRef.current) {
                        qrScannerRef.current
                          .stop()
                          .catch((err) => console.log(err));
                      }
                      setIsQrScannerOpen(false);
                    }}
                    className="w-8 h-8 rounded-full bg-white bg-opacity-20 flex items-center justify-center"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="p-4">
                  <div
                    id="qr-reader"
                    ref={qrContainerRef}
                    className="w-full rounded-xl overflow-hidden bg-black"
                    style={{ minHeight: "300px" }}
                  />

                  {qrError && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                      {qrError}
                    </div>
                  )}

                  <p className="text-sm text-gray-500 text-center mt-3">
                    QR кодни камерага кўрсатинг
                  </p>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
};

export default AddPlombModal;
