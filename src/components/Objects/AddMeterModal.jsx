// src/components/Objects/AddMeterModal.jsx
import React, { useState, useEffect } from "react";
import { collection, getDocs, addDoc, query, where } from "firebase/firestore";
import { db } from "../../firebase/config";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Gauge,
  Hash,
  Calendar,
  Save,
  AlertCircle,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { useAppStore } from "../../lib/zustand";
import { useLogger } from "../../hooks/useLogger";
import { MODULES } from "../../services/logger";
import { toast } from "react-hot-toast";

const AddMeterModal = ({ isOpen, onClose, objectId, objectName, onAdded }) => {
  const { userData } = useAppStore();
  const { logCreate, logError } = useLogger();

  const [meterTypes, setMeterTypes] = useState([]);
  const [formData, setFormData] = useState({
    meterTypeId: "",
    meterTypeName: "",
    serialNumber: "",
    installedFrom: new Date().toISOString().split("T")[0],
  });
  const [saving, setSaving] = useState(false);
  const [serialCheck, setSerialCheck] = useState({
    checking: false,
    exists: false,
    objectName: "",
  });

  // Загрузка типов счётчиков
  useEffect(() => {
    const loadMeterTypes = async () => {
      if (!isOpen) return;
      try {
        const snap = await getDocs(collection(db, "meterTypes"));
        setMeterTypes(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error("Ошибка загрузки типов счётчиков:", error);
      }
    };
    loadMeterTypes();

    // Сброс формы
    setFormData({
      meterTypeId: "",
      meterTypeName: "",
      serialNumber: "",
      installedFrom: new Date().toISOString().split("T")[0],
    });
    setSerialCheck({ checking: false, exists: false, objectName: "" });
  }, [isOpen]);

  // Проверка уникальности серийного номера
  const checkSerialNumber = async (serialNumber) => {
    if (!serialNumber || serialNumber.trim().length < 3) {
      setSerialCheck({ checking: false, exists: false, objectName: "" });
      return;
    }

    setSerialCheck((prev) => ({ ...prev, checking: true }));

    try {
      const metersRef = collection(db, "meters");
      const q = query(
        metersRef,
        where("serialNumber", "==", serialNumber.trim())
      );
      const snap = await getDocs(q);

      // Ищем активный счётчик (без installedTo)
      const activeMeter = snap.docs.find((doc) => {
        const data = doc.data();
        return !data.installedTo;
      });

      if (activeMeter) {
        const meterData = activeMeter.data();
        // Получаем имя объекта, где установлен счётчик
        let existingObjectName = "ноаниқ объект";
        try {
          const objSnap = await getDocs(
            query(
              collection(db, "objects"),
              where("__name__", "==", meterData.objectId)
            )
          );
          if (!objSnap.empty) {
            existingObjectName = objSnap.docs[0].data().objectName;
          }
        } catch (e) {
          console.error(e);
        }

        setSerialCheck({
          checking: false,
          exists: true,
          objectName: existingObjectName,
        });
      } else {
        setSerialCheck({
          checking: false,
          exists: false,
          objectName: "",
        });
      }
    } catch (error) {
      console.error("Ошибка проверки серийного номера:", error);
      setSerialCheck({ checking: false, exists: false, objectName: "" });
    }
  };

  const handleSerialNumberChange = (value) => {
    setFormData((prev) => ({ ...prev, serialNumber: value }));
    // Debounce проверки
    clearTimeout(window._serialCheckTimer);
    window._serialCheckTimer = setTimeout(() => {
      checkSerialNumber(value);
    }, 500);
  };

  const handleMeterTypeChange = (typeId) => {
    const type = meterTypes.find((t) => t.id === typeId);
    setFormData((prev) => ({
      ...prev,
      meterTypeId: typeId,
      meterTypeName: type?.name || "",
    }));
  };

  const checkFormValidity = () => {
    return (
      formData.meterTypeId &&
      formData.serialNumber?.trim() &&
      formData.installedFrom &&
      !serialCheck.exists &&
      !serialCheck.checking
    );
  };

  const handleSave = async () => {
    if (!checkFormValidity()) {
      toast.error("Барча мажбурий қаторларни тўғри тўлдиринг");
      return;
    }

    setSaving(true);
    try {
      await addDoc(collection(db, "meters"), {
        objectId,
        objectName,
        meterTypeId: formData.meterTypeId,
        meterTypeName: formData.meterTypeName,
        serialNumber: formData.serialNumber.trim(),
        installedFrom: formData.installedFrom,
        installedTo: null,
        isActive: true,
        createdBy: userData?.email || "",
        createdAt: new Date(),
      });

      await logCreate(
        MODULES.OBJECTS,
        `Ҳисоблагич ўрнатилди: ${formData.meterTypeName} №${formData.serialNumber}`,
        objectId
      );

      toast.success("Ҳисоблагич муваффақиятли ўрнатилди");
      if (onAdded) await onAdded();
      onClose();
    } catch (error) {
      console.error("Ошибка сохранения счётчика:", error);
      await logError(
        MODULES.OBJECTS,
        `Ҳисоблагич сақлашда хатолик: ${error.message}`
      );
      toast.error("Сақлашда хатолик");
    } finally {
      setSaving(false);
    }
  };

  const isFormValid = checkFormValidity();

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-gradient-to-r from-indigo-500 to-blue-600 text-white p-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Gauge size={22} />
                  Ҳисоблагич ўрнатиш
                </h2>
                <p className="text-sm text-indigo-100 mt-1">{objectName}</p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white bg-opacity-20 flex items-center justify-center hover:bg-opacity-30"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Тип счётчика */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <Gauge size={16} />
                Ҳисоблагич тури *
              </label>
              <select
                value={formData.meterTypeId}
                onChange={(e) => handleMeterTypeChange(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Ҳисоблагич турини танланг</option>
                {meterTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name} ({type.type})
                  </option>
                ))}
              </select>
            </div>

            {/* Заводской номер */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <Hash size={16} />
                Завод рақами *
              </label>
              <input
                type="text"
                value={formData.serialNumber}
                onChange={(e) => handleSerialNumberChange(e.target.value)}
                placeholder="Завод рақамини киритинг"
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 ${
                  serialCheck.exists
                    ? "border-red-300 focus:ring-red-500"
                    : "border-gray-200 focus:ring-indigo-500"
                }`}
              />

              {/* Индикатор проверки */}
              {serialCheck.checking && (
                <div className="mt-2 flex items-center gap-2 text-sm text-blue-600">
                  <motion.div
                    className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  />
                  Текширилмоқда...
                </div>
              )}

              {serialCheck.exists && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2"
                >
                  <XCircle
                    className="text-red-500 flex-shrink-0 mt-0.5"
                    size={18}
                  />
                  <div className="text-sm text-red-700">
                    <b>Бу ҳисоблагич бошқа объектда ўрнатилган!</b>
                    <p className="mt-1">
                      Объект: <b>{serialCheck.objectName}</b>
                    </p>
                    <p className="text-xs mt-1">
                      Бу рақамли ҳисоблагич ҳозирда фаол ҳолатда.
                    </p>
                  </div>
                </motion.div>
              )}

              {!serialCheck.exists &&
                !serialCheck.checking &&
                formData.serialNumber.length >= 3 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-2 flex items-center gap-2 text-sm text-green-600"
                  >
                    <CheckCircle size={16} />
                    Завод рақами бўш
                  </motion.div>
                )}
            </div>

            {/* Дата установки ОТ */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <Calendar size={16} />
                Ўрнатилган сана (от) *
              </label>
              <input
                type="date"
                value={formData.installedFrom}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    installedFrom: e.target.value,
                  }))
                }
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Дата снятия ДО */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <Calendar size={16} />
                Олиб ташланган сана (гача)
              </label>
              <input
                type="date"
                value=""
                disabled
                placeholder=""
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-400"
              />
              <p className="text-xs text-gray-500 mt-1">
                Янги ҳисоблагич ўрнатилганда автоматик тўлдирилади
              </p>
            </div>

            {/* Индикатор валидности */}
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
                      {serialCheck.exists
                        ? "Бу завод рақами банд"
                        : "Барча мажбурий қаторларни тўлдиринг"}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="border-t px-6 py-4 bg-gray-50 flex gap-3 justify-end">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-100"
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
                "Сақланмоқда..."
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

export default AddMeterModal;
