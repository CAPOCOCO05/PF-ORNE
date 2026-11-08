import { render as renderBase } from "@testing-library/react-native";
import { DialogoProvider } from "../context/DialogoContext";

// render de Testing Library con el DialogoProvider de app/_layout.tsx (F07 M1),
// para pantallas que usan useDialogo(); los dialogos se prueban presionando sus
// botones (testID "dialogo-confirmar" / "dialogo-cancelar")
export function render(ui: React.ReactElement, opciones: Parameters<typeof renderBase>[1] = {}) {
    return renderBase(ui, {wrapper: DialogoProvider, ...opciones});
}
