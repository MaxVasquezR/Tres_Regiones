import { useCallback, useEffect, useState } from "react";
import { apiGet } from "../../api";

export default function Pedidos() {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const cargar = useCallback(async () => {
    setLoading(true);
    setMsg("");
    try {
      const json = await apiGet("/api/pedidos", { auth: true });
      if (Array.isArray(json.data)) setPedidos(json.data);
    } catch (err) {
      setMsg(err?.message || "No se pudieron cargar los pedidos.");
      setPedidos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  return (
    <div>
      <h1 style={{ marginBottom: "12px", color: "var(--brand-700)" }}>Pedidos web</h1>
      <p style={{ marginBottom: "18px" }}>
        Pedidos con delivery, recojo y métodos de pago (simulación). Integración real con pasarela y conciliación en
        fase comercial.
      </p>
      {msg ? (
        <div className="card card--pad" style={{ marginBottom: 14, fontSize: 14 }}>
          {msg}
        </div>
      ) : null}
      {loading ? <p className="loading-inline">Cargando…</p> : null}
      <div className="card card--pad">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Cliente</th>
                <th>Items</th>
                <th>Delivery</th>
                <th>Dirección</th>
                <th>Total</th>
                <th>Pago</th>
                <th>Estado</th>
                <th>Comprobante</th>
                <th>Código</th>
              </tr>
            </thead>
            <tbody>
              {!pedidos.length ? (
                <tr>
                  <td colSpan={10} style={{ color: "var(--muted)" }}>
                    Sin pedidos aún.
                  </td>
                </tr>
              ) : (
                pedidos.map((p) => (
                  <tr key={p.id}>
                    <td>{p.id}</td>
                    <td>
                      <strong>{p.clienteNombre}</strong>
                      <br />
                      <span style={{ fontSize: 13, color: "var(--muted)" }}>
                        {p.contactoNombre ? (
                          <>
                            Pedido: {p.contactoNombre} · {p.contactoTelefono}
                            <br />
                          </>
                        ) : null}
                        {p.clienteCorreo ? <>Correo cuenta: {p.clienteCorreo}</> : null}
                        {p.clienteTelefonoCuenta ? (
                          <>
                            {p.clienteCorreo ? " · " : null}
                            Cel. cuenta: {p.clienteTelefonoCuenta}
                          </>
                        ) : null}
                      </span>
                    </td>
                    <td style={{ fontSize: 13 }}>
                      {Array.isArray(p.items)
                        ? p.items.map((i) => `${i.qty}× ${i.nombre}`).join(" · ")
                        : "—"}
                    </td>
                    <td>{p.delivery ? "Sí" : "No"}</td>
                    <td style={{ fontSize: 12, maxWidth: 220 }}>
                      {p.delivery && p.direccion ? (
                        <>
                          <span style={{ display: "block" }}>
                            {p.direccion.calle || "—"} · {p.direccion.distrito || "—"}
                          </span>
                          {Number.isFinite(p.direccion.lat) && Number.isFinite(p.direccion.lng) ? (
                            <a
                              href={`https://www.openstreetmap.org/?mlat=${p.direccion.lat}&mlon=${p.direccion.lng}#map=17/${p.direccion.lat}/${p.direccion.lng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ fontSize: 11 }}
                            >
                              Ver en mapa
                            </a>
                          ) : null}
                          {p.direccion.fuente ? (
                            <span style={{ display: "block", color: "var(--muted)", marginTop: 4 }}>
                              Origen: {p.direccion.fuente}
                            </span>
                          ) : null}
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>S/ {Number(p.totalSoles).toFixed(2)}</td>
                    <td style={{ textTransform: "uppercase", fontSize: 12 }}>{p.paymentMethod}</td>
                    <td>
                      <span className="badge badge--warn" style={{ fontSize: 12 }}>
                        {p.estado}
                      </span>
                    </td>
                    <td style={{ fontSize: 12 }}>
                      {p.comprobante?.tipo ? (
                        <>
                          {p.comprobante.tipo === "factura" ? "Factura" : "Boleta"} · {p.comprobante.numeroDocumento}
                          <br />
                          <span style={{ color: "var(--muted)" }}>{p.comprobante.razonSocial}</span>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td style={{ fontFamily: "monospace", fontSize: 12 }}>{p.codigoPago}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
