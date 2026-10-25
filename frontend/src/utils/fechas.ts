const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

// "17 oct 2026" en la hora local del dispositivo (se arma a mano para no depender de Intl)
export function formatearFecha(iso: string): string {
    const fecha = new Date(iso);
    if (Number.isNaN(fecha.getTime())) return '';
    return `${fecha.getDate()} ${MESES[fecha.getMonth()]} ${fecha.getFullYear()}`;
}

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

// fecha de entrega 'YYYY-MM-DD' → "lunes 26 oct 2026"; se lee en UTC para no correrla de dia
export function formatearFechaEntrega(fecha: string): string {
    const [anio, mes, dia] = fecha.split('-').map(Number);
    const d = new Date(Date.UTC(anio, mes - 1, dia));
    if (Number.isNaN(d.getTime())) return '';
    return `${DIAS[d.getUTCDay()]} ${dia} ${MESES[mes - 1]} ${anio}`;
}
