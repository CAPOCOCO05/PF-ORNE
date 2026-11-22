import { listarCatalogo, obtenerPastel } from "../catalogoService";
import { MENSAJES_DATOS } from "../erroresDatos";
import { supabase } from "../supabase";
import { FILTROS_VACIOS } from "../../constants/filtrosCatalogo";
import { llamadaFetch, simularApi, simularSinConexion } from "../../test-utils/apiSimulada";

// catalogo del cliente: peticiones a la API (backend/), que filtra y pagina
jest.mock("../supabase", () => ({ supabase: { auth: { getSession: jest.fn() } } }));

const PASTEL = { id: "p1", nombre: "Clásico", precio_base: 380 };

beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "warn").mockImplementation(() => {});
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: null } });
});

describe("listarCatalogo", () => {
    it("pide la pagina a la API y devuelve los pasteles", async () => {
        const fetchMock = simularApi({ status: 200, cuerpo: { pasteles: [PASTEL], hayMas: true } });

        const resultado = await listarCatalogo(1);

        const [url, opciones] = llamadaFetch(fetchMock);
        expect(url).toBe("/catalogo?pagina=1&orden=nombre");
        expect(opciones.method).toBe("GET");
        expect(resultado).toEqual({ pasteles: [PASTEL], hayMas: true, error: null });
    });

    it("manda los filtros en el query string (M5)", async () => {
        const fetchMock = simularApi({ status: 200, cuerpo: { pasteles: [], hayMas: false } });

        await listarCatalogo(0, { ...FILTROS_VACIOS, precio: "hasta500", panes: ["vainilla", "fresa"], niveles: [1, 2], orden: "precioAsc" });

        expect(llamadaFetch(fetchMock)[0]).toBe("/catalogo?pagina=0&precio=hasta500&panes=vainilla%2Cfresa&niveles=1%2C2&orden=precioAsc");
    });

    it("sin sesion va como visitante; con sesion manda el token", async () => {
        const fetchMock = simularApi({ status: 200, cuerpo: { pasteles: [], hayMas: false } });
        await listarCatalogo(0);
        (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: { access_token: "tok" } } });
        await listarCatalogo(0);

        expect(llamadaFetch(fetchMock, 0)[1].headers).not.toHaveProperty("Authorization");
        expect(llamadaFetch(fetchMock, 1)[1].headers).toHaveProperty("Authorization", "Bearer tok");
    });

    it("sin internet: lista vacia y mensaje de conexion", async () => {
        simularSinConexion();

        expect(await listarCatalogo(0)).toEqual({ pasteles: [], hayMas: false, error: MENSAJES_DATOS.CONEXION });
    });

    it("error de la API: muestra su mensaje", async () => {
        simularApi({ status: 500, cuerpo: { error: MENSAJES_DATOS.GENERICO } });

        expect(await listarCatalogo(0)).toEqual({ pasteles: [], hayMas: false, error: MENSAJES_DATOS.GENERICO });
    });
});

describe("obtenerPastel", () => {
    it("devuelve el pastel", async () => {
        const fetchMock = simularApi({ status: 200, cuerpo: { pastel: PASTEL } });

        expect(await obtenerPastel("p1")).toEqual({ pastel: PASTEL, error: null });
        expect(llamadaFetch(fetchMock)[0]).toBe("/catalogo/p1");
    });

    it("404: pastel null sin error (ya no existe)", async () => {
        simularApi({ status: 404, cuerpo: { error: "No encontramos este pastel" } });

        expect(await obtenerPastel("x")).toEqual({ pastel: null, error: null });
    });
});
