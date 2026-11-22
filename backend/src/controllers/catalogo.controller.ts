import { Request, Response } from 'express';
import { MENSAJES_CATALOGO } from '../constants/catalogo';
import * as catalogoService from '../services/catalogo.service';
import { validarDatosPastel, validarFiltros } from '../validators/catalogo.validator';
import { validarPagina, validarUuid } from '../validators/comunes.validator';

// capa HTTP del catalogo: lee y valida la peticion, llama al servicio y responde.
// Los errores (ApiError) los responde el middleware de errores

// GET /catalogo
export async function listar(req: Request, res: Response): Promise<void> {
    const filtros = validarFiltros(req.query);
    const pagina = validarPagina(req.query.pagina);
    res.json(await catalogoService.listarCatalogo(req.db, filtros, pagina));
}

// GET /catalogo/:id
export async function obtener(req: Request, res: Response): Promise<void> {
    const id = validarUuid(req.params.id, MENSAJES_CATALOGO.NO_ENCONTRADO);
    res.json({ pastel: await catalogoService.obtenerPastel(req.db, id) });
}

// GET /admin/catalogo
export async function listarAdmin(req: Request, res: Response): Promise<void> {
    const pagina = validarPagina(req.query.pagina);
    res.json(await catalogoService.listarCatalogoAdmin(req.db, pagina));
}

// GET /admin/catalogo/:id
export async function obtenerAdmin(req: Request, res: Response): Promise<void> {
    const id = validarUuid(req.params.id, MENSAJES_CATALOGO.NO_ENCONTRADO);
    res.json({ pastel: await catalogoService.obtenerPastelAdmin(req.db, id) });
}

// POST /admin/catalogo/imagenes (cuerpo: bytes de la imagen; Content-Type: image/...)
export async function subirImagen(req: Request, res: Response): Promise<void> {
    const mime = (req.header('content-type') ?? '').split(';')[0].trim().toLowerCase();
    const contenido = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    res.status(201).json({ url: await catalogoService.subirImagen(req.db, mime, contenido) });
}

// POST /admin/catalogo
export async function crear(req: Request, res: Response): Promise<void> {
    const datos = validarDatosPastel(req.body);
    res.status(201).json({ id: await catalogoService.guardarPastel(req.db, null, datos) });
}

// PUT /admin/catalogo/:id
export async function actualizar(req: Request, res: Response): Promise<void> {
    const id = validarUuid(req.params.id, MENSAJES_CATALOGO.NO_ENCONTRADO);
    const datos = validarDatosPastel(req.body);
    res.json({ id: await catalogoService.guardarPastel(req.db, id, datos) });
}
