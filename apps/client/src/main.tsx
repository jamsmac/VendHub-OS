import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./index.css";
import "./i18n";

// vite-plugin-pwa auto-update: registers and updates the service worker automatically.
// The virtual:pwa-register module is injected by the plugin at build time.
import { registerSW } from "virtual:pwa-register";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

// Register the service worker with auto-update.
// Check for updates every hour while the app is open.
const _updateSW = registerSW({
  onRegisteredSW(swUrl, registration) {
    if (registration) {
      setInterval(
        () => {
          registration.update();
        },
        60 * 60 * 1000, // hourly check
      );
    }
  },
  onOfflineReady() {
    console.log("VendHub PWA: ready for offline use");
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
