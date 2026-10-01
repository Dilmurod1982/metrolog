// src/components/Plombalar/AddPlombBatchModal.jsx
import React, { useState } from "react";
import { collection, addDoc, writeBatch, doc } from "firebase/firestore";
import { db } from "../../firebase/config";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Hash,
  Calendar,
  Save,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { useAppStore } from "../../lib/zustand";
import { useLogger } from "../../hooks/useLogger";
import { MODULES } from "../../services/logger";
import { toast } from "react-hot-toast";

const AddPlombBatchModal = ({ isOpen, onClose, onBatchAdded }) => {
  const { userData } = useAppStore();
  const { logCreate, logError } = useLogger();

  const [formData, setFormData] = useState({
    batchNumber: "",
    receivedDate: new Date().toISOString().split("T")[0],
    series: "",
    fromNumber: "",
    toNumber: "",
  });
  const [saving, setSaving] = useState(false);

  // Определяем длину номеров (для добавления ведущих нулей)
  const getNumberLength = () => {
    const from = formData.fromNumber?.toString() || "";
    const to = formData.toNumber?.toString() || "";
    return Math.max(from.length, to.length);
  };

  // Форматируем число с ведущими нулями
  const formatNumber = (num, length) => {
    return String(num).padStart(length, "0");
  };

  const calculateQuantity = () => {
    const from = parseInt(formData.fromNumber);
    const to = parseInt(formData.toNumber);
    if (!isNaN(from) && !isNaN(to) && to >= from) {
      return to - from + 1;
    }
    return 0;
  };

  const checkFormValidity = () => {
    const from = parseInt(formData.fromNumber);
    const to = parseInt(formData.toNumber);
    return (
      formData.batchNumber?.trim() &&
      formData.receivedDate &&
      formData.series?.trim() &&
      !isNaN(from) &&
      !isNaN(to) &&
      to >= from &&
      from >= 0
    );
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!checkFormValidity()) {
      toast.error("Барча мажбурий қаторларни тўғри тўлдиринг");
      return;
    }

    setSaving(true);
    try {
      const quantity = calculateQuantity();
      const fromNum = parseInt(formData.fromNumber);
      const toNum = parseInt(formData.toNumber);
      const numLength = getNumberLength();

      // Создаём партию
      const batchRef = await addDoc(collection(db, "plomb_batches"), {
        batchNumber: formData.batchNumber,
        receivedDate: formData.receivedDate,
        series: formData.series,
        fromNumber: formatNumber(fromNum, numLength), // Сохраняем как строку с нулями
        toNumber: formatNumber(toNum, numLength), // Сохраняем как строку с нулями
        quantity: quantity,
        numberLength: numLength, // Сохраняем длину для справки
        createdBy: userData?.email || "",
        createdAt: new Date(),
      });

      // Создаём каждую пломбу отдельно
      const batch = writeBatch(db);
      for (let i = fromNum; i <= toNum; i++) {
        const plombRef = doc(collection(db, "plombs"));
        batch.set(plombRef, {
          batchId: batchRef.id,
          batchNumber: formData.batchNumber,
          receivedDate: formData.receivedDate,
          series: formData.series,
          number: formatNumber(i, numLength), // ВАЖНО: строка с ведущими нулями
          assignedTo: null,
          assignedDate: null,
          installedOn: null,
          installedDate: null,
          status: "Омборда",
          createdAt: new Date(),
        });
      }
      await batch.commit();

      await logCreate(
        MODULES.SETTINGS,
        `Пломба партияси қўшилди: ${formData.batchNumber} (${quantity} та, ${formData.series})`,
        batchRef.id
      );

      toast.success(`${quantity} та пломба қўшилди`);
      setFormData({
        batchNumber: "",
        receivedDate: new Date().toISOString().split("T")[0],
        series: "",
        fromNumber: "",
        toNumber: "",
      });
      if (onBatchAdded) await onBatchAdded();
      onClose();
    } catch (error) {
      console.error("Ошибка:", error);
      await logError(
        MODULES.SETTINGS,
        `Пломба қўшишда хатолик: ${error.message}`
      );
      toast.error("Сақлашда хатолик: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const isFormValid = checkFormValidity();
  const quantity = calculateQuantity();
  const numLength = getNumberLength();

  // Предпросмотр номеров
  const previewNumbers = () => {
    const from = parseInt(formData.fromNumber);
    const to = parseInt(formData.toNumber);
    if (isNaN(from) || isNaN(to) || to < from) return null;
    return {
      first: formatNumber(from, numLength),
      last: formatNumber(to, numLength),
    };
  };

  const preview = previewNumbers();

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
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">Пломба кирими</h2>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white bg-opacity-20 flex items-center justify-center hover:bg-opacity-30"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Номер партии */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <Hash size={16} />
                Партия рақами *
              </label>
              <input
                type="text"
                value={formData.batchNumber}
                onChange={(e) => handleChange("batchNumber", e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                placeholder="Мисол: ПРТ-001"
              />
            </div>

            {/* Дата поступления */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <Calendar size={16} />
                Келиб тушган сана *
              </label>
              <input
                type="date"
                value={formData.receivedDate}
                onChange={(e) => handleChange("receivedDate", e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Серия */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                Серия *
              </label>
              <input
                type="text"
                value={formData.series}
                onChange={(e) => handleChange("series", e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                placeholder="Мисол: FER"
              />
            </div>

            {/* От - До */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Дан (рақами) *
                </label>
                <input
                  type="text"
                  value={formData.fromNumber}
                  onChange={(e) => {
                    // Разрешаем только цифры
                    const val = e.target.value.replace(/\D/g, "");
                    handleChange("fromNumber", val);
                  }}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono"
                  placeholder="0166001"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Гача (рақами) *
                </label>
                <input
                  type="text"
                  value={formData.toNumber}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    handleChange("toNumber", val);
                  }}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono"
                  placeholder="0166500"
                />
              </div>
            </div>

            {/* Предпросмотр */}
            {preview && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-700 mb-1">
                  <b>Намуна:</b>
                </p>
                <p className="font-mono text-sm text-blue-800">
                  {formData.series || "СЕРИЯ"}-{preview.first} ...{" "}
                  {formData.series || "СЕРИЯ"}-{preview.last}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Жами рақам узунлиги: {numLength} белги
                </p>
              </div>
            )}

            {/* Количество */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Миқдори (автоматик)
              </label>
              <div className="w-full px-4 py-3 border-2 border-indigo-200 rounded-xl bg-indigo-50">
                <span className="text-2xl font-bold text-indigo-600">
                  {quantity}
                </span>
                <span className="text-sm text-indigo-500 ml-2">та пломба</span>
              </div>
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

          <div className="border-t px-6 py-4 bg-gray-50 flex gap-3 justify-end">
            <motion.button
              onClick={onClose}
              disabled={saving}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-100"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Бекор
            </motion.button>
            <motion.button
              onClick={handleSave}
              disabled={saving || !isFormValid}
              className={`px-6 py-3 rounded-xl font-semibold flex items-center gap-2 ${
                saving || !isFormValid
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-green-500 text-white hover:bg-green-600"
              }`}
              whileHover={!saving ? { scale: 1.02 } : {}}
              whileTap={!saving ? { scale: 0.98 } : {}}
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
                  Кирим
                </>
              )}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AddPlombBatchModal;
