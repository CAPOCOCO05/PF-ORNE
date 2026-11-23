import { act, render, screen } from "@testing-library/react-native";
import { useSinConexion } from "../../hooks/useEstadoRed";
import BannerConexion, { DURACION_RESTABLECIDA_MS, TEXTO_CONEXION_RESTABLECIDA, TEXTO_SIN_CONEXION } from "../BannerConexion";

jest.mock("../../hooks/useEstadoRed", () => ({ useSinConexion: jest.fn() }));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

// useSinConexion junta lo que reporta el sistema y si la API responde (se prueba en useEstadoRed.test)
const CON_INTERNET = false;
const MODO_AVION = true;

function mockRed(sinConexion: boolean) {
    (useSinConexion as jest.Mock).mockReturnValue(sinConexion);
}

describe("BannerConexion (F10 A8)", () => {
    afterEach(() => jest.useRealTimers());

    it("con internet no muestra nada", async () => {
        mockRed(CON_INTERNET);
        await render(<BannerConexion />);

        expect(screen.queryByTestId("banner-conexion")).toBeNull();
    });

    it("en modo avion avisa que no hay internet", async () => {
        mockRed(MODO_AVION);
        await render(<BannerConexion />);

        expect(screen.getByText(TEXTO_SIN_CONEXION)).toBeTruthy();
    });

    it("al volver la conexion lo confirma y luego se oculta", async () => {
        jest.useFakeTimers();
        mockRed(MODO_AVION);
        const vista = await render(<BannerConexion />);

        mockRed(CON_INTERNET);
        await vista.rerender(<BannerConexion />);
        expect(screen.getByText(TEXTO_CONEXION_RESTABLECIDA)).toBeTruthy();

        await act(async () => { jest.advanceTimersByTime(DURACION_RESTABLECIDA_MS); });
        expect(screen.queryByTestId("banner-conexion")).toBeNull();
    });
});
