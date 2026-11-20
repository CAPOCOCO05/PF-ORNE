import { render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import VistaTeclado from "../VistaTeclado";

describe("VistaTeclado (F10 A4)", () => {
    it("muestra su contenido", async () => {
        await render(<VistaTeclado><Text>campo</Text></VistaTeclado>);

        expect(screen.getByText("campo")).toBeTruthy();
    });
});
