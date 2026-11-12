import { useCallback } from "react";
import { Linking } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useDialogo } from "../context/DialogoContext";
import { ImagenLocal } from "../types/pedido.types";
import { validarImagen } from "../utils/pedido";

export const MENSAJE_PERMISO_GALERIA = 'Necesitamos acceso a tu galería';

// elige una imagen de la galeria con la validacion de F01 D9 (formato y 5 MB).
// Devuelve la imagen o el error a mostrar; null en ambos si se cancelo
export function useElegirImagen(motivoPermiso: string) {
    const {confirmar} = useDialogo();

    return useCallback(async (): Promise<{imagen: ImagenLocal | null; error: string | null}> => {
        const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permiso.granted) {
            const abrirAjustes = await confirmar({
                titulo: MENSAJE_PERMISO_GALERIA,
                mensaje: motivoPermiso,
                textoConfirmar: 'Abrir Ajustes',
            });
            if (abrirAjustes) await Linking.openSettings();
            return {imagen: null, error: null};
        }

        // quality 0.8: en iOS convierte HEIC a JPG (D9)
        const resultado = await ImagePicker.launchImageLibraryAsync({mediaTypes: ['images'], quality: 0.8});
        if (resultado.canceled) return {imagen: null, error: null};

        const {uri, mimeType, fileName, fileSize} = resultado.assets[0];
        const imagen: ImagenLocal = {uri, mimeType, fileName, fileSize};
        const error = validarImagen(imagen);
        return error ? {imagen: null, error} : {imagen, error: null};
    }, [confirmar, motivoPermiso]);
}
