// src/components/AddDocumentModalByObject.jsx
import React, { useState, useRef, useEffect } from "react";
import { collection, addDoc, getDocs } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase/config";
import { motion, AnimatePresence } from "framer-motion";
import { X, FileText, Upload, Save, Calendar, Hash } from "lucide-react";
import { useAppStore } from "../lib/zustand";
import { useLogger } from "../hooks/useLogger";
import { MODULES } from "../services/logger";
import toast from "react-hot-toast";

const AddDocumentModalByObject = ({
  isOpen,
  onClose,
  objectId,
  objectData,
  onDocumentAdded,
}) => {
  const { language } = useAppStore();
  const { logCreate, logError } = useLogger();

  const [formData, setFormData] = useState({
    docType: "",
    docNumber: "",
    issueDate: "",
    expiryDate: "",
  });
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [docTypes, setDocTypes] = useState([]);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const fetchDocTypes = async () => {
      try {
        const snap = await getDocs(collection(db, "document_types"));
        const typesList = snap.docs
          .map((d) => ({
            id: d.data().id || d.id,
            firebaseId: d.id,
            ...(d.data() || {}),
          }))
          .filter((t) => t.validity === "expiration")
          .sort((a, b) => (a.number || 0) - (b.number || 0));
        setDocTypes(typesList);
      } catch (err) {
        console.error("Ошибка загрузки типов документов:", err);
        toast.error("Ҳужжат турларини юклашда хатолик");
      }
    };

    fetchDocTypes();

    setFormData({
      docType: "",
      docNumber: "",
      issueDate: "",
      expiryDate: "",
    });
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [isOpen]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error("Файл ҳажми 10 МБ дан ошмаслиги керак");
      return;
    }
    setFile(selectedFile);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.docType || !formData.docNumber || !formData.issueDate) {
      toast.error("Барча мажбурий қаторларни тўлдиринг");
      return;
    }
    if (!file) {
      toast.error("Файлни танланг");
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Ҳужжат сақланмоқда...");

    try {
      const storagePath = `documents/${formData.docType}/${Date.now()}_${
        file.name
      }`;
      const fileRef = ref(storage, storagePath);
      const snapshot = await uploadBytes(fileRef, file);
      const fileUrl = await getDownloadURL(snapshot.ref);

      const docData = {
        docType: formData.docType,
        docNumber: formData.docNumber,
        issueDate: formData.issueDate,
        expiryDate: formData.expiryDate || "",
        objectId: objectId || "",
        objectName: objectData?.objectName || "",
        organizationName: objectData?.organizationName || "",
        fileName: file.name,
        fileUrl,
        createdAt: new Date(),
      };

      const docRef = await addDoc(collection(db, "documents"), docData);

      await logCreate(
        MODULES.DOCUMENTS,
        `Ҳужжат қўшилди: ${formData.docNumber}`,
        docRef.id
      );

      toast.success("Ҳужжат муваффақиятли қўшилди", { id: toastId });
      if (onDocumentAdded) await onDocumentAdded();
      handleClose();
    } catch (err) {
      console.error("Ошибка при создании документа:", err);
      await logError(
        MODULES.DOCUMENTS,
        `Ҳужжат яратишда хатолик: ${err.message}`
      );
      toast.error("Ҳужжат яратишда хатолик", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      docType: "",
      docNumber: "",
      issueDate: "",
      expiryDate: "",
    });
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    onClose();
  };

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
          className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Заголовок */}
          <div className="bg-gradient-to-r from-violet-500 to-purple-600 text-white p-6 sticky top-0 z-10">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <FileText size={22} />
                Ҳужжат қўшиш
              </h2>
              <motion.button
                onClick={handleClose}
                className="p-2 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 transition-all"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <X size={20} />
              </motion.button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Объект (только для просмотра) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Объект
              </label>
              <input
                type="text"
                value={objectData?.objectName || ""}
                disabled
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-500"
              />
              {objectData?.organizationName && (
                <p className="mt-1 text-xs text-gray-500">
                  {objectData.organizationName}
                </p>
              )}
            </div>

            {/* Тип документа */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <FileText size={16} />
                Ҳужжат тури *
              </label>
              <select
                value={formData.docType}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, docType: e.target.value }))
                }
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
              >
                <option value="">Ҳужжат турини танланг</option>
                {docTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name || t.id}
                  </option>
                ))}
              </select>
            </div>

            {/* Номер документа */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Hash size={16} />
                Ҳужжат рақами *
              </label>
              <input
                type="text"
                value={formData.docNumber}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, docNumber: e.target.value }))
                }
                placeholder="Ҳужжат рақамини киритинг"
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Даты */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <Calendar size={16} />
                  Берилган сана *
                </label>
                <input
                  type="date"
                  value={formData.issueDate}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, issueDate: e.target.value }))
                  }
                  required
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <Calendar size={16} />
                  Тугаш санаси
                </label>
                <input
                  type="date"
                  value={formData.expiryDate}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, expiryDate: e.target.value }))
                  }
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Файл */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Upload size={16} />
                Ҳужжат файли * (max 10 MB)
              </label>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
              />
              {file && (
                <p className="mt-2 text-sm text-green-600">
                  Танланган файл: {file.name}
                </p>
              )}
            </div>

            {/* Кнопки */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
              <motion.button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Бекор
              </motion.button>

              <motion.button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-3 bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {loading ? (
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
                    <Save size={18} />
                    Сақлаш
                  </>
                )}
              </motion.button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AddDocumentModalByObject;
