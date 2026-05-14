import { Routes, Route } from "react-router-dom";
import ClientLayout from "./layouts/ClientLayout";
import AdminLayout from "./layouts/AdminLayout";

import Home from "./pages/client/Home";
import Login from "./pages/client/Login";
import Register from "./pages/client/Register";
import Confirmacion from "./pages/client/Confirmacion";
import ReservarMesa from "./pages/client/ReservarMesa";
import Carrito from "./pages/client/Carrito";
import Checkout from "./pages/client/Checkout";

import LoginAdmin from "./pages/admin/LoginAdmin";
import Dashboard from "./pages/admin/Dashboard";
import Cuentas from "./pages/admin/Cuentas";
import Reservas from "./pages/admin/Reservas";
import Calendario from "./pages/admin/Calendario";
import PerfilLocal from "./pages/admin/PerfilLocal";
import Pedidos from "./pages/admin/Pedidos";
import { RequireAdminAuth, RequireClientAuth } from "./components/RouteGuards";
import CatchAllRedirect from "./components/CatchAllRedirect";

export default function AppRouter() {
  return (
    <Routes>
      <Route element={<ClientLayout />}>
        <Route
          path="/"
          element={(
            <RequireClientAuth>
              <Home />
            </RequireClientAuth>
          )}
        />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/confirmacion" element={<Confirmacion />} />
        <Route
          path="/carrito"
          element={(
            <RequireClientAuth>
              <Carrito />
            </RequireClientAuth>
          )}
        />
        <Route
          path="/checkout"
          element={(
            <RequireClientAuth>
              <Checkout />
            </RequireClientAuth>
          )}
        />
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
        <Route
          path="/admin/pedidos"
          element={(
            <RequireAdminAuth>
              <Pedidos />
            </RequireAdminAuth>
          )}
        />
      </Route>

      <Route path="*" element={<CatchAllRedirect />} />
    </Routes>
  );
}