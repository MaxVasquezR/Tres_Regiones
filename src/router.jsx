import { Routes, Route } from "react-router-dom";
import ClientLayout from "./layouts/ClientLayout";
import AdminLayout from "./layouts/AdminLayout";
import MozoLayout from "./layouts/MozoLayout";

import Home from "./pages/client/Home";
import Login from "./pages/client/Login";
import Register from "./pages/client/Register";
import Confirmacion from "./pages/client/Confirmacion";
import ReservarMesa from "./pages/client/ReservarMesa";
import Carrito from "./pages/client/Carrito";
import Checkout from "./pages/client/Checkout";
import SeguimientoPedido from "./pages/client/SeguimientoPedido";
import MisPedidos from "./pages/client/MisPedidos";

import LoginAdmin from "./pages/admin/LoginAdmin";
import Dashboard from "./pages/admin/Dashboard";
import Cuentas from "./pages/admin/Cuentas";
import Reservas from "./pages/admin/Reservas";
import Calendario from "./pages/admin/Calendario";
import PerfilLocal from "./pages/admin/PerfilLocal";
import CentroOperaciones from "./pages/admin/CentroOperaciones";
import MenuDelDia from "./pages/admin/MenuDelDia";
import VentasSalon from "./pages/admin/VentasSalon";
import PlatosAdmin from "./pages/admin/PlatosAdmin";
import CierreCaja from "./pages/admin/CierreCaja";

import LoginMozo from "./pages/mozo/LoginMozo";
import MesasScreen from "./pages/mozo/MesasScreen";
import ComandaScreen from "./pages/mozo/ComandaScreen";
import CerrarCuentaScreen from "./pages/mozo/CerrarCuentaScreen";
import LoginCocina from "./pages/cocina/LoginCocina";
import CocinaScreen from "./pages/cocina/CocinaScreen";

import { RequireAdminAuth, RequireClientAuth, RequireCocinaAuth, RequireMozoAuth } from "./components/RouteGuards";
import CatchAllRedirect from "./components/CatchAllRedirect";

export default function AppRouter() {
  return (
    <Routes>
      {/* Mozo · POS */}
      <Route path="/mozo/login" element={<LoginMozo />} />

      <Route element={<MozoLayout />}>
        <Route path="/mozo/mesas" element={<RequireMozoAuth><MesasScreen /></RequireMozoAuth>} />
        <Route path="/mozo/mesa/:codigo/comanda" element={<RequireMozoAuth><ComandaScreen /></RequireMozoAuth>} />
        <Route path="/mozo/mesa/:codigo/cuenta" element={<RequireMozoAuth><CerrarCuentaScreen /></RequireMozoAuth>} />
      </Route>

      {/* Cocina · KDS */}
      <Route path="/cocina/login" element={<LoginCocina />} />
      <Route path="/cocina" element={<RequireCocinaAuth><CocinaScreen /></RequireCocinaAuth>} />

      {/* Cliente · reservas y carta */}
      <Route element={<ClientLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/confirmacion" element={<Confirmacion />} />
        <Route path="/reservar" element={<RequireClientAuth><ReservarMesa /></RequireClientAuth>} />
        <Route path="/carrito" element={<Carrito />} />
        <Route path="/checkout" element={<RequireClientAuth><Checkout /></RequireClientAuth>} />
        <Route path="/pedido/:id" element={<RequireClientAuth><SeguimientoPedido /></RequireClientAuth>} />
        <Route path="/mis-pedidos" element={<RequireClientAuth><MisPedidos /></RequireClientAuth>} />
      </Route>

      {/* Admin */}
      <Route path="/admin/login" element={<LoginAdmin />} />

      <Route element={<AdminLayout />}>
        <Route path="/admin/dashboard" element={<RequireAdminAuth><Dashboard /></RequireAdminAuth>} />
        <Route path="/admin/operaciones" element={<RequireAdminAuth><CentroOperaciones /></RequireAdminAuth>} />
        <Route path="/admin/ventas" element={<RequireAdminAuth><VentasSalon /></RequireAdminAuth>} />
        <Route path="/admin/platos" element={<RequireAdminAuth><PlatosAdmin /></RequireAdminAuth>} />
        <Route path="/admin/cierre-caja" element={<RequireAdminAuth><CierreCaja /></RequireAdminAuth>} />
        <Route path="/admin/cuentas" element={<RequireAdminAuth><Cuentas /></RequireAdminAuth>} />
        <Route path="/admin/reservas" element={<RequireAdminAuth><Reservas /></RequireAdminAuth>} />
        <Route path="/admin/calendario" element={<RequireAdminAuth><Calendario /></RequireAdminAuth>} />
        <Route path="/admin/perfil" element={<RequireAdminAuth><PerfilLocal /></RequireAdminAuth>} />
        <Route path="/admin/menu-del-dia" element={<RequireAdminAuth><MenuDelDia /></RequireAdminAuth>} />
      </Route>

      <Route path="*" element={<CatchAllRedirect />} />
    </Routes>
  );
}
