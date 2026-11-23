import { act, renderHook } from "@testing-library/react-native";
import * as ImagePicker from "expo-image-picker";
import { MENSAJE_ERROR_GALERIA, useElegirImagen } from "../useElegirImagen";

jest.mock("expo-image-picker", () => ({ requestMediaLibraryPermissionsAsync: jest.fn(), launchImageLibraryAsync: jest.fn() }));
jest.mock("../../context/DialogoContext", () => ({ useDialogo: () => ({ confirmar: jest.fn() }) }));

beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "warn").mockImplementation(() => {});
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });
});

async function elegir() {
    const { result } = await renderHook(() => useElegirImagen("motivo"));
    let respuesta: Awaited<ReturnType<typeof result.current>> | undefined;
    await act(async () => { respuesta = await result.current(); });
    return respuesta;
}

describe("useElegirImagen", () => {
    it("devuelve la imagen elegida", async () => {
        (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
            canceled: false, assets: [{ uri: "file:///a.jpg", mimeType: "image/jpeg", fileName: "a.jpg", fileSize: 100 }],
        });

        expect(await elegir()).toEqual({ imagen: { uri: "file:///a.jpg", mimeType: "image/jpeg", fileName: "a.jpg", fileSize: 100 }, error: null });
    });

    it("si la galeria falla devuelve un mensaje en lugar de lanzar el error", async () => {
        (ImagePicker.launchImageLibraryAsync as jest.Mock).mockRejectedValue(new Error("PHPhotosErrorDomain"));

        expect(await elegir()).toEqual({ imagen: null, error: MENSAJE_ERROR_GALERIA });
    });

    it("si pedir el permiso falla tambien avisa", async () => {
        (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockRejectedValue(new Error("x"));

        expect(await elegir()).toEqual({ imagen: null, error: MENSAJE_ERROR_GALERIA });
    });
});
