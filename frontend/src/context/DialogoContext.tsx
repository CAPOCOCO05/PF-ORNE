import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import Dialogo from "../components/Dialogo";

// F07 M1: dialogos con el estilo de ORNE en lugar de Alert.alert del sistema

export type TipoDialogo = 'confirmacion' | 'info' | 'error';

// confirmar: boton principal · cancelar: boton secundario · cerrar: atras de Android o tocar fuera (D4)
export type RespuestaDialogo = 'confirmar' | 'cancelar' | 'cerrar';

export interface OpcionesDialogo {
    titulo: string;
    mensaje?: string;
    tipo?: TipoDialogo;              // default 'confirmacion'
    textoConfirmar?: string;         // default 'Aceptar'
    textoCancelar?: string | null;   // null = un solo boton; default 'Cancelar'
    destructiva?: boolean;           // la accion no se puede deshacer
}

export interface OpcionesAviso {
    titulo: string;
    mensaje?: string;
    tipo?: 'info' | 'error';
    textoBoton?: string;
}

interface ValorDialogo {
    mostrar: (opciones: OpcionesDialogo) => Promise<RespuestaDialogo>;
    confirmar: (opciones: OpcionesDialogo) => Promise<boolean>;
    avisar: (opciones: OpcionesAviso) => Promise<void>;
}

interface Pendiente {
    opciones: OpcionesDialogo;
    resolver: (respuesta: RespuestaDialogo) => void;
    respondido: boolean;
}

const DialogoContext = createContext<ValorDialogo | null>(null);

export function DialogoProvider({children}: {children: React.ReactNode}) {
    // un dialogo a la vez; los que llegan mientras hay uno abierto se encolan (D3)
    const [cola, setCola] = useState<Pendiente[]>([]);
    const actual = cola[0] ?? null;
    const actualRef = useRef<Pendiente | null>(null);
    actualRef.current = actual;

    const mostrar = useCallback((opciones: OpcionesDialogo) => new Promise<RespuestaDialogo>((resolver) => {
        setCola((c) => [...c, {opciones, resolver, respondido: false}]);
    }), []);

    const confirmar = useCallback(async (opciones: OpcionesDialogo) => (await mostrar(opciones)) === 'confirmar', [mostrar]);

    const avisar = useCallback(async ({titulo, mensaje, tipo = 'info', textoBoton = 'Aceptar'}: OpcionesAviso) => {
        await mostrar({titulo, mensaje, tipo, textoConfirmar: textoBoton, textoCancelar: null});
    }, [mostrar]);

    // un toque doble no debe resolver dos veces ni saltarse el siguiente de la cola
    const responder = useCallback((respuesta: RespuestaDialogo) => {
        const pendiente = actualRef.current;
        if (!pendiente || pendiente.respondido) return;
        pendiente.respondido = true;
        setCola((c) => c.slice(1));
        pendiente.resolver(respuesta);
    }, []);

    const valor = useMemo(() => ({mostrar, confirmar, avisar}), [mostrar, confirmar, avisar]);

    return (
        <DialogoContext.Provider value={valor}>
            {children}
            <Dialogo opciones={actual?.opciones ?? null} onResponder={responder} />
        </DialogoContext.Provider>
    );
}

export function useDialogo(): ValorDialogo {
    const contexto = useContext(DialogoContext);
    if (!contexto) {
        throw new Error('useDialogo debe usarse dentro de <DialogoProvider> (app/_layout.tsx)');
    }
    return contexto;
}
