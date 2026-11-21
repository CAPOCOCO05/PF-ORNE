// aviso de privacidad (F08 N2), basado en la LFPDPPP. Plantilla de proyecto escolar:
// la pastelería debe revisarlo antes de un uso real (D6).

export interface SeccionAviso {
    titulo: string;
    parrafos: string[];
}

export const CORREO_PRIVACIDAD = 'orne@orne.com';
export const FECHA_AVISO = '16 de noviembre de 2026';

export const AVISO_PRIVACIDAD: SeccionAviso[] = [
    {
        titulo: 'Responsable',
        parrafos: [
            'Pastelería ORNE, con domicilio en Calle Primera, C.P. 22785, Ensenada, Baja California, México, es responsable del uso y protección de tus datos personales.',
        ],
    },
    {
        titulo: 'Datos que recabamos',
        parrafos: [
            'Nombre completo, correo electrónico, teléfono, dirección de entrega y la ubicación del punto que marcas en el mapa, así como la imagen de referencia que adjuntes a tu pastel.',
            'No recabamos datos sensibles ni financieros.',
        ],
    },
    {
        titulo: 'Para qué los usamos',
        parrafos: [
            'Crear y administrar tu cuenta, elaborar tu pastel, entregarlo en la dirección indicada y contactarte sobre tu pedido.',
            'No usamos tus datos para fines secundarios como publicidad o mercadotecnia.',
        ],
    },
    {
        titulo: 'Permisos del dispositivo',
        parrafos: [
            'Ubicación: solo mientras usas la app, para ubicar en el mapa la dirección de entrega.',
            'Galería: solo para leer la imagen que tú eliges como referencia.',
        ],
    },
    {
        titulo: 'Con quién los compartimos',
        parrafos: [
            'No vendemos ni transferimos tus datos a terceros. Se almacenan con nuestro proveedor de infraestructura (Supabase) y el repartidor solo ve tu nombre, teléfono y dirección del pedido que entrega.',
        ],
    },
    {
        titulo: 'Tus derechos (ARCO)',
        parrafos: [
            `Puedes acceder, rectificar o cancelar tus datos, oponerte a su uso o revocar tu consentimiento escribiendo a ${CORREO_PRIVACIDAD}. Te responderemos en un plazo máximo de 20 días hábiles.`,
            'Tu nombre, teléfono y dirección también los puedes corregir en cualquier momento desde tu perfil.',
        ],
    },
    {
        titulo: 'Cambios a este aviso',
        parrafos: [
            'Cualquier cambio se publicará en esta misma sección de la app, con su fecha de actualización.',
        ],
    },
];
