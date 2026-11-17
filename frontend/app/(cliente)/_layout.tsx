import BarraNavegacion from "../../src/components/BarraNavegacion";
import GuardiaRol from "../../src/components/GuardiaRol";
import { IconoCatalogo, IconoPedidos, IconoPerfil } from "../../src/components/Iconos";

// seccion del rol cliente
export default function Layout() {
    return (
        <GuardiaRol rol="cliente" permitirInvitado>
            <BarraNavegacion
                opciones={[
                    {ruta: 'home', titulo: 'Catálogo', Icono: IconoCatalogo},
                    {ruta: 'pedidos', titulo: 'Mis pedidos', Icono: IconoPedidos},
                    {ruta: 'perfil', titulo: 'Perfil', Icono: IconoPerfil},
                ]}
                ocultas={{'pedido/nuevo': 'home', 'pedido/[id]': 'pedidos', 'perfil/editar': 'perfil'}}
            />
        </GuardiaRol>
    );
}
