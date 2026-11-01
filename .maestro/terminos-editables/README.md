# Términos y condiciones editables (spec 027)

Flujos de Maestro de los términos por formación. **Escritos y sin correr**: piden el backend con la spec 027 (V148–V150), un emulador libre y cuentas sembradas en la base **local** (nunca
producción). Cada archivo dice arriba su precondición y su cuenta (`# cuenta: admin|aprendiz`).

| Flujo | Cuenta | Qué prueba |
|---|---|---|
| `01-admin-edita-y-publica` | admin | cambiar una cláusula, ver la vista previa, guardar el borrador y publicar sin pedir aceptar de nuevo; el historial |
| `02-aprendiz-acepta-de-nuevo` | aprendiz | tras publicar PIDIENDO aceptar de nuevo, al abrir la app sale «Actualizamos nuestros términos» y no se entra sin casilla y firma |
| `03-diplomado-por-revisar` | admin | el Diplomado recién creado dice «Por revisar» y no deja aceptar a nadie hasta publicar |
| `04-releer-lo-aceptado` | aprendiz | Yo → Ajustes → Mi onboarding → «Términos y condiciones»: versión, día, firma y texto de lo aceptado, en solo lectura |

Aislamiento (SC-007), para el E2E: una persona del Diplomado no ve ni acepta los términos de la Escuela, y publicar los del Diplomado no mueve los de la Escuela.
