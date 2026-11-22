import { tokenDeCabecera } from '../src/middlewares/auth.middleware';
import { nombreImagenCatalogo, rangoDePagina, recortarPagina, rutaDeUrlCatalogo } from '../src/utils/catalogo';
import { listaDeQuery, validarPagina } from '../src/validators/comunes.validator';

describe('utils del catalogo', () => {
    it('rangoDePagina pide un registro de mas', () => {
        expect(rangoDePagina(0, 10)).toEqual({ desde: 0, hasta: 10 });
        expect(rangoDePagina(2, 10)).toEqual({ desde: 20, hasta: 30 });
    });

    it('recortarPagina avisa si hay otra pagina', () => {
        expect(recortarPagina([1, 2, 3], 2)).toEqual({ pasteles: [1, 2], hayMas: true });
        expect(recortarPagina([1, 2], 2)).toEqual({ pasteles: [1, 2], hayMas: false });
    });

    it('nombreImagenCatalogo es unico por subida', () => {
        expect(nombreImagenCatalogo('png', 1700000000000, 0.123456789)).toMatch(/^pastel-1700000000000-[a-z0-9]{1,6}\.png$/);
    });

    it('rutaDeUrlCatalogo solo reconoce imagenes del bucket catalogo', () => {
        expect(rutaDeUrlCatalogo('https://x.supabase.co/storage/v1/object/public/catalogo/pastel%201.png?v=2')).toBe('pastel 1.png');
        expect(rutaDeUrlCatalogo('https://otro.com/imagen.png')).toBeNull();
        expect(rutaDeUrlCatalogo('https://x.supabase.co/storage/v1/object/public/referencias-pasteles/a.jpg')).toBeNull();
        expect(rutaDeUrlCatalogo(null)).toBeNull();
    });
});

describe('validaciones comunes', () => {
    it('validarPagina', () => {
        expect(validarPagina(undefined)).toBe(0);
        expect(validarPagina('3')).toBe(3);
        expect(() => validarPagina('-1')).toThrow();
        expect(() => validarPagina('1.5')).toThrow();
    });

    it('listaDeQuery acepta "a,b" y valores repetidos', () => {
        expect(listaDeQuery('a, b')).toEqual(['a', 'b']);
        expect(listaDeQuery(['a', 'b,c'])).toEqual(['a', 'b', 'c']);
        expect(listaDeQuery(undefined)).toEqual([]);
    });

    it('tokenDeCabecera', () => {
        expect(tokenDeCabecera('Bearer abc')).toBe('abc');
        expect(tokenDeCabecera('Basic abc')).toBeUndefined();
        expect(tokenDeCabecera(undefined)).toBeUndefined();
    });
});
