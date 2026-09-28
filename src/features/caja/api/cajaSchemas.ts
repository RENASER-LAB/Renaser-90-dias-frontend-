import { z } from 'zod';

/**
 * Contrato de la Caja Renaser (backend D-219, spec `docs/specs/CAJA_RENASER.md` §9).
 *
 * Tolerante como el resto de Administración (`passthrough()`, `nullish()` en lo opcional): un campo
 * que el servidor agregue mañana no rompe la pantalla de hoy. Los estados van como `string` y no como
 * enum: uno nuevo se ve con su nombre crudo en vez de dejar la lista en blanco.
 */

const textoOpcional = z.string().nullish();
/** El costo puede llegar como número o como texto («12.50»): se muestra tal cual. */
const costoSchema = z.union([z.number(), z.string()]).nullish();

export const filaDeCajaSchema = z
  .object({
    aprendizId: z.string(),
    nombre: textoOpcional,
    grupo: textoOpcional,
    diaPrograma: z.number().nullish(),
    estado: z.string(),
    /** Número de envío: 1 el primero, 2 después de un reenvío. */
    envio: z.number().nullish(),
    actualizadoEn: textoOpcional,
    /** Cumplimiento de hábitos de los días 1 a 7, de 0 a 100. */
    cumplimientoFase1: z.number().nullish(),
  })
  .passthrough();

export const listaDeCajasSchema = z
  .object({
    items: z.array(filaDeCajaSchema),
    total: z.number().nullish(),
    conteos: z.record(z.string(), z.number()).nullish(),
  })
  .passthrough();

export const destinoDeCajaSchema = z
  .object({
    nombre: textoOpcional,
    celular: textoOpcional,
    pais: textoOpcional,
    ciudad: textoOpcional,
    distrito: textoOpcional,
    provincia: textoOpcional,
    direccion: textoOpcional,
    referencias: textoOpcional,
    dni: textoOpcional,
    quienRecibe: textoOpcional,
    otraDireccion: textoOpcional,
    otroCelular: textoOpcional,
  })
  .passthrough();

export const elementoDeContenidoSchema = z
  .object({
    valor: z.string(),
    etiqueta: z.string(),
    marcado: z.boolean().nullish(),
  })
  .passthrough();

export const datosDelEnvioSchema = z
  .object({
    medio: textoOpcional,
    courier: textoOpcional,
    codigo: textoOpcional,
    costo: costoSchema,
    rastreoUrl: textoOpcional,
  })
  .passthrough();

export const pasoDelHistorialSchema = z
  .object({
    envio: z.number().nullish(),
    estado: z.string(),
    en: textoOpcional,
    porNombre: textoOpcional,
  })
  .passthrough();

export const detalleDeCajaSchema = z
  .object({
    aprendizId: z.string(),
    nombre: textoOpcional,
    estado: z.string(),
    envio: z.number().nullish(),
    cumplimientoFase1: z.number().nullish(),
    destino: destinoDeCajaSchema.nullish(),
    contenido: z.array(elementoDeContenidoSchema).nullish(),
    fotoArmadaUrl: textoOpcional,
    comprobanteUrl: textoOpcional,
    envioDatos: datosDelEnvioSchema.nullish(),
    historial: z.array(pasoDelHistorialSchema).nullish(),
    /** «CONTENIDO» | «FOTO» | «COMPROBANTE»: lo que el servidor pide antes de marcarla enviada. */
    faltaParaEnviar: z.array(z.string()).nullish(),
  })
  .passthrough();

export const subidaDeCajaSchema = z
  .object({
    url: z.string(),
    ruta: z.string(),
  })
  .passthrough();

export const contenidoDeLaCajaSchema = z
  .object({
    elementos: z.array(z.object({ valor: z.string(), etiqueta: z.string() }).passthrough()),
  })
  .passthrough();

/**
 * `GET /api/v1/admin/caja/carta/fondo` (y lo que devuelven `confirm` y `DELETE`): si la carta tiene un
 * fondo subido por el Admin y si este servidor puede guardar uno (en local, sin almacenamiento, no).
 */
export const fondoDeLaCartaSchema = z
  .object({
    cambiado: z.boolean(),
    sePuedeCambiar: z.boolean().nullish(),
    cambiadoPor: textoOpcional,
    cambiadoEn: textoOpcional,
  })
  .passthrough();

/**
 * El 409 de «enviar» cuando falta algo: `{message, faltan, timestamp}` (spec §11). `faltan` son las
 * mismas claves de `faltaParaEnviar`.
 */
export const cajaIncompletaSchema = z.object({ faltan: z.array(z.string()) }).passthrough();

/** `GET /api/v1/mentor/trainees/{id}/caja`: solo el estado. */
export const estadoDeCajaSchema = z.object({ estado: z.string() }).passthrough();

/** `GET /api/v1/me/caja`: lo que ve el aprendiz. */
export const miCajaSchema = z
  .object({
    estado: z.string(),
    pasos: z.array(z.object({ estado: z.string(), en: textoOpcional }).passthrough()).nullish(),
    envioDatos: datosDelEnvioSchema.nullish(),
    puedeConfirmar: z.boolean().nullish(),
    puedeCambiarDestino: z.boolean().nullish(),
    destino: z
      .object({
        otraDireccion: textoOpcional,
        otroCelular: textoOpcional,
        quienRecibe: textoOpcional,
        referencias: textoOpcional,
        provincia: textoOpcional,
      })
      .passthrough()
      .nullish(),
  })
  .passthrough();

export type FilaDeCaja = z.infer<typeof filaDeCajaSchema>;
export type ListaDeCajas = z.infer<typeof listaDeCajasSchema>;
export type DestinoDeCaja = z.infer<typeof destinoDeCajaSchema>;
export type ElementoDeContenido = z.infer<typeof elementoDeContenidoSchema>;
export type DatosDelEnvio = z.infer<typeof datosDelEnvioSchema>;
export type PasoDelHistorial = z.infer<typeof pasoDelHistorialSchema>;
export type DetalleDeCaja = z.infer<typeof detalleDeCajaSchema>;
export type SubidaDeCaja = z.infer<typeof subidaDeCajaSchema>;
export type ContenidoDeLaCaja = z.infer<typeof contenidoDeLaCajaSchema>;
export type MiCaja = z.infer<typeof miCajaSchema>;
export type FondoDeLaCarta = z.infer<typeof fondoDeLaCartaSchema>;
export type DestinoDeMiCaja = NonNullable<MiCaja['destino']>;
