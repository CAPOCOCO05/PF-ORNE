import { comprobarApi } from "../saludApi";
import { llamadaFetch, simularApi, simularSinConexion } from "../../test-utils/apiSimulada";
import { apiSinRespuesta, marcarRespuestaApi } from "../../utils/eventosRed";

// F10 A8: el banner de conexion prueba /salud mientras la API no responde
describe("comprobarApi", () => {
    it("si /salud responde quita la marca", async () => {
        marcarRespuestaApi(false);
        const fetchMock = simularApi({ status: 200, cuerpo: { estado: "ok" } });

        expect(await comprobarApi()).toBe(true);
        expect(llamadaFetch(fetchMock)[0]).toBe("/salud");
        expect(apiSinRespuesta()).toBe(false);
    });

    it("sin respuesta la marca sigue", async () => {
        marcarRespuestaApi(false);
        simularSinConexion();

        expect(await comprobarApi()).toBe(false);
        expect(apiSinRespuesta()).toBe(true);
    });
});
