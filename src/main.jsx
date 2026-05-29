import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import AppRouter from "./router";
import "./index.css";
import { ReservationsProvider } from "./context/ReservationsContext";
import { TableOrderProvider } from "./context/TableOrderContext";
import { CartProvider } from "./context/CartContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ReservationsProvider>
      <CartProvider>
        <TableOrderProvider>
          <BrowserRouter>
            <AppRouter />
          </BrowserRouter>
        </TableOrderProvider>
      </CartProvider>
    </ReservationsProvider>
  </React.StrictMode>
);
