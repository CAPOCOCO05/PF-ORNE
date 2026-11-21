// pago (F03 D3): un solo metodo, por transferencia o deposito a la cuenta de la pasteleria.
// La app no captura numeros de tarjeta ni procesa pagos
export const METODO_PAGO = 'Tarjeta (transferencia o depósito)';

export const DATOS_BANCARIOS = {
    banco: 'Banco Bienestar',
    titular: 'Pastelería ORNE',
} as const;
