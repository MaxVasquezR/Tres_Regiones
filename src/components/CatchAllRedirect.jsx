import { Navigate } from "react-router-dom";

export default function CatchAllRedirect() {
  return <Navigate to="/" replace />;
}
