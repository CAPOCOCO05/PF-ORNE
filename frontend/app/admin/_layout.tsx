import GuardiaRol from "../../src/components/GuardiaRol";
import MenuLateral from "../../src/components/MenuLateral";

// seccion del rol admin
export default function Layout() {
    return (
        <GuardiaRol rol="admin">
            <MenuLateral
                opciones={[
                    {ruta: 'index', titulo: 'Pedidos'},
                    {ruta: 'perfil', titulo: 'Perfil'},
                ]}
                ocultas={['pedido/[id]']}
                rutaPerfil="perfil"
            />
        </GuardiaRol>
    );
}
