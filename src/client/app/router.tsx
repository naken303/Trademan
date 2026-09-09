import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "../components/layout/AppLayout";

const WorldPage = lazy(() => import("../features/world/WorldPage").then((module) => ({ default: module.WorldPage })));
const ProductsPage = lazy(() => import("../features/products/ProductsPage").then((module) => ({ default: module.ProductsPage })));
const VillagePage = lazy(() => import("../features/world/VillagePage").then((module) => ({ default: module.VillagePage })));
const RoutePage = lazy(() => import("../features/routes/RoutePage").then((module) => ({ default: module.RoutePage })));
const MarketPage = lazy(() => import("../features/market/MarketPage").then((module) => ({ default: module.MarketPage })));
const SimulatorPage = lazy(() => import("../features/simulator/SimulatorPage").then((module) => ({ default: module.SimulatorPage })));
const DatabaseSettingsPage = lazy(() => import("../features/world/DatabaseSettingsPage").then((module) => ({ default: module.DatabaseSettingsPage })));

export function AppRouter() {
  return (
    <Suspense fallback={<div className="page-state">Loading page...</div>}><Routes>
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
    </Routes></Suspense>
  );
}
