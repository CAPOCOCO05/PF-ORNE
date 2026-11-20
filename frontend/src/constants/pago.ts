// pago simulado (F03 D3): un solo metodo y datos bancarios FICTICIOS, solo para mostrar el flujo.
// La app no captura numeros de tarjeta ni procesa pagos
export const METODO_PAGO = 'Tarjeta (transferencia o depósito)';

export const DATOS_BANCARIOS = {
    banco: 'Banco Bienestar',
    titular: 'Pastelería ORNE',
} as const;
