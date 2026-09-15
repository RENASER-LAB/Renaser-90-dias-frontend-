# Publicar en Play Store

**Escrito el 2026-09-14**, la primera vez que este frontend se preparó para reemplazar a la app
publicada. Todo lo de acá está verificado contra los servidores reales, no copiado de la
documentación de Expo.

---

## 0. Lo que hay que saber antes de tocar nada

**Esta app NO es nueva en Play Store.** Ya hay una publicada, que sale del repo viejo
`renaserlab/RenaserPlayStoreCopy` y usa el paquete `com.renaser.app`. Este frontend la
**reemplaza**, así que cada build tiene que poder subirse como *actualización* de esa ficha.

Eso impone tres condiciones, y las tres ya están resueltas en `app.json` y `eas.json`. Se listan
para que nadie las "simplifique" sin saber qué rompe:

| Condición | Dónde vive | Qué pasa si se cambia |
|---|---|---|
| Paquete `com.renaser.app` | `app.json` → `android.package` | Play Store lo trata como una app **distinta**: ficha nueva, y quien ya la tiene instalada no recibe la actualización nunca |
| `projectId` `390944e9-a787-4479-90c8-cae078bc9d59` | `app.json` → `extra.eas.projectId` | Sin él, `eas init` crea un proyecto nuevo **con un keystore nuevo**, y Play Store rechaza el `.aab` por firma distinta |
| `version` mayor que la publicada | `app.json` → `version` | Play Store no acepta una versión que no suba |

> **Nunca corras `eas init` en este proyecto.** Sobrescribe el `projectId` y con él el enlace a la
> firma de la app publicada. Es el error más caro y aparece recién al subir el archivo.

---

## 1. Construir el `.aab`

```bash
npx eas-cli@latest login
npx eas-cli@latest build --platform android --profile production
```

Eso es todo. El perfil `production` de `eas.json` ya arma `app-bundle`, que es el formato que pide
Play Store.

**El `versionCode` no se toca a mano.** `eas.json` usa `appVersionSource: "remote"` con
`autoIncrement`, así que EAS lleva la cuenta en su servidor. El 2026-09-14 iba por **80** y el
siguiente build lo dejó en 81. El `version` de `app.json` (hoy `1.5.0`) es otra cosa: es el
*versionName*, el número que ve la gente en la ficha. Conviven: `1.5.0 (81)`.

### Si dice que no quedan builds

```
This account has used its Android builds from the Free plan this month
```

Dos salidas:

- Esperar a que el plan se reponga (el 1 de cada mes).
- `npx eas-cli@latest billing:subscribe starter --account renaser`.

También existe `--local`, que compila en la máquina y **no consume cuota**, bajando igual el
keystore de EAS. Necesita el SDK de Android y **JDK 21** — con el 25 que usa el backend, el plugin
de Gradle de Android no compila. Se apunta con `JAVA_HOME` sin tocar la configuración global.

### Comprobar la firma antes de construir

```bash
npx eas-cli@latest project:info    # tiene que decir @renaser/renaser
```

Si la cuenta es dueña del proyecto, el keystore está a su alcance y el build lo usa solo — en el
log aparece `Using Keystore from configuration: Build Credentials …`. Si dijera que va a generar
uno nuevo, **parar ahí**: ese `.aab` no se va a poder subir.

---

## 2. La API a la que apunta

```
https://djbooeq09skac.cloudfront.net
```

CloudFront `E3O4M4W7JW3TJQ` delante del EC2 de producción (cuenta `302277511407`, `us-east-1`).
Documentado en `docs/DESPLIEGUE_Y_CI.md` del backend.

Verificado el 2026-09-14 antes de escribirlo acá:

- `GET /actuator/health` → `200`, `{"status":"UP"}`
- `POST /api/v1/auth/login` sin cuerpo → `400`

Ese `400` es la comprobación que importa: una app nativa no manda cabecera `Origin`, y aun así el
backend la atiende. Si CORS la cortara, sería `403`.

> **El `eas.json` del repo viejo apuntaba a `renaser-back-staging.vercel.app` en el perfil de
> PRODUCCIÓN.** O sea que la app publicada hoy le habla a staging. Queda corregido acá; vale la
> pena recordarlo si alguien compara los dos archivos y cree que el viejo estaba bien.

**`preview` apunta al mismo sitio**, a propósito: la infraestructura nueva no tiene un entorno de
staging. Quien pruebe con un apk de preview escribe en datos reales.

---

## 3. La URL de la API no es un secreto. La clave de Google sí

`EXPO_PUBLIC_` **no significa secreto**. Expo incrusta esos valores en el bundle de JavaScript, así
que se sacan de un `.aab` con `unzip` y `strings`. Está explicado en `src/config/apiConfig.ts`.

- **La URL de la API puede ir ahí**: se ve igual en el tráfico de red de cualquier app. Lo que
  protege al backend es la autenticación, no el secreto de la dirección.
- **Una credencial NO puede ir ahí.**

### Pendiente real: `EXPO_PUBLIC_GOOGLE_PLACES_API_KEY`

Hoy **no está configurada** en ningún lado —ni `.env`, ni `eas.json`, ni el entorno de EAS— así
que el autocompletado de ubicación de la Ficha Inicial no funciona todavía.

El día que se configure para que funcione, **hay que restringirla antes de publicar**:

1. Google Cloud Console → la clave → Restricciones de aplicación.
2. **Apps de Android**, con huella **SHA-1 del certificado de firma** MÁS el nombre de paquete
   `com.renaser.app`. Hacen falta las dos: con una sola, extraerla sigue sirviendo.
3. La SHA-1 sale de `npx eas-cli@latest credentials --platform android`.

Sin eso, cualquiera que descargue la app puede usar la clave y **el consumo lo paga el dueño de la
cuenta de Google**.

> Se intentó quitarla del frontend el 2026-09-14 y **se revirtió**: el selector en cascada de la
> Ficha Inicial la necesita, y obligar a escribir el distrito a mano es fricción en el primer
> formulario que toca un aprendiz nuevo. La salida sana es mover la llamada al **backend**, que sí
> puede guardar una clave de verdad: el móvil manda lat/lng y recibe el distrito resuelto.

---

## 4. Antes de dar por terminado

- [ ] Restringir la clave de Google Places (§3), si está configurada.
- [ ] Probar las **12 notificaciones locales del radar** en un dispositivo real.
      `expo-notifications` no carga ni en web ni en Expo Go, así que es lo único que no se puede
      verificar sin un build nativo. Desde que `extra.eas.projectId` existe, el token de push
      nativo se puede pedir — antes `pushNativo.ts` devolvía `sin_project_id` y no pedía ninguno.
- [ ] Si se va a compilar en local: `npx expo prebuild --clean`. La carpeta `android/` del
      repositorio es un prebuild viejo y todavía tiene el `applicationId` anterior.

---

## 5. Lo que no se puede deshacer

Vale la pena tenerlo junto, porque son las decisiones sin marcha atrás:

- **El nombre de paquete.** Una vez que la app tiene instalaciones, no se puede cambiar ni
  reutilizar — ni siquiera desde la misma cuenta que lo publicó.
- **El keystore.** Vive en la cuenta de Expo, no en el repositorio. Si se pierde y la app NO usa
  Play App Signing, no hay forma de volver a publicar en esa ficha. Con Play App Signing (activado
  por defecto desde 2021) la clave de *carga* sí se puede resetear desde Play Console.
- **El `versionCode`.** Solo sube. Un número quemado por error no se recupera.
