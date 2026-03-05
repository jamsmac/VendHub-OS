import { Coffee } from "lucide-react";

export default function GlobalLoading() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center">
      <Coffee size={32} className="text-espresso/20 animate-pulse" />
    </div>
  );
}
