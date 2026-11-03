# Identidad por formación (spec 035, D-308 del backend)

Flujos de Maestro de la bienvenida y la imagen de cada formación. **Escritos y sin correr**: piden el backend con la spec 035 (V159), un emulador libre y cuentas
sembradas en la base **local** (nunca producción). En local el almacenamiento es de marcador: la imagen y la portada no se pueden subir (409); lo que se prueba
es la pantalla, los textos de cada formación y los chats. Cada archivo dice arriba su precondición. `../formaciones/correr.sh` abre la sesión con la cuenta de la
ranura (`# cuenta: aprendiz|admin`).

| Flujo | Cuenta | Qué prueba |
|---|---|---|
| `01-admin-bienvenida-por-formacion` | admin | Bienvenida → «Escuela · Diplomado · Certificación»: cada una con sus mensajes y su portada («Usa la portada de la Escuela.»); lo editado en una no aparece en otra |
| `02-admin-imagen-de-la-formacion` | admin | Formaciones → Diplomado → «Imagen de la formación»: las dos vistas del chat, el estado, y sin almacenamiento el aviso |
| `03-aprendiz-del-diplomado-su-chat` | aprendiz del Diplomado | Tribu: «Diplomado Renaser» sobre sus chats y «Diplomado Renaser Global»; la bienvenida de su soporte dice «Diplomado Renaser» |
| `04-escuela-igual-que-siempre` | aprendiz de la Escuela | «Formación Renaser» en Tribu y en su soporte; nada del Diplomado |
