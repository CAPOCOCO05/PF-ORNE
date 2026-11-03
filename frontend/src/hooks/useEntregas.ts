import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { listarEntregas } from "../services/repartidorService";
import { EntregaResumen } from "../types/pedido.types";

// "Mis entregas" (F06); se recarga al volver a la pantalla, asi desaparece la que se entrego
export function useEntregas() {
    const [entregas, setEntregas] = useState<EntregaResumen[]>([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const peticion = useRef(0);       // solo se aplica la respuesta de la ultima carga

    const cargar = useCallback(async () => {
        const miPeticion = ++peticion.current;
        setCargando(true);
        setError(null);
        const resultado = await listarEntregas();
        if (miPeticion !== peticion.current) return;
        setCargando(false);
        if (resultado.error) {
            setError(resultado.error);
            return;
        }
        setEntregas(resultado.entregas);
    }, []);

    useFocusEffect(useCallback(() => {
        cargar();
    }, [cargar]));

    return {entregas, cargando, error, recargar: cargar};
}
