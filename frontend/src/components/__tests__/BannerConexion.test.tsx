import { act, render, screen } from "@testing-library/react-native";
import { useNetworkState } from "expo-network";
import BannerConexion, { DURACION_RESTABLECIDA_MS, TEXTO_CONEXION_RESTABLECIDA, TEXTO_SIN_CONEXION } from "../BannerConexion";

jest.mock("expo-network", () => ({ useNetworkState: jest.fn() }));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

const CON_INTERNET = { isConnected: true, isInternetReachable: true };
const MODO_AVION = { isConnected: false, isInternetReachable: false };

function mockRed(estado: object) {
    (useNetworkState as jest.Mock).mockReturnValue(estado);
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
