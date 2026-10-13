import { fireEvent, render, screen } from "@testing-library/react-native";
import Boton from "../Boton";

describe("Boton", () => {
    it("muestra el titulo y llama a onPress", async () => {
        const onPress = jest.fn();
        await render(<Boton titulo="Iniciar sesión" onPress={onPress} />);

        await fireEvent.press(screen.getByText("Iniciar sesión"));

        expect(onPress).toHaveBeenCalledTimes(1);
    });

    it("cargando: muestra spinner y no responde al toque", async () => {
        const onPress = jest.fn();
        await render(<Boton titulo="Iniciar sesión" onPress={onPress} cargando />);

        expect(screen.getByTestId("boton-cargando")).toBeTruthy();
        expect(screen.queryByText("Iniciar sesión")).toBeNull();

        await fireEvent.press(screen.getByRole("button"));
        expect(onPress).not.toHaveBeenCalled();
    });

    it("deshabilitado: no responde al toque", async () => {
        const onPress = jest.fn();
        await render(<Boton titulo="Pedir" variante="secundario" onPress={onPress} deshabilitado />);

        await fireEvent.press(screen.getByText("Pedir"));

        expect(onPress).not.toHaveBeenCalled();
    });
});
