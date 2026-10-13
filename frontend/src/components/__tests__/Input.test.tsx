import { fireEvent, render, screen } from "@testing-library/react-native";
import Input from "../Input";

describe("Input", () => {
    it("muestra la etiqueta y propaga el texto", async () => {
        const onChangeText = jest.fn();
        await render(<Input etiqueta="Correo" placeholder="ejemplo@gmail.com" onChangeText={onChangeText} />);

        expect(screen.getByText("Correo")).toBeTruthy();
        await fireEvent.changeText(screen.getByPlaceholderText("ejemplo@gmail.com"), "ana@mail.com");

        expect(onChangeText).toHaveBeenCalledWith("ana@mail.com");
    });

    it("muestra el mensaje de error", async () => {
        await render(<Input etiqueta="Correo" error="Formato de correo inválido" />);

        expect(screen.getByText("Formato de correo inválido")).toBeTruthy();
    });

    it("sin error no muestra mensaje", async () => {
        await render(<Input etiqueta="Correo" error={null} />);

        expect(screen.queryByText(/inválido/)).toBeNull();
    });

    it("muestra el contador de caracteres", async () => {
        await render(<Input etiqueta="Mensaje" contador={{actual: 123, maximo: 500}} />);

        expect(screen.getByText("123/500")).toBeTruthy();
    });
});
