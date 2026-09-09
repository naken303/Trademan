import { Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "../components/layout/AppLayout";
import { WorldPage } from "../features/world/WorldPage";
import { ProductsPage } from "../features/products/ProductsPage";
import { SimulatorPage } from "../features/simulator/SimulatorPage";
import { MarketPage } from "../features/market/MarketPage";
import { VillagePage } from "../features/world/VillagePage";
import { RoutePage } from "../features/routes/RoutePage";
import { DatabaseSettingsPage } from "../features/world/DatabaseSettingsPage";

export function AppRouter() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/world" element={<WorldPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/simulator" element={<SimulatorPage />} />
        <Route path="/market" element={<MarketPage />} />
        <Route path="/villages" element={<VillagePage />} />
        <Route path="/routes" element={<RoutePage />} />
        <Route path="/settings" element={<DatabaseSettingsPage />} />
        <Route
          path="*"
          element={<Navigate to="/world" replace />}
        />  
      </Route>
    </Routes>
  );
}
