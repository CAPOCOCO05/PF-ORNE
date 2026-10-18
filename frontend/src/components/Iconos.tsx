import Svg, { Circle, ClipPath, Defs, Line, Path } from "react-native-svg";
import { COLORS } from "../theme/colors";

interface IconoProps {
    tamano?: number;
    color?: string;
}

// tres lineas para abrir el menu lateral (design/pantalla_principal_catalogo.png)
export function IconoMenu({tamano = 28, color = COLORS.TITULO}: IconoProps) {
    return (
        <Svg width={tamano} height={tamano} viewBox="0 0 24 24">
            {[6, 12, 18].map((y) => (
                <Line key={y} x1={3} y1={y} x2={21} y2={y} stroke={color} strokeWidth={1.8} strokeLinecap="round" />
            ))}
        </Svg>
    );
}

// circulo con silueta (design/elementos_visuales.png, "icono de perfil")
export function IconoPerfil({tamano = 28, color = COLORS.TITULO}: IconoProps) {
    return (
        <Svg width={tamano} height={tamano} viewBox="0 0 24 24">
            <Defs>
                <ClipPath id="circuloPerfil">
                    <Circle cx={12} cy={12} r={10} />
                </ClipPath>
            </Defs>
            <Circle cx={12} cy={12} r={10.5} stroke={color} strokeWidth={1.5} fill="none" />
            <Circle cx={12} cy={9} r={3.8} fill={color} />
            <Path d="M4 22 C4 16 8 14.5 12 14.5 C16 14.5 20 16 20 22 Z" fill={color} clipPath="url(#circuloPerfil)" />
        </Svg>
    );
}
