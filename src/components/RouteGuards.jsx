import { Navigate, useLocation } from "react-router-dom";
import { haySesionAdmin, haySesionCliente, haySesionCocina, haySesionMozoOrAdmin } from "../session";

export function RequireClientAuth({ children }) {
  const location = useLocation();
  if (!haySesionCliente()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return children;
}

export function RequireAdminAuth({ children }) {
  if (!haySesionAdmin()) return <Navigate to="/admin/login" replace />;
  return children;
}

export function RequireMozoAuth({ children }) {
  if (!haySesionMozoOrAdmin()) return <Navigate to="/mozo/login" replace />;
  return children;
}

export function RequireCocinaAuth({ children }) {
  if (!haySesionCocina() && !haySesionMozoOrAdmin()) return <Navigate to="/cocina/login" replace />;
  return children;
}
