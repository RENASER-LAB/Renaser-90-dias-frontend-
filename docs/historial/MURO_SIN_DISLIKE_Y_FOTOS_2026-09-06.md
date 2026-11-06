# Muro: se retira el dislike y las fotos dejan de recortarse

**Fecha:** 2026-09-06 · **Rama:** `auditoria` (sin commitear al escribir esto) · **Alcance:** solo frontend.
**Pedido del dueño:** *"en el muro quitarás la parte del dislike, no desea el cliente esta parte, igual en ver quiénes reaccionaron, pero no quiere dislike"* y *"la imagen se recorta, quieren esa parte de las imágenes que sea igual que Instagram o Facebook, mencionó autodetectar"*.

---

## 1. Se retira el dislike

El backend **no se tocó**: `WallReactionType` sigue siendo `LIKE | DISLIKE` y `POST /api/v1/wall/{id}/react` sigue aceptando los dos. Lo que cambia es que ninguna pantalla produce ni muestra `DISLIKE`.

| Dónde | Antes | Ahora |
|---|---|---|
| Botones de acción de la publicación | 👍 Like · 👎 Dislike · Comentar · Compartir | 👍 Like · Comentar · Compartir |
| Contadores sobre la barra de acciones | `👍 12` `👎 3` · Ver quién reaccionó | `👍 12` · Ver quién reaccionó |
| Modal "Ver quién reaccionó" | Pestañas TODOS / 👍 LIKES / 👎 DISLIKES, y cada fila con 👍 o 👎 | Sin pestañas: un solo conteo `👍 N me gusta` y la lista de quienes dieron me gusta |
| Votos de un comentario (en el muro y en el visor de fotos) | 👍 y 👎 | solo 👍 |

Archivos: `screens/ComunidadScreen.tsx`, `features/community/components/ImageViewerModal.tsx`, `features/community/api/wallMappers.ts`, `features/community/hooks/useWallReactions.ts`, `features/community/hooks/useWallFeed.ts`, `features/community/types/community.types.ts`.

Los tipos de la interfaz se cerraron a un solo valor (`userReaction?: 'like' | null`, `ReactionUser.type: 'like'`) y se quitó el campo `dislikes`, para que el compilador impida que el dislike vuelva a colarse por descuido. El voto de un comentario dejó de recibir el tipo de reacción: ahora es un interruptor (`handleCommentVote(postId, commentId)`).

### Las reacciones negativas que ya estaban guardadas

Es lo único de esta parte que conviene decidir con la cabeza fría, porque el backend las conserva:

- **Quien había dejado un 👎** ve la publicación como si no hubiera reaccionado. Su dislike sigue en la base, pero no tiene forma de verlo ni de deshacerlo desde la app. En cuanto toque "me gusta", el backend reemplaza una reacción por la otra (`ReaccionarUseCase`) y el rastro desaparece solo.
- **En "ver quién reaccionó" esas filas se descartan** en `useWallReactions`, antes de traducirlas. Es deliberado: al quedar un solo ícono, mostrarlas obligaría a dibujar con un pulgar arriba a alguien que en realidad puso pulgar abajo. Sería una afirmación falsa sobre una persona.
- **El conteo de "me gusta" nunca los incluyó**, así que no hay número que se mueva.

**Queda para decidir el dueño:** si además se quieren borrar de la base las reacciones `DISLIKE` viejas (una migración de una sola línea) o dejarlas como historial inerte. Hoy son invisibles, así que no corre prisa.

---

## 2. Las fotos dejan de recortarse ("autodetectar")

### Qué pasaba

La caja de una foto sola era `height: 120` **fijo** (`ComunidadScreen.tsx`, `styles.mediaSingleBox`) y la foto se pintaba con `contentFit="cover"`. El ancho lo daba la tarjeta y el alto era siempre 120, así que **cualquier foto que no fuera un panorama muy ancho perdía contenido**: una vertical de teléfono en una tarjeta de ~340 px se recortaba a menos de un tercio.

El dato del tamaño de la foto no viaja en el feed — `WallMedia` es solo `url` y `mimeType` —, así que no había nada que "leer" y la caja no tenía cómo adaptarse. (En `types/schema.types.ts` hay un `MediaAttachment.aspectRatio` con el comentario *"Para autocorrección vertical/horizontal"*: la intención original estaba, pero ese tipo no lo usa nadie.)

### Qué se hizo

1. **Autodetección.** `FotoMuro` lee el tamaño real de la foto del propio decodificador, en `onLoad` (`event.source.width/height`, verificado contra las definiciones de `expo-image@57` instaladas), y lo informa por `onProporcion`.
2. **La caja toma la forma de la foto.** `ComunidadScreen` guarda esa proporción por publicación y se la pasa a la caja como `aspectRatio`. Mientras la foto no cargó, la caja es cuadrada — el punto medio, para que el salto de layout sea el más chico posible.
3. **Nunca se recorta.** La foto sola se dibuja con `contentFit="contain"`. Dentro del rango admitido `contain` y `cover` se ven idénticos (la caja ya tiene la proporción de la foto, no sobra nada); la diferencia aparece solo en los extremos, y ahí `contain` muestra la foto entera con dos franjas del color de la tarjeta en vez de cortarla.

