import { render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import ScrollTeclado from "../ScrollTeclado";

describe("ScrollTeclado (F10 A4)", () => {
    it("muestra su contenido", async () => {
        await render(<ScrollTeclado><Text>campo</Text></ScrollTeclado>);

        expect(screen.getByText("campo")).toBeTruthy();
    });

    it("en iOS el ScrollView se desplaza hasta el campo enfocado y no pierde toques", async () => {
        await render(<ScrollTeclado testID="formulario"><Text>campo</Text></ScrollTeclado>);

        const scroll = screen.getByTestId("formulario");
        expect(scroll.props.automaticallyAdjustKeyboardInsets).toBe(true);
        expect(scroll.props.keyboardShouldPersistTaps).toBe("handled");
    });
});
