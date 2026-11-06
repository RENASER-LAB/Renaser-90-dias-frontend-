# Corrección del selector de horarios de Training

Se detectaron dos causas en frontend: el selector web dependía de eventos nativos de fin de desplazamiento y cambiar el alcance a un primer día reemplazaba la hora elegida por la guardada anteriormente.

La versión web usa selectores de hora y minuto que notifican cada elección al formulario. Agregar o quitar días y volver a todos conserva la hora editada. Android e iOS conservan sus ruedas nativas.

El backend admite horas nocturnas para cualquier hábito mediante PATCH de preferencias y PUT de horarios semanales. Se mantienen las reglas existentes: hora inicial máxima 23:40, ajuste del cierre a 23:50, vigencia futura y aislamiento por participante. No se modificó el backend ni se escribieron datos de producción.

Validación: TypeScript sin errores; selector real renderizado en navegador con selección de 05:00 a 23:00 y 23:40, mostrando el mismo valor en el estado del formulario. La exportación web se ejecutó como comprobación de empaquetado. No se probó una escritura con cuenta real en producción.
