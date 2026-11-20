import { estaSinConexion } from "../conexion";

describe("estaSinConexion (F10 A8)", () => {
    it("modo avion: sin red", () => {
        expect(estaSinConexion({ isConnected: false, isInternetReachable: false })).toBe(true);
    });

    it("conectado a una red sin internet", () => {
        expect(estaSinConexion({ isConnected: true, isInternetReachable: false })).toBe(true);
    });

    it("con internet", () => {
        expect(estaSinConexion({ isConnected: true, isInternetReachable: true })).toBe(false);
    });

    it("estado aun desconocido: no avisa", () => {
        expect(estaSinConexion({})).toBe(false);
        expect(estaSinConexion({ isConnected: true })).toBe(false);
    });
});
