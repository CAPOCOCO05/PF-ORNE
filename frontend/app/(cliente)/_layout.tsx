import GuardiaRol from "../../src/components/GuardiaRol";
import MenuLateral from "../../src/components/MenuLateral";

// seccion del rol cliente
export default function Layout() {
    return (
        <GuardiaRol rol="cliente">
            <MenuLateral
                opciones={[
                    {ruta: 'home', titulo: 'Catálogo'},
                    {ruta: 'pedidos', titulo: 'Mis pedidos'},
                    {ruta: 'perfil', titulo: 'Perfil'},
                ]}
                ocultas={['pedido/nuevo', 'pedido/[id]']}
                rutaPerfil="perfil"
            />
        </GuardiaRol>
    );
}
