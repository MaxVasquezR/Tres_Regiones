import { Navigate } from "react-router-dom";
import { haySesionCliente } from "../session";

export default function CatchAllRedirect() {
  return haySesionCliente() ? <Navigate to="/" replace /> : <Navigate to="/login" replace />;
}
