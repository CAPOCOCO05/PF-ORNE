import { useRouter } from "expo-router";
import PantallaPaso from "../../../../src/components/pedido/PantallaPaso";
import SelectorSabor from "../../../../src/components/pedido/SelectorSabor";
import { SABORES_PAN, SABORES_RELLENO } from "../../../../src/constants/catalogoSabores";
import { usePedido } from "../../../../src/context/PedidoContext";
import { RUTA_PASO, usePasoPedido } from "../../../../src/hooks/usePasoPedido";

// F01 paso 2: sabor de pan y relleno (uno de cada uno, D5)
export default function PasoSabor() {
    const router = useRouter();
    const {pedido, actualizar} = usePedido();
    const {errores, guardando, siguiente} = usePasoPedido(2);

    return (
        <PantallaPaso
            paso={2}
            textoAtras="Atrás"
            onAtras={() => router.back()}
            onSiguiente={() => siguiente(() => router.push(RUTA_PASO[3]))}
            guardando={guardando}
        >
            <SelectorSabor
                etiqueta="Sabor de pan"
                sabores={SABORES_PAN}
                seleccionado={pedido.tipoPan}
                onSeleccionar={(tipoPan) => actualizar({tipoPan})}
                error={errores.tipoPan}
            />
            <SelectorSabor
                etiqueta="Sabor de relleno"
                sabores={SABORES_RELLENO}
                seleccionado={pedido.relleno}
                onSeleccionar={(relleno) => actualizar({relleno})}
                error={errores.relleno}
            />
        </PantallaPaso>
    );
}
