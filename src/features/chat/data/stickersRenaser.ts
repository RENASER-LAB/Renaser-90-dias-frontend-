/** Catálogo compartido por todos los chats. Los WebP originales conservan su transparencia. */
export type StickerRenaser = { id: string; nombre: string; imagen: number };

export const STICKERS_RENASER: readonly StickerRenaser[] = [
  { id: 'conectate-sesion', nombre: 'Conéctate a tu sesión', imagen: require('../../../../assets/stickers/renaser/conectate-sesion.webp') },
  { id: 'muy-bien', nombre: '¡Muy bien!', imagen: require('../../../../assets/stickers/renaser/muy-bien.webp') },
  { id: 'paquete-enviado', nombre: 'Paquete enviado', imagen: require('../../../../assets/stickers/renaser/paquete-enviado.webp') },
  { id: 'superaste-fase', nombre: 'Superaste la fase', imagen: require('../../../../assets/stickers/renaser/superaste-fase.webp') },
  { id: 'checklist', nombre: 'No enviaste tu checklist', imagen: require('../../../../assets/stickers/renaser/checklist.webp') },
  { id: 'vence-macaco', nombre: 'Vence a tu macaco', imagen: require('../../../../assets/stickers/renaser/vence-macaco.webp') },
  { id: 'bienvenido', nombre: '¡Bienvenido a tu RENASER!', imagen: require('../../../../assets/stickers/renaser/bienvenido.webp') },
  { id: 'llamada', nombre: 'No ingresaste a tu llamada', imagen: require('../../../../assets/stickers/renaser/llamada.webp') },
  { id: 'actividades', nombre: 'No realizaste tus actividades', imagen: require('../../../../assets/stickers/renaser/actividades.webp') },
  { id: 'entrada-asegurada', nombre: 'Entrada asegurada', imagen: require('../../../../assets/stickers/renaser/entrada-asegurada.webp') },
  { id: 'jugo-verde', nombre: 'No tomaste tu jugo verde', imagen: require('../../../../assets/stickers/renaser/jugo-verde.webp') },
  { id: 'reunion', nombre: 'Asiste puntual a tu reunión', imagen: require('../../../../assets/stickers/renaser/reunion.webp') },
  { id: 'ejercicios', nombre: 'Realiza tus ejercicios', imagen: require('../../../../assets/stickers/renaser/ejercicios.webp') },
  { id: 'felicidades', nombre: 'Felicidades por tu RENASER', imagen: require('../../../../assets/stickers/renaser/felicidades.webp') },
  { id: 'subiste-nivel', nombre: 'Subiste de nivel', imagen: require('../../../../assets/stickers/renaser/subiste-nivel.webp') },
  { id: 'bienvenido-alternativo', nombre: '¡Bienvenido a tu RENASER!', imagen: require('../../../../assets/stickers/renaser/bienvenido-alternativo.webp') },
  { id: 'superaste-fase-alternativo', nombre: 'Superaste la fase', imagen: require('../../../../assets/stickers/renaser/superaste-fase-alternativo.webp') },
];
