import { Coordenadas } from '../constants/entrega';
import { Rol } from './auth.types';

// fila de perfiles
export interface Perfil {
    id: string;
    nombre: string;
    rol: Rol;
}

// direccion guardada del cliente (F07 M7): completa o no se guarda
export interface DireccionGuardada {
    calle: string;
    numeroExterior: string;
    numeroInterior: string;
    colonia: string;
    referencia: string;
    ubicacion: Coordenadas;
}

export interface DatosCliente {
    telefono: string;                       // '' si no hay
    direccion: DireccionGuardada | null;
}
