// src/components/Plombalar/QrScannerModal.jsx
import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, QrCode } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";

const QrScannerModal = ({ isOpen, onClose, onScan }) => {
  const [error, setError] = useState("");
  const scannerRef = useRef(null);
  const isProcessingRef = useRef(false);
  const containerId = "qr-reader-container";

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    isProcessingRef.current = false;

    const startScanner = async () => {
      // Небольшая задержка, чтобы DOM-элемент успел отрисоваться
      await new Promise((resolve) => setTimeout(resolve, 300));

      if (!isMounted) return;

      const container = document.getElementById(containerId);
      if (!container) {
        setError("Контейнер топилмади");
        return;
      }

      try {
        const scanner = new Html5Qrcode(containerId, { verbose: false });
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            // Предотвращаем множественные срабатывания
            if (isProcessingRef.current) return;
            isProcessingRef.current = true;

            // Останавливаем сканер и вызываем callback
            const text = decodedText;
            stopScanner().then(() => {
              if (isMounted && onScan) {
                onScan(text);
              }
            });
          },
          () => {
            // Игнорируем ошибки сканирования (они возникают постоянно)
          }
        );
      } catch (err) {
        console.error("Ошибка запуска сканера:", err);
        if (isMounted) {
          setError(
            "Камерани ишга туширишда хатолик. Рухсат берилганини текширинг."
          );
        }
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      stopScanner();
    };
  }, [isOpen]);

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        // Проверяем, активен ли сканер
        const state = scannerRef.current.getState();
        // state: 1 = NOT_STARTED, 2 = SCANNING, 3 = PAUSED
        if (state === 2 || state === 3) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (err) {
        // Игнорируем ошибки при остановке
        console.log("Scanner stop (ignore):", err?.message || err);
      }
      scannerRef.current = null;
    }
  };

  const handleClose = async () => {
    await stopScanner();
    setError("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[70] p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.9 }}
        >
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-4 flex justify-between items-center">
            <h3 className="font-bold flex items-center gap-2">
              <QrCode size={20} />
              QR кодни сканерлаш
            </h3>
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-full bg-white bg-opacity-20 flex items-center justify-center hover:bg-opacity-30"
            >
              <X size={16} />
            </button>
          </div>

          <div className="p-4">
            <div
              id={containerId}
              className="w-full rounded-xl overflow-hidden bg-black"
              style={{ minHeight: "300px" }}
            />

            {error && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            <p className="text-sm text-gray-500 text-center mt-3">
              QR кодни камерага кўрсатинг
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default QrScannerModal;
