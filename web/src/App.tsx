import { Toasty } from "@cloudflare/kumo/components/toast";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./layout/AppShell";
import { ConsolePage } from "./pages/ConsolePage";
import { PairPage } from "./pages/PairPage";
import { RecordsPage } from "./pages/RecordsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { WavesPage } from "./pages/WavesPage";
import { ConsoleProvider } from "./state/ConsoleProvider";

export default function App() {
  return (
    <Toasty>
      <ConsoleProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<ConsolePage />} />
              <Route path="pair" element={<PairPage />} />
              <Route path="waves" element={<WavesPage />} />
              <Route path="records" element={<RecordsPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ConsoleProvider>
    </Toasty>
  );
}
