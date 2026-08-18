// src/pages/Users/UsersPage.jsx
import React, { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
} from "firebase/firestore";
import { db, auth } from "../../firebase/config";
import { useAppStore } from "../../lib/zustand";
import { translations } from "../../lib/i18n";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  X,
  Edit,
  Save,
  Search,
  Users,
  UserPlus,
  Mail,
  Shield,
  Building,
  CheckCircle,
  AlertCircle,
  Trash2,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useLogger } from "../../hooks/useLogger";
import { MODULES } from "../../services/logger";

const UsersPage = () => {
  const { language, userData: currentUserData } = useAppStore();
  const { logCreate, logUpdate, logError, logView } = useLogger();
  const t = translations[language];

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    middleName: "",
    phone: "",
    role: "metrolog",
    organization: "",
    position: "",
    isActive: true,
    accessEndDate: "",
  });
  const [uniqueErrors, setUniqueErrors] = useState({
    email: "",
  });
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Проверяем, является ли текущий пользователь superadmin
  const isSuperAdmin = currentUserData?.role === "superadmin";
  const isAdmin = currentUserData?.role === "admin";

  // Все роли
  const allRoles = [
    {
      value: "superadmin",
      label: "Super Admin",
      color: "bg-purple-100 text-purple-800",
    },
    { value: "admin", label: "Admin", color: "bg-red-100 text-red-800" },
    {
      value: "tummetrolog",
      label: "Tum Metrolog",
      color: "bg-blue-100 text-blue-800",
    },
    {
      value: "metrolog",
      label: "Metrolog",
      color: "bg-green-100 text-green-800",
    },
    { value: "mexmon", label: "Mexmon", color: "bg-gray-100 text-gray-800" },
  ];

  // Роли, доступные для выбора (без superadmin для админа)
  const availableRoles = isSuperAdmin
    ? allRoles
    : allRoles.filter((role) => role.value !== "superadmin");

  useEffect(() => {
    fetchUsers();

    // Логируем просмотр страницы
    logView(MODULES.USERS, "Просмотр списка пользователей");
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const usersRef = collection(db, "users");
      const querySnapshot = await getDocs(usersRef);
      let usersList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Если текущий пользователь не superadmin, скрываем superadmin из списка
      if (!isSuperAdmin) {
        usersList = usersList.filter((user) => user.role !== "superadmin");
      }

      // Сортируем по дате создания (новые сначала)
      usersList.sort((a, b) => {
        const dateA = a.createdAt?.seconds || 0;
        const dateB = b.createdAt?.seconds || 0;
        return dateB - dateA;
      });

      setUsers(usersList);
    } catch (error) {
      console.error("Error fetching users:", error);

      // Логируем ошибку
      await logError(
        MODULES.USERS,
        `Ошибка загрузки пользователей: ${error.message}`
      );

      setErrorMessage(
        language === "uz"
          ? "Фойдаланувчиларни юклашда хатолик"
          : "Ошибка загрузки пользователей"
      );
    } finally {
      setLoading(false);
    }
  };

  const checkUniqueEmail = async (email) => {
    if (!email) return "";

    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", email));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      return language === "uz"
        ? "Бундай email аллақачон мавжуд"
        : "Такой email уже существует";
    }
    return "";
  };

  const handleInputChange = async (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (field === "email") {
      const error = await checkUniqueEmail(value);
      setUniqueErrors((prev) => ({ ...prev, email: error }));
    }
  };

  const validateForm = () => {
    const requiredFields = {
      email: formData.email.trim() !== "",
      firstName: formData.firstName.trim() !== "",
      lastName: formData.lastName.trim() !== "",
    };

    if (!isEditMode) {
      requiredFields.password = formData.password.length >= 6;
    }

    return Object.values(requiredFields).every(Boolean) && !uniqueErrors.email;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      setErrorMessage(
        language === "uz"
          ? "Барча мажбурий қаторларни тўлдиринг"
          : "Заполните все обязательные поля"
      );
      return;
    }

    // Проверяем, не пытается ли админ создать superadmin
    if (!isSuperAdmin && formData.role === "superadmin") {
      const errorMsg =
        language === "uz"
          ? "Сиз суперадмин яратиш ҳуқуқига эга эмассиз"
          : "У вас нет прав для создания суперадмина";

      setErrorMessage(errorMsg);

      // Логируем попытку несанкционированного доступа
      await logError(
        MODULES.USERS,
        `Попытка создания superadmin пользователем без прав: ${currentUserData?.email}`,
        null,
        { attemptedRole: "superadmin" }
      );

      return;
    }

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      if (isEditMode) {
        // Проверяем права при редактировании
        if (!isSuperAdmin && selectedUser?.role === "superadmin") {
          throw new Error("Нет прав для редактирования суперадмина");
        }

        if (!isSuperAdmin && formData.role === "superadmin") {
          throw new Error("Нет прав для назначения роли суперадмина");
        }

        // Обновление существующего пользователя
        const userRef = doc(db, "users", selectedUser.id);
        await updateDoc(userRef, {
          firstName: formData.firstName,
          lastName: formData.lastName,
          middleName: formData.middleName,
          phone: formData.phone,
          role: formData.role,
          organization: formData.organization,
          position: formData.position,
          isActive: formData.isActive,
          accessEndDate: formData.accessEndDate,
          updatedAt: new Date(),
        });

        // Логируем обновление
        await logUpdate(
          MODULES.USERS,
          `Обновлен пользователь: ${formData.firstName} ${formData.lastName} (${formData.email})`,
          selectedUser.id,
          { email: formData.email, role: formData.role }
        );

        setSuccessMessage(
          language === "uz"
            ? "Фойдаланувчи муваффақиятли янгиланди"
            : "Пользователь успешно обновлен"
        );
      } else {
        // Создание пользователя через REST API
        const result = await createUserViaREST(formData);

        // Логируем создание
        await logCreate(
          MODULES.USERS,
          `Создан пользователь: ${formData.firstName} ${formData.lastName} (${formData.email})`,
          result.uid,
          { email: formData.email, role: formData.role }
        );

        setSuccessMessage(
          language === "uz"
            ? "Фойдаланувчи муваффақиятли яратилди"
            : "Пользователь успешно создан"
        );
      }

      // Закрываем модальное окно и обновляем список
      setTimeout(() => {
        handleCloseModal();
        fetchUsers();
      }, 1000);
    } catch (error) {
      console.error("Error saving user:", error);

      // Логируем ошибку
      await logError(
        MODULES.USERS,
        `Ошибка при сохранении пользователя: ${error.message}`,
        null,
        { email: formData.email, role: formData.role }
      );

      let errorMsg =
        language === "uz" ? "Сақлашда хатолик" : "Ошибка при сохранении";

      if (error.message?.includes("EMAIL_EXISTS")) {
        errorMsg =
          language === "uz"
            ? "Бундай email аллақачон рўйхатдан ўтган"
            : "Такой email уже зарегистрирован";
      }

      setErrorMessage(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const createUserViaREST = async (userData) => {
    try {
      // Получаем API ключ из .env
      const apiKey =
        import.meta.env.VITE_FIREBASE_API_KEY ||
        "AIzaSyCPwDtyIpbsLd1xxN8jUuAe-f171JoCeOs";

      if (!apiKey) {
        throw new Error("API key not found");
      }

      // 1. Создаем пользователя через Firebase Auth REST API
      const response = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: userData.email,
            password: userData.password,
            returnSecureToken: false,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || "Ошибка создания пользователя");
      }

      // 2. Сохраняем данные пользователя в Firestore
      const userDoc = {
        uid: data.localId,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        middleName: userData.middleName || "",
        phone: userData.phone || "",
        role: userData.role,
        organization: userData.organization || "",
        position: userData.position || "",
        isActive: userData.isActive !== false,
        accessEndDate: userData.accessEndDate || "",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await addDoc(collection(db, "users"), userDoc);

      return { success: true, uid: data.localId };
    } catch (error) {
      console.error("Error in createUserViaREST:", error);
      throw error;
    }
  };

  const handleUserClick = (user) => {
    // Проверяем права на редактирование
    if (!isSuperAdmin && user.role === "superadmin") {
      toast.error(
        language === "uz"
          ? "Сиз суперадминни таҳрирлай олмайсиз"
          : "Вы не можете редактировать суперадмина"
      );
      return;
    }

    setSelectedUser(user);
    setFormData({
      email: user.email || "",
      password: "",
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      middleName: user.middleName || "",
      phone: user.phone || "",
      role: user.role || "metrolog",
      organization: user.organization || "",
      position: user.position || "",
      isActive: user.isActive !== false,
      accessEndDate: user.accessEndDate || "",
    });
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  const handleCreateNew = () => {
    setSelectedUser(null);
    setFormData({
      email: "",
      password: "",
      firstName: "",
      lastName: "",
      middleName: "",
      phone: "",
      role: "metrolog", // По умолчанию metrolog для админа
      organization: "",
      position: "",
      isActive: true,
      accessEndDate: "",
    });
    setUniqueErrors({ email: "" });
    setIsEditMode(false);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedUser(null);
    setErrorMessage("");
    setSuccessMessage("");
    setShowPassword(false);
  };

  const getRoleLabel = (role) => {
    const roleObj = allRoles.find((r) => r.value === role);
    return roleObj ? roleObj.label : role;
  };

  const getRoleColor = (role) => {
    const roleObj = allRoles.find((r) => r.value === role);
    return roleObj ? roleObj.color : "bg-gray-100 text-gray-800";
  };

  const filteredUsers = users.filter(
    (user) =>
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
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
      {/* Заголовок и кнопка добавления */}
      <motion.div
        className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-800 mb-2">
            {language === "uz" ? "Фойдаланувчилар" : "Пользователи"}
          </h1>
          <p className="text-gray-600">
            {language === "uz"
              ? "Тизим фойдаланувчиларини бошқариш"
              : "Управление пользователями системы"}
          </p>
        </div>

        <motion.button
          className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2 w-full lg:w-auto justify-center"
          onClick={handleCreateNew}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <UserPlus size={20} />
          {language === "uz" ? "Янги фойдаланувчи" : "Новый пользователь"}
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
            placeholder={language === "uz" ? "Қидириш..." : "Поиск..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300"
          />
        </div>
      </motion.div>

      {/* Таблица пользователей */}
      <motion.div
        className="bg-white rounded-2xl shadow-sm overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
                <th className="px-4 py-4 text-left font-semibold">
                  {language === "uz" ? "Фойдаланувчи" : "Пользователь"}
                </th>
                <th className="px-4 py-4 text-left font-semibold">Email</th>
                <th className="px-4 py-4 text-left font-semibold hidden md:table-cell">
                  {language === "uz" ? "Рол" : "Роль"}
                </th>
                <th className="px-4 py-4 text-left font-semibold hidden lg:table-cell">
                  {language === "uz" ? "Ташкилот" : "Организация"}
                </th>
                <th className="px-4 py-4 text-left font-semibold hidden xl:table-cell">
                  {language === "uz" ? "Ҳолат" : "Статус"}
                </th>
                <th className="px-4 py-4 text-left font-semibold hidden lg:table-cell">
                  {language === "uz" ? "Яратилган" : "Создан"}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredUsers.map((user, index) => (
                <motion.tr
                  key={user.id}
                  onClick={() => handleUserClick(user)}
                  className="hover:bg-indigo-50 transition-colors duration-200 cursor-pointer group"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  whileHover={{ scale: 1.01 }}
                >
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
                        <Users className="text-indigo-600" size={20} />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-800">
                          {user.firstName} {user.lastName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {user.position || "-"}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <Mail className="text-purple-500" size={16} />
                      <span className="text-gray-700">{user.email}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 hidden md:table-cell">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getRoleColor(
                        user.role
                      )}`}
                    >
                      <Shield className="mr-1" size={14} />
                      {getRoleLabel(user.role)}
                    </span>
                  </td>
                  <td className="px-4 py-4 hidden lg:table-cell">
                    <div className="flex items-center gap-2">
                      <Building className="text-indigo-500" size={16} />
                      <span className="text-gray-600">
                        {user.organization || "-"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4 hidden xl:table-cell">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        user.isActive !== false
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {user.isActive !== false ? (
                        <CheckCircle className="mr-1" size={14} />
                      ) : (
                        <AlertCircle className="mr-1" size={14} />
                      )}
                      {user.isActive !== false ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-4 hidden lg:table-cell text-gray-500">
                    {user.createdAt
                      ? new Date(
                          user.createdAt.seconds * 1000
                        ).toLocaleDateString("ru-RU")
                      : "-"}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <motion.div
            className="text-center py-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
          >
            <Users className="mx-auto text-gray-400 mb-4" size={48} />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">
              {searchTerm
                ? language === "uz"
                  ? "Фойдаланувчилар топилмади"
                  : "Пользователи не найдены"
                : language === "uz"
                ? "Фойдаланувчилар қўшилмаган"
                : "Пользователи не добавлены"}
            </h3>
            {!searchTerm && (
              <button
                onClick={handleCreateNew}
                className="bg-indigo-500 text-white px-6 py-2 rounded-lg hover:bg-indigo-600 transition-colors"
              >
                {language === "uz"
                  ? "Фойдаланувчи қўшиш"
                  : "Добавить пользователя"}
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
              className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Заголовок модального окна */}
              <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold">
                    {isEditMode
                      ? language === "uz"
                        ? "Фойдаланувчини таҳрирлаш"
                        : "Редактирование пользователя"
                      : language === "uz"
                      ? "Янги фойдаланувчи яратиш"
                      : "Создание нового пользователя"}
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
              <form onSubmit={handleSubmit}>
                <div className="p-6 max-h-[60vh] overflow-y-auto">
                  {errorMessage && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                      <AlertCircle size={20} />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  {successMessage && (
                    <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
                      <CheckCircle size={20} />
                      <span>{successMessage}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Email */}
                    <div>
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                        <Mail size={16} />
                        Email *
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) =>
                          handleInputChange("email", e.target.value)
                        }
                        disabled={isEditMode}
                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:bg-gray-50 disabled:text-gray-500 ${
                          uniqueErrors.email
                            ? "border-red-300"
                            : "border-gray-200"
                        }`}
                        placeholder="email@example.com"
                        required
                      />
                      {uniqueErrors.email && (
                        <div className="text-red-500 text-xs mt-1">
                          {uniqueErrors.email}
                        </div>
                      )}
                    </div>

                    {/* Пароль */}
                    {!isEditMode && (
                      <div>
                        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                          <Eye size={16} />
                          {language === "uz" ? "Парол" : "Пароль"} *
                        </label>
                        <div className="relative">
                          <input
                            type={showPassword ? "text" : "password"}
                            value={formData.password}
                            onChange={(e) =>
                              handleInputChange("password", e.target.value)
                            }
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all pr-12"
                            placeholder="••••••••"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          >
                            {showPassword ? (
                              <EyeOff size={18} />
                            ) : (
                              <Eye size={18} />
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Имя */}
                    <div>
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                        {language === "uz" ? "Исм" : "Имя"} *
                      </label>
                      <input
                        type="text"
                        value={formData.firstName}
                        onChange={(e) =>
                          handleInputChange("firstName", e.target.value)
                        }
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                        required
                      />
                    </div>

                    {/* Фамилия */}
                    <div>
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                        {language === "uz" ? "Фамилия" : "Фамилия"} *
                      </label>
                      <input
                        type="text"
                        value={formData.lastName}
                        onChange={(e) =>
                          handleInputChange("lastName", e.target.value)
                        }
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                        required
                      />
                    </div>

                    {/* Отчество */}
                    <div>
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                        {language === "uz" ? "Отасининг исми" : "Отчество"}
                      </label>
                      <input
                        type="text"
                        value={formData.middleName}
                        onChange={(e) =>
                          handleInputChange("middleName", e.target.value)
                        }
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      />
                    </div>

                    {/* Телефон */}
                    <div>
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                        {language === "uz" ? "Телефон" : "Телефон"}
                      </label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) =>
                          handleInputChange("phone", e.target.value)
                        }
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                        placeholder="+998 XX XXX XX XX"
                      />
                    </div>

                    {/* Роль */}
                    <div>
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                        <Shield size={16} />
                        {language === "uz" ? "Рол" : "Роль"} *
                      </label>
                      <select
                        value={formData.role}
                        onChange={(e) =>
                          handleInputChange("role", e.target.value)
                        }
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                        required
                      >
                        {availableRoles.map((role) => (
                          <option key={role.value} value={role.value}>
                            {role.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Организация */}
                    <div>
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                        <Building size={16} />
                        {language === "uz" ? "Ташкилот" : "Организация"}
                      </label>
                      <input
                        type="text"
                        value={formData.organization}
                        onChange={(e) =>
                          handleInputChange("organization", e.target.value)
                        }
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      />
                    </div>

                    {/* Должность */}
                    <div>
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                        {language === "uz" ? "Лавозим" : "Должность"}
                      </label>
                      <input
                        type="text"
                        value={formData.position}
                        onChange={(e) =>
                          handleInputChange("position", e.target.value)
                        }
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      />
                    </div>

                    {/* Дата завершения доступа */}
                    <div>
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                        {language === "uz"
                          ? "Доступ тугаш санаси"
                          : "Дата завершения доступа"}
                      </label>
                      <input
                        type="date"
                        value={formData.accessEndDate}
                        onChange={(e) =>
                          handleInputChange("accessEndDate", e.target.value)
                        }
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      />
                    </div>

                    {/* Активность */}
                    <div>
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                        {language === "uz" ? "Ҳолат" : "Статус"}
                      </label>
                      <div className="flex items-center gap-4">
                        <button
                          type="button"
                          onClick={() => handleInputChange("isActive", true)}
                          className={`px-4 py-2 rounded-lg transition-all ${
                            formData.isActive
                              ? "bg-green-100 text-green-800 border-2 border-green-500"
                              : "bg-gray-100 text-gray-500 border-2 border-transparent"
                          }`}
                        >
                          Active
                        </button>
                        <button
                          type="button"
                          onClick={() => handleInputChange("isActive", false)}
                          className={`px-4 py-2 rounded-lg transition-all ${
                            !formData.isActive
                              ? "bg-red-100 text-red-800 border-2 border-red-500"
                              : "bg-gray-100 text-gray-500 border-2 border-transparent"
                          }`}
                        >
                          Inactive
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Кнопки */}
                <div className="border-t px-6 py-4 bg-gray-50">
                  <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
                    <motion.button
                      type="button"
                      onClick={handleCloseModal}
                      className="w-full sm:w-auto px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-100 transition-colors"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {language === "uz" ? "Бекор" : "Отмена"}
                    </motion.button>

                    <motion.button
                      type="submit"
                      disabled={saving || !validateForm()}
                      className={`w-full sm:w-auto px-6 py-3 rounded-xl font-semibold transition-colors flex items-center gap-2 justify-center ${
                        saving || !validateForm()
                          ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                          : "bg-indigo-500 text-white hover:bg-indigo-600 cursor-pointer"
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
                          {language === "uz"
                            ? "Сақланмоқда..."
                            : "Сохранение..."}
                        </>
                      ) : (
                        <>
                          <Save size={16} />
                          {language === "uz" ? "Сақлаш" : "Сохранить"}
                        </>
                      )}
                    </motion.button>
                  </div>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UsersPage;
