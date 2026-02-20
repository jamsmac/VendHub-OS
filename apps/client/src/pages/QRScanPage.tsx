/**
 * QR Scan Page
 * Scans QR code to identify machine
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function QRScanPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [manualCode, setManualCode] = useState('');

  useEffect(() => {
    // Request camera permission
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: 'environment' } })
      .then(() => setHasPermission(true))
      .catch(() => setHasPermission(false));
  }, []);

  const handleManualSubmit = () => {
    if (manualCode.trim()) {
      // Navigate to complaint page with machine code
      navigate(`/complaint/code/${manualCode.trim()}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/50 to-transparent p-4">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="p-2 text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-white">{t('scanQR')}</h1>
          <div className="w-10" />
        </div>
      </div>

      {/* Camera View / Fallback */}
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        {hasPermission === null && (
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
            <p>{t('requestingCameraAccess')}</p>
          </div>
        )}

        {hasPermission === false && (
          <div className="text-white text-center">
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold mb-2">{t('noCameraAccess')}</h2>
            <p className="text-gray-400 mb-6">{t('enterMachineCodeManually')}</p>
          </div>
        )}

        {hasPermission && (
          <div className="relative">
            {/* Scanner overlay */}
            <div className="w-64 h-64 border-2 border-white rounded-2xl relative">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-indigo-500 rounded-tl-xl" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-indigo-500 rounded-tr-xl" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-indigo-500 rounded-bl-xl" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-indigo-500 rounded-br-xl" />

              {/* Scanning line animation */}
              <div className="absolute inset-0 overflow-hidden rounded-xl">
                <div className="absolute left-0 right-0 h-0.5 bg-indigo-500 animate-scan" />
              </div>
            </div>

            <p className="text-white text-center mt-6">
              {t('pointCameraAtQR')}
            </p>
          </div>
        )}

        {/* Manual input */}
        <div className="w-full max-w-sm mt-12">
          <div className="relative">
            <div className="absolute inset-0 bg-white/10 backdrop-blur-md rounded-xl" />
            <div className="relative p-4">
              <label className="block text-white text-sm mb-2">{t('orEnterMachineCode')}</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="VH-001"
                  className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={handleManualSubmit}
                  disabled={!manualCode.trim()}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium disabled:opacity-50"
                >
                  →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scan animation styles */}
      <style>{`
        @keyframes scan {
          0%, 100% { top: 0; }
          50% { top: 100%; }
        }
        .animate-scan {
          animation: scan 2s linear infinite;
        }
      `}</style>
    </div>
  );
}
