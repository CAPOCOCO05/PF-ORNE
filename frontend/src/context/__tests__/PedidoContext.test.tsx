import { act, renderHook } from "@testing-library/react-native";
import { MENSAJES_PEDIDO_CONTEXTO, PEDIDO_VACIO, PedidoProvider, usePedido } from "../PedidoContext";
import { obtenerPastel } from "../../services/catalogoService";
import { guardarBorrador, obtenerBorrador } from "../../services/pedidosService";

jest.mock("expo-router", () => {
    const { useEffect } = jest.requireActual("react");
    return { useFocusEffect: (efecto: () => void) => useEffect(efecto, [efecto]) };
});
jest.mock("../AuthContext", () => ({ useAuth: () => ({ user: { id: "u1" } }) }));
jest.mock("../../services/catalogoService", () => ({ obtenerPastel: jest.fn() }));
jest.mock("../../services/pedidosService", () => ({ guardarBorrador: jest.fn(), obtenerBorrador: jest.fn() }));

const wrapper = ({ children }: { children: React.ReactNode }) => <PedidoProvider>{children}</PedidoProvider>;

beforeEach(() => jest.clearAllMocks());

describe("PedidoContext", () => {
    it("'Crear pedido': empieza vacio", async () => {
        const { result } = await renderHook(() => usePedido(), { wrapper });

        await act(async () => { await result.current.iniciar({}); });

        expect(result.current.pedido).toEqual(PEDIDO_VACIO);
    });

    it("'Pedir': precarga la configuracion del pastel", async () => {
        (obtenerPastel as jest.Mock).mockResolvedValue({
            pastel: { id: "p1", tamanio: "20", niveles: 2, tipo_pan: "redvelvet", relleno: "cremapastelera" },
            error: null,
        });
        const { result } = await renderHook(() => usePedido(), { wrapper });

        await act(async () => { await result.current.iniciar({ pastelId: "p1" }); });

        expect(obtenerPastel).toHaveBeenCalledWith("p1");
        expect(result.current.pedido).toMatchObject({ id: null, tamanio: "20", niveles: 2, tipoPan: "redvelvet", relleno: "cremapastelera" });
    });

    it("'Continuar pedido': carga el borrador y lo devuelve para abrir su paso", async () => {
        const borrador = { ...PEDIDO_VACIO, id: "ped1", tamanio: "10", niveles: 1, pasoActual: 3 };
        (obtenerBorrador as jest.Mock).mockResolvedValue({ pedido: borrador, error: null });
        const { result } = await renderHook(() => usePedido(), { wrapper });

        let inicial = null;
        await act(async () => { inicial = await result.current.iniciar({ borradorId: "ped1" }); });

        expect(inicial).toEqual(borrador);
        expect(result.current.pedido).toEqual(borrador);
    });

    it("borrador que ya no existe: muestra el motivo", async () => {
        (obtenerBorrador as jest.Mock).mockResolvedValue({ pedido: null, error: null });
        const { result } = await renderHook(() => usePedido(), { wrapper });

        await act(async () => { await result.current.iniciar({ borradorId: "ped1" }); });

        expect(result.current.errorCarga).toBe(MENSAJES_PEDIDO_CONTEXTO.BORRADOR_NO_DISPONIBLE);
    });

    it("ya iniciado (volviendo del paso 2) no vuelve a cargar ni borra lo capturado", async () => {
        const { result } = await renderHook(() => usePedido(), { wrapper });
        await act(async () => { await result.current.iniciar({}); });
        await act(async () => result.current.actualizar({ tamanio: "15" }));

        await act(async () => { await result.current.iniciar({ pastelId: "p1" }); });

        expect(obtenerPastel).not.toHaveBeenCalled();
        expect(result.current.pedido.tamanio).toBe("15");
    });

    it("guardar conserva el id creado y lo usa en el siguiente guardado (sin duplicar)", async () => {
        (guardarBorrador as jest.Mock)
            .mockResolvedValueOnce({ id: "ped1", imagenRuta: null, error: "Error de conexión. Tu progreso no se guardó, inténtalo de nuevo" })
            .mockResolvedValueOnce({ id: "ped1", imagenRuta: null, error: null });
        const { result } = await renderHook(() => usePedido(), { wrapper });
        await act(async () => { await result.current.iniciar({}); });
        await act(async () => result.current.actualizar({ tamanio: "15", niveles: 2 }));

        let error: string | null = null;
        const guardarViejo = result.current.guardar; // como el "Reintentar" de un Alert
        await act(async () => { error = await guardarViejo({ pasoActual: 2 }); });
        expect(error).not.toBeNull();
        expect(result.current.pedido.id).toBe("ped1");
        expect(result.current.pedido.pasoActual).toBe(1); // no avanza si fallo

        await act(async () => { error = await guardarViejo({ pasoActual: 2 }); });
        expect(error).toBeNull();
        expect((guardarBorrador as jest.Mock).mock.calls[1][0].id).toBe("ped1");
        expect(result.current.pedido.pasoActual).toBe(2);
    });
});
