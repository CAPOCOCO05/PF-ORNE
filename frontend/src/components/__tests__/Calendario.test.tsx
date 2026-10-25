import { fireEvent, render, screen } from "@testing-library/react-native";
import Calendario from "../pedido/Calendario";

// viernes 16 de octubre de 2026
const HOY = "2026-10-16";

function dia(fecha: string) {
    return screen.getByLabelText(fecha);
}

describe("Calendario", () => {
    it("1 nivel: bloquea antes de hoy + 2 y los domingos", async () => {
        const onSeleccionar = jest.fn();
        await render(<Calendario seleccionada={null} niveles={1} hoy={HOY} onSeleccionar={onSeleccionar} />);

        expect(screen.getByText("Octubre 2026")).toBeTruthy();
        expect(dia("2026-10-17").props.accessibilityState.disabled).toBe(true);  // hoy + 1
        expect(dia("2026-10-18").props.accessibilityState.disabled).toBe(true);  // hoy + 2, pero domingo
        expect(dia("2026-10-19").props.accessibilityState.disabled).toBe(false); // lunes

        await fireEvent.press(dia("2026-10-17"));
        await fireEvent.press(dia("2026-10-19"));

        expect(onSeleccionar).toHaveBeenCalledTimes(1);
        expect(onSeleccionar).toHaveBeenCalledWith("2026-10-19");
    });

    it("3 niveles: requiere 10 dias", async () => {
        await render(<Calendario seleccionada={null} niveles={3} hoy={HOY} onSeleccionar={jest.fn()} />);

        expect(dia("2026-10-24").props.accessibilityState.disabled).toBe(true);
        expect(dia("2026-10-26").props.accessibilityState.disabled).toBe(false);
    });

    it("no deja ir antes del mes de la fecha minima ni despues de hoy + 60", async () => {
        await render(<Calendario seleccionada={null} niveles={1} hoy={HOY} onSeleccionar={jest.fn()} />);

        expect(screen.getByLabelText("Mes anterior").props.accessibilityState.disabled).toBe(true);
        await fireEvent.press(screen.getByLabelText("Mes siguiente"));
        await fireEvent.press(screen.getByLabelText("Mes siguiente"));

        expect(screen.getByText("Diciembre 2026")).toBeTruthy();
        expect(screen.getByLabelText("Mes siguiente").props.accessibilityState.disabled).toBe(true);
        expect(dia("2026-12-15").props.accessibilityState.disabled).toBe(false); // hoy + 60
        expect(dia("2026-12-16").props.accessibilityState.disabled).toBe(true);
    });

    it("abre en el mes de la fecha ya elegida", async () => {
        await render(<Calendario seleccionada="2026-11-20" niveles={1} hoy={HOY} onSeleccionar={jest.fn()} />);

        expect(screen.getByText("Noviembre 2026")).toBeTruthy();
        expect(dia("2026-11-20").props.accessibilityState.selected).toBe(true);
    });
});
