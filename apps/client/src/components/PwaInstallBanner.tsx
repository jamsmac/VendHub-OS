import { usePwaInstall } from "../hooks/usePwaInstall";
import { X, Download } from "lucide-react";

export function PwaInstallBanner() {
  const { canShow, install, dismiss } = usePwaInstall();

  if (!canShow) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-3 rounded-xl bg-primary p-3 text-primary-foreground shadow-lg">
        <Download className="h-5 w-5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Установите VendHub</p>
          <p className="text-xs opacity-80 truncate">
            Быстрый доступ к заказам и карте
          </p>
        </div>
        <button
          onClick={install}
          className="shrink-0 rounded-lg bg-primary-foreground/20 px-3 py-1.5 text-xs font-medium backdrop-blur-sm hover:bg-primary-foreground/30 transition-colors"
        >
          Установить
        </button>
        <button
          onClick={dismiss}
          className="shrink-0 rounded-full p-1 hover:bg-primary-foreground/20 transition-colors"
          aria-label="Закрыть"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
