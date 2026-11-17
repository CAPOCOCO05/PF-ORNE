import BarraNavegacion from "../../src/components/BarraNavegacion";
import GuardiaRol from "../../src/components/GuardiaRol";
import { IconoCatalogo, IconoPedidos, IconoPerfil } from "../../src/components/Iconos";

// seccion del rol admin
export default function Layout() {
    return (
        <GuardiaRol rol="admin">
            <BarraNavegacion
                opciones={[
                    {ruta: 'index', titulo: 'Pedidos', Icono: IconoPedidos},
                    {ruta: 'catalogo/index', titulo: 'Catálogo', Icono: IconoCatalogo},
                    {ruta: 'perfil', titulo: 'Perfil', Icono: IconoPerfil},
                ]}
                ocultas={{'pedido/[id]': 'index', 'catalogo/[id]': 'catalogo/index'}}
            />
        </GuardiaRol>
    );
}
