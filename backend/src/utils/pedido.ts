import { COSTO_NIVEL_EXTRA, COSTO_RELLENO, ERRORES_CONFIRMACION, CodigoConfirmacion, PRECIO_BASE } from '../constants/pedido';
import { Niveles, RellenoId, Tamanio } from '../types/catalogo.types';

// funciones puras del pedido, sin acceso a datos

// PrecioBase(tamaño) + CostoNivelExtra × (niveles − 1) + CostoRelleno; el pan no afecta (F01 D7).
// Sin tamaño es 0; sin niveles se toma 1 y sin relleno se suma 0. confirmar_pedido lo recalcula
export function calcularPrecio(tamanio: Tamanio | null, niveles: Niveles | null, relleno: RellenoId | null): number {
    if (!tamanio) return 0;
    return PRECIO_BASE[tamanio] + COSTO_NIVEL_EXTRA * ((niveles ?? 1) - 1) + (relleno ? COSTO_RELLENO[relleno] : 0);
}

// caracteres visibles: un emoji cuenta como 1 (D8)
export function contarCaracteres(texto: string): number {
    return [...texto].length;
}

// texto legible para el repartidor: "Calle 123 Int 4, Colonia"
export function armarDireccion(calle: string, numeroExterior: string, numeroInterior: string, colonia: string): string {
    const interior = numeroInterior.trim() ? ` Int ${numeroInterior.trim()}` : '';
    return `${calle.trim()} ${numeroExterior.trim()}${interior}, ${colonia.trim()}`;
}

// carpeta de las imagenes de referencia de un pedido: <usuario>/<pedido> (las politicas de 006
// solo dejan al dueño escribir en la carpeta que empieza con su id)
export function carpetaReferencia(usuarioId: string, pedidoId: string): string {
    return `${usuarioId}/${pedidoId}`;
}

// ruta valida de una imagen de referencia: <uuid>/<uuid>/referencia.<ext>
export function esRutaReferencia(ruta: string): boolean {
    const uuid = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
    return new RegExp(`^${uuid}/${uuid}/referencia\\.[a-z]{3,4}$`, 'i').test(ruta);
}

// codigo de error de confirmar_pedido dentro del mensaje de Postgres; null si no es uno conocido
export function codigoConfirmacion(mensaje: string): CodigoConfirmacion | null {
    const codigos = Object.keys(ERRORES_CONFIRMACION) as CodigoConfirmacion[];
    return codigos.find((codigo) => mensaje.includes(codigo)) ?? null;
}
