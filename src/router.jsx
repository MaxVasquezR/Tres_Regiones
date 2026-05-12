import { Routes, Route, Navigate } from "react-router-dom";
import ClientLayout from "./layouts/ClientLayout";
import AdminLayout from "./layouts/AdminLayout";

import Home from "./pages/client/Home";
import Login from "./pages/client/Login";
import Register from "./pages/client/Register";
import Confirmacion from "./pages/client/Confirmacion";
import ReservarMesa from "./pages/client/ReservarMesa";

import LoginAdmin from "./pages/admin/LoginAdmin";
import Dashboard from "./pages/admin/Dashboard";
import Cuentas from "./pages/admin/Cuentas";
import Reservas from "./pages/admin/Reservas";
import Calendario from "./pages/admin/Calendario";
import PerfilLocal from "./pages/admin/PerfilLocal";
import { RequireAdminAuth, RequireClientAuth } from "./components/RouteGuards";

export default function AppRouter() {
  return (
    <Routes>
      <Route element={<ClientLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/confirmacion" element={<Confirmacion />} />
        <Route
          path="/reservar"
          element={(
            <RequireClientAuth>
              <ReservarMesa />
            </RequireClientAuth>
          )}
        />
      </Route>

      <Route path="/admin/login" element={<LoginAdmin />} />

      <Route element={<AdminLayout />}>
        <Route
          path="/admin/dashboard"
          element={(
            <RequireAdminAuth>
              <Dashboard />
            </RequireAdminAuth>
          )}
        />
        <Route
          path="/admin/cuentas"
          element={(
            <RequireAdminAuth>
              <Cuentas />
            </RequireAdminAuth>
          )}
        />
        <Route
          path="/admin/reservas"
          element={(
            <RequireAdminAuth>
              <Reservas />
            </RequireAdminAuth>
          )}
        />
        <Route
          path="/admin/calendario"
          element={(
            <RequireAdminAuth>
              <Calendario />
            </RequireAdminAuth>
          )}
        />
        <Route
          path="/admin/perfil"
          element={(
            <RequireAdminAuth>
              <PerfilLocal />
            </RequireAdminAuth>
          )}
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}