import { act, renderHook, waitFor } from "@testing-library/react-native";
import { useCatalogo } from "../useCatalogo";
import { listarCatalogo } from "../../services/catalogoService";
import { FILTROS_VACIOS } from "../../constants/filtrosCatalogo";
import { FiltrosCatalogo } from "../../types/pedido.types";

jest.mock("../../services/catalogoService", () => ({ listarCatalogo: jest.fn() }));

const listar = listarCatalogo as jest.Mock;

function pagina(ids: string[], hayMas: boolean) {
    return { pasteles: ids.map((id) => ({ id, nombre: id })), hayMas, error: null };
}

beforeEach(() => jest.clearAllMocks());

describe("useCatalogo", () => {
    it("carga la primera pagina al montarse", async () => {
        listar.mockResolvedValue(pagina(["a", "b"], true));

        const { result } = await renderHook(() => useCatalogo());

        await waitFor(() => expect(result.current.pasteles).toHaveLength(2));
        expect(listar).toHaveBeenCalledWith(0, FILTROS_VACIOS);
        expect(result.current.hayMas).toBe(true);
    });

    it("cargarMas agrega la siguiente pagina", async () => {
        listar.mockResolvedValueOnce(pagina(["a"], true)).mockResolvedValueOnce(pagina(["b"], false));
        const { result } = await renderHook(() => useCatalogo());
        await waitFor(() => expect(result.current.pasteles).toHaveLength(1));

        await act(async () => result.current.cargarMas());

        expect(listar).toHaveBeenLastCalledWith(1, FILTROS_VACIOS);
        expect(result.current.pasteles.map((p) => p.id)).toEqual(["a", "b"]);
        expect(result.current.hayMas).toBe(false);
    });

    it("al final de la lista no pide mas", async () => {
        listar.mockResolvedValue(pagina(["a"], false));
        const { result } = await renderHook(() => useCatalogo());
        await waitFor(() => expect(result.current.pasteles).toHaveLength(1));

        await act(async () => result.current.cargarMas());

        expect(listar).toHaveBeenCalledTimes(1);
    });

    it("con error no sigue pidiendo al hacer scroll; reintentar pide la misma pagina", async () => {
        listar
            .mockResolvedValueOnce(pagina(["a"], true))
            .mockResolvedValueOnce({ pasteles: [], hayMas: false, error: "Error de conexión, inténtalo de nuevo" })
            .mockResolvedValueOnce(pagina(["b"], false));
        const { result } = await renderHook(() => useCatalogo());
        await waitFor(() => expect(result.current.pasteles).toHaveLength(1));

        await act(async () => result.current.cargarMas());
        expect(result.current.error).toBe("Error de conexión, inténtalo de nuevo");
        expect(result.current.pasteles).toHaveLength(1); // conserva lo ya cargado

        await act(async () => result.current.cargarMas());
        expect(listar).toHaveBeenCalledTimes(2);

        await act(async () => result.current.reintentar());
        expect(listar).toHaveBeenLastCalledWith(1, FILTROS_VACIOS);
        expect(result.current.error).toBeNull();
        expect(result.current.pasteles.map((p) => p.id)).toEqual(["a", "b"]);
    });

    it("recargar vuelve a la primera pagina y reemplaza la lista", async () => {
        listar.mockResolvedValueOnce(pagina(["a"], true)).mockResolvedValueOnce(pagina(["z"], false));
        const { result } = await renderHook(() => useCatalogo());
        await waitFor(() => expect(result.current.pasteles).toHaveLength(1));

        await act(async () => result.current.recargar());

        expect(listar).toHaveBeenLastCalledWith(0, FILTROS_VACIOS);
        expect(result.current.pasteles.map((p) => p.id)).toEqual(["z"]);
    });

    it("al cambiar los filtros vuelve a la primera pagina con los filtros nuevos (F07 M5)", async () => {
        const conChocolate: FiltrosCatalogo = { ...FILTROS_VACIOS, panes: ["chocolate"] };
        listar.mockResolvedValueOnce(pagina(["a", "b"], true)).mockResolvedValueOnce(pagina(["c"], false));
        const { result, rerender } = await renderHook(
            ({ filtros }: { filtros: FiltrosCatalogo }) => useCatalogo(filtros),
            { initialProps: { filtros: FILTROS_VACIOS } },
        );
        await waitFor(() => expect(result.current.pasteles).toHaveLength(2));

        await rerender({ filtros: conChocolate });

        await waitFor(() => expect(result.current.pasteles.map((p) => p.id)).toEqual(["c"]));
        expect(listar).toHaveBeenLastCalledWith(0, conChocolate);
        expect(result.current.hayMas).toBe(false);
    });

    it("si cambian los filtros mientras carga, se ignora la respuesta anterior", async () => {
        const conFresa: FiltrosCatalogo = { ...FILTROS_VACIOS, panes: ["fresa"] };
        let resolverVieja: (valor: unknown) => void = () => undefined;
        listar
            .mockReturnValueOnce(new Promise((resolver) => { resolverVieja = resolver; }))
            .mockResolvedValueOnce(pagina(["fresa1"], false));
        const { result, rerender } = await renderHook(
            ({ filtros }: { filtros: FiltrosCatalogo }) => useCatalogo(filtros),
            { initialProps: { filtros: FILTROS_VACIOS } },
        );

        await rerender({ filtros: conFresa });
        await waitFor(() => expect(result.current.pasteles.map((p) => p.id)).toEqual(["fresa1"]));
        await act(async () => resolverVieja(pagina(["viejo"], true)));

        expect(result.current.pasteles.map((p) => p.id)).toEqual(["fresa1"]);
        expect(result.current.hayMas).toBe(false);
    });
});
