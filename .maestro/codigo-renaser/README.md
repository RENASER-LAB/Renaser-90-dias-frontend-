# Código Renaser en Maestro

`40-hora-ya-registrada.yaml` necesita una cuenta en los días 1 a 7 del programa que ya tenga en el servidor el registro
de la hora en curso (`registros_radar`, uno por hora). Prepárala en una base clonada local, nunca en producción.

Se corre con `.maestro/correr.sh .maestro/codigo-renaser/40-hora-ya-registrada.yaml`, pasando la cuenta en
`E2E_APRENDIZ_EMAIL` y `E2E_APRENDIZ_PASSWORD`.

`41-dictar-y-escuchar.yaml` (spec 030, Código Renaser con la voz) necesita una cuenta en los días 1 a 7 con la hora en curso **sin**
registrar, un APK con los cuatro MP3 de las preguntas y el backend con V132. Comprueba «Escuchar» (de «Escuchar» a «Detener» y la línea
del volumen), que abrir el micrófono detenga la lectura y que el formulario siga siendo el obligatorio y se pueda llenar escribiendo
aunque el micrófono falle. Está **escrito y no corrido**; la voz que se oye y el dictado se comprueban a mano en un teléfono.
