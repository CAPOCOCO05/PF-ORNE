import BarraNavegacion from "../../src/components/BarraNavegacion";
import GuardiaRol from "../../src/components/GuardiaRol";
import { IconoEntregas, IconoPerfil } from "../../src/components/Iconos";

// seccion del rol repartidor
export default function Layout() {
    return (
        <GuardiaRol rol="repartidor">
            <BarraNavegacion
                opciones={[
                    {ruta: 'index', titulo: 'Mis entregas', Icono: IconoEntregas},
                    {ruta: 'perfil', titulo: 'Perfil', Icono: IconoPerfil},
                ]}
                ocultas={{'entrega/[id]': 'index'}}
            />
        </GuardiaRol>
    );
}
