// pago simulado (F03 D3): un solo metodo y datos bancarios FICTICIOS, solo para mostrar el flujo.
// La app no captura numeros de tarjeta ni procesa pagos
export const METODO_PAGO = 'Tarjeta (transferencia o depósito)';

export const DATOS_BANCARIOS = {
    banco: 'Banco de Ejemplo',
    titular: 'Pastelería ORNE',
    clabe: '000 000 0000 0000 0000',   // 18 digitos, ficticia
    leyenda: 'Pago simulado: no se realizará ningún cargo',
} as const;
