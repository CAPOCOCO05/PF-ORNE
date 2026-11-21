// CLABE de cada pedido (F03 D3). Se deriva del id del pedido:
// cada pedido tiene la suya y siempre se muestra la misma, sin guardarla en la base

const DIGITOS_SIN_CONTROL = 17;
const PESOS_CLABE = [3, 7, 1] as const;

// hash FNV-1a de 32 bits: convierte el id en una semilla numerica
function semillaDe(texto: string): number {
    let hash = 0x811c9dc5;
    for (let i = 0; i < texto.length; i++) {
        hash ^= texto.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash;
}

// generador pseudoaleatorio (mulberry32): misma semilla → misma secuencia
function generador(semilla: number): () => number {
    let estado = semilla;
    return () => {
        estado = (estado + 0x6d2b79f5) >>> 0;
        let t = estado;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// digito verificador de una CLABE: pesos 3, 7, 1 sobre los primeros 17 digitos
export function digitoControlClabe(digitos: string): number {
    let suma = 0;
    for (let i = 0; i < DIGITOS_SIN_CONTROL; i++) {
        suma += (Number(digitos[i]) * PESOS_CLABE[i % PESOS_CLABE.length]) % 10;
    }
    return (10 - (suma % 10)) % 10;
}

// 18 digitos sin espacios: 17 pseudoaleatorios + verificador
export function generarClabe(pedidoId: string): string {
    const aleatorio = generador(semillaDe(pedidoId));
    let digitos = '';
    for (let i = 0; i < DIGITOS_SIN_CONTROL; i++) {
        digitos += Math.floor(aleatorio() * 10).toString();
    }
    return digitos + digitoControlClabe(digitos).toString();
}

// "012 180 0123 4567 8901": grupos de 3-3-4-4-4 para leerla facilmente
export function formatearClabe(clabe: string): string {
    return clabe.replace(/^(\d{3})(\d{3})(\d{4})(\d{4})(\d{4})$/, '$1 $2 $3 $4 $5');
}
