import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { scrollHomeTop } from "../utils/scrollHomeTop";

/** Navega a la carta y sube a la primera pantalla (hero). */
export function useGoHome() {
  const location = useLocation();
  const navigate = useNavigate();

  return useCallback(
    (e) => {
      if (e?.preventDefault) e.preventDefault();
      if (location.pathname === "/") {
        scrollHomeTop("smooth");
      } else {
        navigate("/", { state: { scrollToTop: true } });
      }
    },
    [location.pathname, navigate],
  );
}
