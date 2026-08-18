// src/pages/ErrorPage.jsx
import React from "react";
import { useRouteError, useNavigate } from "react-router-dom";

const ErrorPage = () => {
  const error = useRouteError();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center px-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Ошибка</h1>
        <p className="text-gray-600 mb-6">
          {error?.message || "Произошла неизвестная ошибка"}
        </p>
        <button
          onClick={() => navigate("/login")}
          className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700"
        >
          Вернуться на страницу входа
        </button>
      </div>
    </div>
  );
};

export default ErrorPage;
