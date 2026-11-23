import { act, renderHook } from "@testing-library/react-native";
import { AppState, AppStateStatus } from "react-native";
import { addNetworkStateListener, getNetworkStateAsync, NetworkState } from "expo-network";
import { INTERVALO_COMPROBACION_MS, useEstadoRed, useSinConexion } from "../useEstadoRed";
import { comprobarApi } from "../../services/saludApi";
import { marcarRespuestaApi } from "../../utils/eventosRed";

// F10 A8: el aviso de conexion no depende solo de lo que reporte el sistema
jest.mock("expo-network", () => ({ getNetworkStateAsync: jest.fn(), addNetworkStateListener: jest.fn() }));
jest.mock("../../services/saludApi", () => ({ comprobarApi: jest.fn() }));

const CON_INTERNET: NetworkState = { isConnected: true, isInternetReachable: true };
const MODO_AVION: NetworkState = { isConnected: false, isInternetReachable: false };

let avisarCambio: (estado: NetworkState) => void;
let avisarApp: (estado: AppStateStatus) => void;

beforeEach(() => {
    jest.clearAllMocks();
    marcarRespuestaApi(true);
    (getNetworkStateAsync as jest.Mock).mockResolvedValue(CON_INTERNET);
    (addNetworkStateListener as jest.Mock).mockImplementation((oyente) => {
        avisarCambio = oyente;
        return { remove: jest.fn() };
    });
    jest.spyOn(AppState, "addEventListener").mockImplementation((_tipo, oyente) => {
        avisarApp = oyente as (estado: AppStateStatus) => void;
        return { remove: jest.fn() };
    });
});

afterEach(() => jest.useRealTimers());

describe("useEstadoRed (lo que reporta el sistema)", () => {
    async function montar() {
        const hook = await renderHook(() => useEstadoRed());
        await act(async () => {});   // respuesta de la primera consulta
        return hook;
    }

    it("consulta el estado al montar y escucha los cambios", async () => {
        const { result } = await montar();
        expect(result.current).toEqual(CON_INTERNET);

        await act(async () => avisarCambio(MODO_AVION));

        expect(result.current).toEqual(MODO_AVION);
    });

    it("al regresar al frente vuelve a consultar (el aviso se pudo perder en segundo plano)", async () => {
        const { result } = await montar();
        (getNetworkStateAsync as jest.Mock).mockResolvedValue(MODO_AVION);

        await act(async () => avisarApp("active"));

        expect(getNetworkStateAsync).toHaveBeenCalledTimes(2);
        expect(result.current).toEqual(MODO_AVION);
    });

    it("al pasar a segundo plano no consulta", async () => {
        await montar();

        await act(async () => avisarApp("background"));

        expect(getNetworkStateAsync).toHaveBeenCalledTimes(1);
    });
});

describe("useSinConexion", () => {
    async function montar() {
        const hook = await renderHook(() => useSinConexion());
        await act(async () => {});
        return hook;
    }

    it("con red y la API respondiendo: con conexion", async () => {
        const { result } = await montar();

        expect(result.current).toBe(false);
    });

    it("si la API deja de responder hay aviso aunque el sistema diga que hay red (iOS)", async () => {
        const { result } = await montar();

        await act(async () => marcarRespuestaApi(false));

        expect(result.current).toBe(true);
    });

    it("mientras no responda prueba /salud cada cierto tiempo; al responder quita el aviso", async () => {
        jest.useFakeTimers();
        const { result } = await montar();
        await act(async () => marcarRespuestaApi(false));

        await act(async () => { jest.advanceTimersByTime(INTERVALO_COMPROBACION_MS); });
        expect(comprobarApi).toHaveBeenCalledTimes(1);

        await act(async () => marcarRespuestaApi(true));   // lo que hace comprobarApi al responder
        expect(result.current).toBe(false);
        await act(async () => { jest.advanceTimersByTime(INTERVALO_COMPROBACION_MS * 2); });
        expect(comprobarApi).toHaveBeenCalledTimes(1);
    });

    it("si el sistema reporta modo avion tambien hay aviso", async () => {
        const { result } = await montar();

        await act(async () => avisarCambio(MODO_AVION));

        expect(result.current).toBe(true);
    });
});