**El rango admitido y por qué** (`features/community/utils/proporcionImagen.ts`):

| | Valor | Motivo |
|---|---|---|
| Retrato más alto | **3:4** (0,75) | Es la vertical por defecto de la cámara de un teléfono, o sea la foto más común del Muro. El 4:5 de Instagram la dejaba fuera del rango. El alto máximo queda en 1,33 × el ancho de la tarjeta, más o menos donde corta Facebook. |
| Panorama más ancho | **1,91:1** | El mismo límite que publica Instagram. Más ancho queda como una rendija ilegible. |
| Mientras carga / dato inválido | **1:1** | Un `aspectRatio` inválido colapsa la caja a altura 0 en React Native y la publicación quedaría sin foto y sin explicación. |

Comportamiento resultante, ejecutando la función real sobre una tarjeta de 340 px:

| Foto | Caja | Alto | Resultado |
|---|---|---|---|
| Captura de pantalla 9:16 | 0,750 | 453 px | entera, con franjas |
| Vertical de cámara 3:4 | 0,750 | 453 px | entera, sin franjas |
| Retrato 4:5 | 0,800 | 425 px | entera, sin franjas |
| Cuadrada 1:1 | 1,000 | 340 px | entera, sin franjas |
| Horizontal 4:3 | 1,333 | 255 px | entera, sin franjas |
| Horizontal 16:9 | 1,778 | 191 px | entera, sin franjas |
| Panorama 3:1 | 1,910 | 178 px | entera, con franjas |

**Ninguna foto pierde contenido en ningún caso.**

### Los mosaicos de 2 y 3+ fotos

Ahí sí se sigue recortando para llenar la celda, que es exactamente lo que hacen Instagram y Facebook en un mosaico. Lo que se corrigió es que las celdas tenían **alto fijo en píxeles** (100 px con dos fotos, 130 px con tres o más), o sea tiras muy bajas que apretaban las fotos:

- **Dos fotos:** cada celda pasa a ser **cuadrada** (`aspectRatio: 1`), como el mosaico de Instagram.
- **Tres o más:** el bloque pasa a `aspectRatio: 1.5` en vez de 130 px fijos, así crece con el ancho de la tarjeta. Se quitó el `height: '100%'` de la celda grande, porque un porcentaje contra un alto derivado de `aspectRatio` es el caso frágil de Yoga; el estirado lo da el `alignItems: 'stretch'` que la fila trae por defecto.

**Esto cambia el aspecto de las publicaciones con varias fotos: quedan más altas que antes.** Es revertible cambiando esos tres valores, sin tocar lógica.

El visor a pantalla completa ya usaba `contentFit="contain"`: ahí nunca hubo recorte y no se tocó.

---

## 3. Cómo se verificó

- `npx tsc --noEmit` — **sin errores**.
- `npx expo export --platform web` — **el bundle compila** (2,5 MB).
- `onLoad` — contrastado contra `node_modules/expo-image/build/Image.types.d.ts`: `ImageLoadEventData.source` trae `width` y `height`.
- `acotarProporcion` — **compilada y ejecutada de verdad** con los ocho casos de la tabla de arriba, incluidos los datos rotos (`0×0`, `NaN`), que caen al valor por defecto en vez de colapsar la caja.

**Sin verificar, y hay que decirlo:** no se miró en pantalla con publicaciones reales. Eso pide una sesión iniciada contra el backend, que no había al hacer este cambio. Lo que falta mirar es concreto:

1. Una publicación con **una** foto vertical y otra horizontal: que entren enteras y sin franjas.
2. Una publicación con **dos** fotos: celdas cuadradas.
3. Una publicación con **tres o más**: el bloque más alto, sin celdas colapsadas.
4. Que en la barra de acciones ya no esté el 👎 y que "Ver quién reaccionó" liste solo me gusta.
5. El salto de layout al cargar: la caja arranca cuadrada y se acomoda. Si molesta, la salida es que el backend guarde el tamaño de la foto al subirla y lo mande en `WallMedia` — ahí la caja nace con la forma correcta y no hay salto.

## 4. Lo que quedó fuera, a propósito

- **El backend no se tocó** (ni el enum, ni el endpoint, ni la base).
- **`src/types/schema.types.ts`** conserva `PostReactionType = 'like' | 'dislike'` y `dislikesCount`. Ese archivo **no lo importa nadie** (verificado): es un espejo de esquema muerto. Borrarlo o limpiarlo es una tarea aparte, no se metió acá para no mezclar.
- **Guardar el tamaño de la foto en el backend** (punto 5 de arriba), que es lo que eliminaría el salto de layout.
