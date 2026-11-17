import { fireEvent, render, screen } from "@testing-library/react-native";
import AvisoPrivacidad from "../../app/aviso-privacidad";
import { AVISO_PRIVACIDAD, CORREO_PRIVACIDAD } from "../../src/constants/avisoPrivacidad";

const mockBack = jest.fn();
const mockReplace = jest.fn();
let mockPuedeRegresar = true;
jest.mock("expo-router", () => ({
    useRouter: () => ({ back: mockBack, replace: mockReplace, canGoBack: () => mockPuedeRegresar }),
}));

beforeEach(() => {
    jest.clearAllMocks();
    mockPuedeRegresar = true;
});

describe("Aviso de privacidad (F08 N2)", () => {
    it("muestra todas las secciones y el correo de contacto ARCO", async () => {
        await render(<AvisoPrivacidad />);

        for (const {titulo} of AVISO_PRIVACIDAD) {
            expect(screen.getByText(titulo)).toBeTruthy();
        }
        expect(screen.getByText(new RegExp(CORREO_PRIVACIDAD))).toBeTruthy();
    });

    it("incluye el contenido minimo de la LFPDPPP", () => {
        const titulos = AVISO_PRIVACIDAD.map((s) => s.titulo);
        expect(titulos).toEqual(expect.arrayContaining([
            "Responsable", "Datos que recabamos", "Para qué los usamos",
            "Permisos del dispositivo", "Con quién los compartimos", "Tus derechos (ARCO)",
        ]));
    });

    it("Atrás regresa a la pantalla anterior", async () => {
        await render(<AvisoPrivacidad />);

        await fireEvent.press(screen.getByText("‹ Atrás"));

        expect(mockBack).toHaveBeenCalled();
    });

    it("sin pantalla anterior va al inicio", async () => {
        mockPuedeRegresar = false;
        await render(<AvisoPrivacidad />);

        await fireEvent.press(screen.getByText("‹ Atrás"));

        expect(mockReplace).toHaveBeenCalledWith("/");
    });
});
