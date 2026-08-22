// src/pages/Documents/DocumentTypes.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
  collection,
  onSnapshot,
  setDoc,
  updateDoc,
  doc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../../firebase/config";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  X,
  Edit,
  Save,
  Search,
  FileText,
  CheckCircle,
  AlertCircle,
  Trash2,
  Palette,
  Clock,
} from "lucide-react";
import { useAppStore } from "../../lib/zustand";
import { useLogger } from "../../hooks/useLogger";
import { MODULES } from "../../services/logger";
import { toast } from "react-hot-toast";

const DocumentTypes = () => {
  const { language } = useAppStore();
  const { logCreate, logUpdate, logDelete, logError } = useLogger();

  const [docTypes, setDocTypes] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedType, setSelectedType] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [saving, setSaving] = useState(false);

  const [newType, setNewType] = useState({
    id: "",
    name: "",
    number: "",
    path: "",
    color: "#16a34a",
    validity: "expiration",
  });

  // Загрузка данных в реальном времени
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "document_types"), (snapshot) => {
      const typesData = snapshot.docs.map((d) => ({
        firebaseId: d.id,
        ...d.data(),
      }));
      // Сортируем по номеру
      typesData.sort((a, b) => (a.number || 0) - (b.number || 0));
      setDocTypes(typesData);
    });
    return () => unsub();
  }, []);

  const checkFormValidity = () => {
    const currentData = isCreating ? newType : selectedType;
    if (!currentData) return false;
    return (
      currentData.name?.trim() &&
      currentData.number?.trim() &&
      currentData.path?.trim() &&
      currentData.color &&
      currentData.validity
    );
  };

  const filteredTypes = docTypes.filter(
    (type) =>
      type.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      type.number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      type.path?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleInputChange = (field, value) => {
    if (isCreating) {
      setNewType((prev) => ({ ...prev, [field]: value }));
    } else {
      setSelectedType((prev) => ({ ...prev, [field]: value }));
    }
  };

  const handleTypeClick = (type) => {
    setSelectedType({ ...type });
    setIsModalOpen(true);
    setIsEditMode(false);
  };

  const handleCreateType = () => {
    setIsCreating(true);
    setIsModalOpen(true);
    setNewType({
      id: "",
      name: "",
      number: "",
      path: "",
      color: "#16a34a",
      validity: "expiration",
    });
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setIsEditMode(false);
    setIsCreating(false);
    setSelectedType(null);
  };

  const handleEdit = () => {
    setIsEditMode(true);
  };

  const handleSave = async () => {
    if (!checkFormValidity()) {
      toast.error("Барча мажбурий қаторларни тўлдиринг");
      return;
    }

    setSaving(true);
    try {
      if (isCreating) {
        await setDoc(doc(db, "document_types", newType.id), {
          name: newType.name,
          number: newType.number,
          path: newType.path,
          color: newType.color,
          validity: newType.validity,
          createdAt: new Date(),
        });
        await logCreate(
          MODULES.DOCUMENTS,
          `Ҳужжат тури яратилди: ${newType.name}`,
          newType.id
        );
        toast.success("Ҳужжат тури яратилди");
      } else {
        await updateDoc(doc(db, "document_types", selectedType.firebaseId), {
          name: selectedType.name,
          number: selectedType.number,
          path: selectedType.path,
          color: selectedType.color,
          validity: selectedType.validity,
          updatedAt: new Date(),
        });
        await logUpdate(
          MODULES.DOCUMENTS,
          `Ҳужжат тури янгиланди: ${selectedType.name}`,
          selectedType.firebaseId
        );
        toast.success("Ҳужжат тури янгиланди");
      }

      handleCloseModal();
    } catch (error) {
      console.error("Error saving document type:", error);
      await logError(
        MODULES.DOCUMENTS,
        `Ҳужжат турини сақлашда хатолик: ${error.message}`
      );
      toast.error("Сақлашда хатолик");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedType) return;

    if (!window.confirm("Ҳужжат турини ўчиришни тасдиқлайсизми?")) return;

    try {
      await deleteDoc(doc(db, "document_types", selectedType.firebaseId));
      await logDelete(
        MODULES.DOCUMENTS,
        `Ҳужжат тури ўчирилди: ${selectedType.name}`,
        selectedType.firebaseId
      );
      toast.success("Ҳужжат тури ўчирилди");
      handleCloseModal();
    } catch (error) {
      console.error("Error deleting document type:", error);
      toast.error("Ўчиришда хатолик");
    }
  };

  const handleCancel = () => {
    if (isCreating) {
      handleCloseModal();
    } else {
      setIsEditMode(false);
      const originalType = docTypes.find(
        (type) => type.firebaseId === selectedType.firebaseId
      );
      setSelectedType(originalType ? { ...originalType } : null);
    }
  };

  const isFormValid = checkFormValidity();

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-purple-100 p-4 lg:p-8">
      {/* Заголовок */}
      <motion.div
        className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-800 mb-2">
            Ҳужжат турлари
          </h1>
          <p className="text-gray-600">Ҳужжат турларини бошқариш</p>
        </div>

        <motion.button
          className="bg-gradient-to-r from-violet-500 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2 w-full lg:w-auto justify-center"
          onClick={handleCreateType}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Plus size={20} />
          Ҳужжат тури қўшиш
        </motion.button>
      </motion.div>

      {/* Поиск */}
      <motion.div
        className="bg-white rounded-2xl shadow-sm p-4 mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
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
      </motion.div>

      {/* Таблица */}
      <motion.div
        className="bg-white rounded-2xl shadow-sm overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-violet-500 to-purple-600 text-white">
                <th className="px-4 py-4 text-left font-semibold w-16">№</th>
                <th className="px-4 py-4 text-left font-semibold">Номер</th>
                <th className="px-4 py-4 text-left font-semibold">Номи</th>
                <th className="px-4 py-4 text-left font-semibold hidden md:table-cell">
                  Йўл
                </th>
                <th className="px-4 py-4 text-left font-semibold">Ранг</th>
                <th className="px-4 py-4 text-left font-semibold hidden sm:table-cell">
                  Муддати
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredTypes.map((type, index) => (
                <motion.tr
                  key={type.firebaseId}
                  onClick={() => handleTypeClick(type)}
                  className="hover:bg-violet-50 transition-colors duration-200 cursor-pointer group"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  whileHover={{ scale: 1.01 }}
                >
                  <td className="px-4 py-4 text-gray-600">{index + 1}</td>
                  <td className="px-4 py-4 text-gray-600">
                    {type.number || "—"}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center group-hover:bg-violet-200 transition-colors">
                        <FileText className="text-violet-600" size={20} />
                      </div>
                      <div className="font-semibold text-gray-800">
                        {type.name}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-gray-600 hidden md:table-cell">
                    {type.path}
                  </td>
                  <td className="px-4 py-4">
                    <div
                      className="w-8 h-8 rounded-full border-2 border-gray-200 shadow-sm"
                      style={{ backgroundColor: type.color }}
                    />
                  </td>
                  <td className="px-4 py-4 hidden sm:table-cell">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        type.validity === "infinity"
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {type.validity === "infinity" ? "Муддатсиз" : "Муддатли"}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredTypes.length === 0 && (
          <motion.div
            className="text-center py-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
          >
            <FileText className="mx-auto text-gray-400 mb-4" size={48} />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">
              {searchTerm
                ? "Ҳужжат турлари топилмади"
                : "Ҳужжат турлари қўшилмаган"}
            </h3>
            {!searchTerm && (
              <button
                onClick={handleCreateType}
                className="bg-violet-500 text-white px-6 py-2 rounded-lg hover:bg-violet-600 transition-colors"
              >
                Ҳужжат тури қўшиш
              </button>
            )}
          </motion.div>
        )}
      </motion.div>

      {/* Модальное окно */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCloseModal}
          >
            <motion.div
              className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Заголовок */}
              <div className="bg-gradient-to-r from-violet-500 to-purple-600 text-white p-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold">
                    {isCreating
                      ? "Ҳужжат тури яратиш"
                      : isEditMode
                      ? "Ҳужжат турини таҳрирлаш"
                      : "Ҳужжат тури ҳақида маълумот"}
                  </h2>
                  <motion.button
                    onClick={handleCloseModal}
                    className="w-8 h-8 rounded-full bg-white bg-opacity-20 flex items-center justify-center hover:bg-opacity-30 transition-all"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <X size={18} />
                  </motion.button>
                </div>
              </div>

              {/* Форма */}
              <div className="p-6 max-h-[60vh] overflow-y-auto">
                <div className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        ID *
                      </label>
                      <input
                        type="text"
                        value={isCreating ? newType.id : selectedType?.id || ""}
                        onChange={(e) =>
                          handleInputChange("id", e.target.value)
                        }
                        disabled={!isCreating && !isEditMode}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all disabled:bg-gray-50 disabled:text-gray-500"
                        placeholder="doc_001"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Номер *
                      </label>
                      <input
                        type="text"
                        value={
                          isCreating
                            ? newType.number
                            : selectedType?.number || ""
                        }
                        onChange={(e) =>
                          handleInputChange("number", e.target.value)
                        }
                        disabled={!isCreating && !isEditMode}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all disabled:bg-gray-50 disabled:text-gray-500"
                        placeholder="1"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Номи *
                    </label>
                    <input
                      type="text"
                      value={
                        isCreating ? newType.name : selectedType?.name || ""
                      }
                      onChange={(e) =>
                        handleInputChange("name", e.target.value)
                      }
                      disabled={!isCreating && !isEditMode}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all disabled:bg-gray-50 disabled:text-gray-500"
                      placeholder="Ҳужжат номини киритинг"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Йўл *
                    </label>
                    <input
                      type="text"
                      value={
                        isCreating ? newType.path : selectedType?.path || ""
                      }
                      onChange={(e) =>
                        handleInputChange("path", e.target.value)
                      }
                      disabled={!isCreating && !isEditMode}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all disabled:bg-gray-50 disabled:text-gray-500"
                      placeholder="/documents/certificates"
                    />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                        <Palette size={16} />
                        Ранг *
                      </label>
                      <input
                        type="color"
                        value={
                          isCreating
                            ? newType.color
                            : selectedType?.color || "#16a34a"
                        }
                        onChange={(e) =>
                          handleInputChange("color", e.target.value)
                        }
                        disabled={!isCreating && !isEditMode}
                        className="w-full h-12 px-2 py-1 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all disabled:bg-gray-50"
                      />
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                        <Clock size={16} />
                        Муддати *
                      </label>
                      <select
                        value={
                          isCreating
                            ? newType.validity
                            : selectedType?.validity || "expiration"
                        }
                        onChange={(e) =>
                          handleInputChange("validity", e.target.value)
                        }
                        disabled={!isCreating && !isEditMode}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all disabled:bg-gray-50 disabled:text-gray-500"
                      >
                        <option value="expiration">Муддатли</option>
                        <option value="infinity">Муддатсиз</option>
                      </select>
                    </div>
                  </div>

                  {/* Индикатор */}
                  {(isCreating || isEditMode) && (
                    <div className="border-t pt-6">
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
                            <AlertCircle
                              className="text-orange-500"
                              size={16}
                            />
                            <span className="text-orange-600">
                              Барча мажбурий қаторлар тўлдиринг (*)
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Кнопки */}
              <div className="border-t px-6 py-4 bg-gray-50">
                <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
                  <div className="flex gap-3">
                    {!isCreating && !isEditMode && (
                      <>
                        <motion.button
                          onClick={handleEdit}
                          className="px-6 py-3 bg-violet-500 text-white rounded-xl font-semibold hover:bg-violet-600 transition-colors flex items-center gap-2"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Edit size={16} />
                          Таҳрирлаш
                        </motion.button>
                        <motion.button
                          onClick={handleDelete}
                          className="px-6 py-3 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition-colors flex items-center gap-2"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Trash2 size={16} />
                          Ўчириш
                        </motion.button>
                      </>
                    )}
                  </div>

                  {(isCreating || isEditMode) && (
                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                      <motion.button
                        onClick={handleCancel}
                        className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-100 transition-colors"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        Бекор
                      </motion.button>
                      <motion.button
                        onClick={handleSave}
                        disabled={saving || !isFormValid}
                        className={`px-6 py-3 rounded-xl font-semibold transition-colors flex items-center gap-2 justify-center ${
                          saving || !isFormValid
                            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                            : "bg-green-500 text-white hover:bg-green-600 cursor-pointer"
                        }`}
                        whileHover={!saving ? { scale: 1.02 } : {}}
                        whileTap={!saving ? { scale: 0.98 } : {}}
                      >
                        {saving ? (
                          <motion.div
                            className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                            animate={{ rotate: 360 }}
                            transition={{
                              duration: 1,
                              repeat: Infinity,
                              ease: "linear",
                            }}
                          />
                        ) : (
                          <Save size={16} />
                        )}
                        Сақлаш
                      </motion.button>
                    </div>
                  )}

                  {!isCreating && !isEditMode && (
                    <motion.button
                      onClick={handleCloseModal}
                      className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-100 transition-colors"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Ёпиш
                    </motion.button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DocumentTypes;
