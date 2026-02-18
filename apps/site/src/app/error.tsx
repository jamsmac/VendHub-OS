"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Site error:", error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-white">
      <div className="w-full max-w-md p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <svg
            className="h-8 w-8 text-red-600"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-semibold mb-2 text-gray-900">
          Произошла ошибка
        </h2>
        <p className="text-gray-500 mb-6">
          Что-то пошло не так. Попробуйте обновить страницу или вернуться на
          главную.
        </p>
        {error.digest && (
          <p className="text-xs text-gray-400 mb-4 font-mono">
            ID: {error.digest}
          </p>
        )}
        <div className="flex gap-3 justify-center">
          <a
            href="/"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            На главную
          </a>
          <button
            onClick={reset}
            className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            Повторить
          </button>
        </div>
      </div>
    </div>
  );
}
