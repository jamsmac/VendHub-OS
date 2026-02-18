export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-white">
      <div className="w-full max-w-md p-8 text-center">
        <p className="text-6xl font-bold text-gray-200 mb-4">404</p>
        <h2 className="text-xl font-semibold mb-2 text-gray-900">
          Страница не найдена
        </h2>
        <p className="text-gray-500 mb-6">
          Запрашиваемая страница не существует или была перемещена.
        </p>
        <a
          href="/"
          className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          Вернуться на главную
        </a>
      </div>
    </div>
  );
}
