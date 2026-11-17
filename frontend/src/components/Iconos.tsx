import Svg, { Circle, ClipPath, Defs, Line, Path, Rect } from "react-native-svg";
import { COLORS } from "../theme/colors";

export interface IconoProps {
    tamano?: number;
    color?: string;
}

// pastel de dos pisos con vela: pestaña "Catálogo" (F08 N1)
export function IconoCatalogo({tamano = 26, color = COLORS.TITULO}: IconoProps) {
    return (
        <Svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.7} strokeLinejoin="round">
            <Line x1={12} y1={2.5} x2={12} y2={6} strokeLinecap="round" />
            <Rect x={7} y={6} width={10} height={6} rx={1.5} />
            <Rect x={3.5} y={12} width={17} height={8} rx={1.5} />
            <Path d="M3.5 15.5 C6 17 8.5 14 12 15.5 C15.5 17 18 14 20.5 15.5" />
        </Svg>
    );
}

// hoja con renglones: pestañas "Mis pedidos" y "Pedidos" (F08 N1)
export function IconoPedidos({tamano = 26, color = COLORS.TITULO}: IconoProps) {
    return (
        <Svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round">
            <Rect x={5} y={3} width={14} height={18} rx={2} strokeLinejoin="round" />
            {[8, 12, 16].map((y) => (
                <Line key={y} x1={8.5} y1={y} x2={15.5} y2={y} />
            ))}
        </Svg>
    );
}

// camioneta de reparto: pestaña "Mis entregas" (F08 N1)
export function IconoEntregas({tamano = 26, color = COLORS.TITULO}: IconoProps) {
    return (
        <Svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.7} strokeLinejoin="round">
            <Path d="M2.5 6 H14 V16 H2.5 Z" />
            <Path d="M14 9.5 H18 L21.5 13 V16 H14 Z" />
            <Circle cx={6.5} cy={17.5} r={1.8} fill={COLORS.FONDO} />
            <Circle cx={17.5} cy={17.5} r={1.8} fill={COLORS.FONDO} />
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
