import { fireEvent, render, screen } from "@testing-library/react-native";
import PantallaError, { MENSAJE_ERROR_INESPERADO, TITULO_ERROR_INESPERADO } from "../PantallaError";

describe("PantallaError (ErrorBoundary)", () => {
    it("muestra un aviso claro y 'Reintentar' vuelve a dibujar la pantalla", async () => {
        jest.spyOn(console, "error").mockImplementation(() => {});
        const retry = jest.fn().mockResolvedValue(undefined);
        await render(<PantallaError error={new Error("fallo")} retry={retry} />);

        expect(screen.getByText(TITULO_ERROR_INESPERADO)).toBeTruthy();
        expect(screen.getByText(MENSAJE_ERROR_INESPERADO)).toBeTruthy();
        await fireEvent.press(screen.getByText("Reintentar"));
        expect(retry).toHaveBeenCalledTimes(1);
    });
});
