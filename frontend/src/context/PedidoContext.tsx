import { createContext, useCallback, useContext, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { useAuth } from "./AuthContext";
import { obtenerPastel } from "../services/catalogoService";
import { guardarBorrador, obtenerBorrador } from "../services/pedidosService";
import { DatosEntrega, PasoPedido, PedidoEnCurso } from "../types/pedido.types";
import { ENTREGA_VACIA } from "../utils/entrega";

// estado del pedido en construccion, compartido por los pasos del wizard (01-navigation.md)

export const PEDIDO_VACIO: PedidoEnCurso = {
    id: null,
    tamanio: null,
    niveles: null,
    tipoPan: null,
    relleno: null,
    mensaje: '',
    imagenLocal: null,
    imagenRuta: null,
    entrega: ENTREGA_VACIA,
    pasoActual: 1,
};

export const MENSAJES_PEDIDO_CONTEXTO = {
    BORRADOR_NO_DISPONIBLE: 'Este pedido ya no está disponible para editar',
    PASTEL_NO_DISPONIBLE: 'Este pastel ya no está en el catálogo',
    SESION_EXPIRADA: 'Tu sesión expiró, inicia sesión de nuevo',
} as const;

export interface OrigenPedido {
    pastelId?: string;    // "Pedir" en el catalogo: precarga su configuracion (D6)
    borradorId?: string;  // "Continuar pedido" en Mis pedidos (D2)
}

interface OpcionesGuardado {
    pasoActual: PasoPedido;
    sincronizarImagen?: boolean;
    guardarEntrega?: boolean;
}

interface PedidoContextType {
    pedido: PedidoEnCurso;
    cargando: boolean;
    errorCarga: string | null;
    iniciar: (origen: OrigenPedido) => Promise<PedidoEnCurso | null>;
    reintentarCarga: () => void;
    actualizar: (cambios: Partial<PedidoEnCurso>) => void;
    actualizarEntrega: (cambios: Partial<DatosEntrega>) => void;
    guardar: (opciones: OpcionesGuardado) => Promise<string | null>; // devuelve el mensaje de error
}

const PedidoContext = createContext<PedidoContextType | undefined>(undefined);

export function PedidoProvider({children}: {children: React.ReactNode}) {
    const {user} = useAuth();
    const [pedido, setPedidoEstado] = useState<PedidoEnCurso>(PEDIDO_VACIO);
    const [cargando, setCargando] = useState(false);
    const [errorCarga, setErrorCarga] = useState<string | null>(null);
    // ultima version del pedido: guardar() la lee aunque se llame desde un closure viejo (ej. "Reintentar")
    const pedidoRef = useRef<PedidoEnCurso>(PEDIDO_VACIO);
    const origenRef = useRef<OrigenPedido | null>(null); // null = wizard sin iniciar
    const generacion = useRef(0); // descarta cargas que terminan despues de salir del wizard

    const setPedido = useCallback((siguiente: (actual: PedidoEnCurso) => PedidoEnCurso) => {
        pedidoRef.current = siguiente(pedidoRef.current);
        setPedidoEstado(pedidoRef.current);
    }, []);

    const cargar = useCallback(async (origen: OrigenPedido) => {
        const miGeneracion = ++generacion.current;
        setPedido(() => PEDIDO_VACIO);
        setErrorCarga(null);
        if (!origen.pastelId && !origen.borradorId) return PEDIDO_VACIO;

        setCargando(true);
        const {pedido: inicial, error} = await cargarInicial(origen);
        if (miGeneracion !== generacion.current) return null;
        setCargando(false);
        if (error || !inicial) {
            setErrorCarga(error);
            return null;
        }
        setPedido(() => inicial);
        return inicial;
    }, [setPedido]);

    // se llama al enfocar el paso 1; si el wizard ya esta iniciado (volviendo del paso 2) no hace nada
    const iniciar = useCallback(async (origen: OrigenPedido) => {
        if (origenRef.current) return null;
        origenRef.current = origen;
        return cargar(origen);
    }, [cargar]);

    const reintentarCarga = useCallback(() => {
        if (origenRef.current) cargar(origenRef.current);
    }, [cargar]);

    // al salir del wizard se descarta el estado (la pantalla del menu lateral no se desmonta)
    useFocusEffect(useCallback(() => () => {
        origenRef.current = null;
        generacion.current++;
        setCargando(false);
        setErrorCarga(null);
        setPedido(() => PEDIDO_VACIO);
    }, [setPedido]));

    const actualizar = useCallback((cambios: Partial<PedidoEnCurso>) => {
        setPedido((actual) => ({...actual, ...cambios}));
    }, [setPedido]);

    // mezcla sobre la entrega mas reciente: la geocodificacion responde tarde y no debe pisar lo escrito
    const actualizarEntrega = useCallback((cambios: Partial<DatosEntrega>) => {
        setPedido((actual) => ({...actual, entrega: {...actual.entrega, ...cambios}}));
    }, [setPedido]);

    // guarda el borrador (D2); el id y la ruta de la imagen se conservan aunque falle algo
    const guardar = useCallback(async (opciones: OpcionesGuardado) => {
        if (!user) return MENSAJES_PEDIDO_CONTEXTO.SESION_EXPIRADA;
        const resultado = await guardarBorrador(pedidoRef.current, user.id, opciones);
        setPedido((actual) => ({
            ...actual,
            id: resultado.id ?? actual.id,
            imagenRuta: resultado.imagenRuta,
            imagenLocal: resultado.error ? actual.imagenLocal : null, // ya subida deja de ser local
            pasoActual: resultado.error ? actual.pasoActual : opciones.pasoActual,
        }));
        return resultado.error;
    }, [user, setPedido]);

    return (
        <PedidoContext.Provider value={{pedido, cargando, errorCarga, iniciar, reintentarCarga, actualizar, actualizarEntrega, guardar}}>
            {children}
        </PedidoContext.Provider>
    );
}

// pedido inicial segun el origen; si no se encuentra, error con el motivo
async function cargarInicial({pastelId, borradorId}: OrigenPedido): Promise<{pedido: PedidoEnCurso | null; error: string | null}> {
    if (borradorId) {
        const {pedido, error} = await obtenerBorrador(borradorId);
        if (error || !pedido) return {pedido: null, error: error ?? MENSAJES_PEDIDO_CONTEXTO.BORRADOR_NO_DISPONIBLE};
        return {pedido, error: null};
    }

    const {pastel, error} = await obtenerPastel(pastelId!);
    if (error || !pastel) return {pedido: null, error: error ?? MENSAJES_PEDIDO_CONTEXTO.PASTEL_NO_DISPONIBLE};
    return {
        pedido: {
            ...PEDIDO_VACIO,
            tamanio: pastel.tamanio,
            niveles: pastel.niveles,
            tipoPan: pastel.tipo_pan,
            relleno: pastel.relleno,
        },
        error: null,
    };
}

export function usePedido() {
    const context = useContext(PedidoContext);
    if (context === undefined) {
        throw new Error("usePedido debe ser usado dentro de un PedidoProvider");
    }
    return context;
}
