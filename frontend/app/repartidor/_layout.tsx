import GuardiaRol from "../../src/components/GuardiaRol";
import MenuLateral from "../../src/components/MenuLateral";

// seccion del rol repartidor
export default function Layout() {
    return (
        <GuardiaRol rol="repartidor">
            <MenuLateral
                opciones={[
                    {ruta: 'index', titulo: 'Mis entregas'},
                    {ruta: 'perfil', titulo: 'Perfil'},
                ]}
                ocultas={['entrega/[id]']}
                rutaPerfil="perfil"
            />
        </GuardiaRol>
    );
}
