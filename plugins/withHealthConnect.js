/**
 * Config plugin de Health Connect para Renaser (spec 037, D-310). Reemplaza al `app.plugin.js` de `react-native-health-connect`
 * (que NO se pone en `plugins`) por una razón: la librería apunta la pantalla de «política de privacidad» del permiso a
 * `MainActivity`, o sea que tocarla solo abría la app. Google exige que ese enlace muestre la MISMA política que la ficha de Play,
 * así que aquí se declara una actividad propia, mínima, que abre `/privacidad/` en el navegador.
 *
 * Qué hace, y nada más:
 * 1. escribe `PoliticaDePrivacidadDeSaludActivity.kt` en el paquete de la app (Android);
 * 2. la declara en el manifiesto con el filtro `androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE` (hasta Android 13);
 * 3. declara el alias `ViewPermissionUsageActivity` (Android 14, con el permiso `START_VIEW_PERMISSION_USAGE`) apuntando a ella.
 *
 * Los permisos `READ_STEPS` y `READ_DISTANCE` van en `android.permissions` de `app.json`, y el `minSdkVersion` 26 que exige la
 * librería, en `expo-build-properties`. La librería trae su propia parte de Expo (`android-expo`), que enchufa el pedido de permisos
 * a la actividad principal; eso no depende de este plugin.
 *
 * Las funciones puras (`aplicarAlManifiesto`, `codigoDeLaActividad`) están exportadas para probarlas sin generar el proyecto
 * (`src/__tests__/pluginHealthConnect.test.ts`).
 */
const fs = require('fs');
const path = require('path');
const { AndroidConfig, createRunOncePlugin, withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');

const NOMBRE_DE_LA_ACTIVIDAD = 'PoliticaDePrivacidadDeSaludActivity';
const ACCION_DE_LA_POLITICA = 'androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE';
const NOMBRE_DEL_ALIAS = 'ViewPermissionUsageActivity';
/** La misma página de privacidad de la ficha de Play y del enlace de Ajustes (`enlacesLegales.ts`). */
const URL_DE_LA_POLITICA = 'https://renaser-90-dias-frontend-livid.vercel.app/privacidad/';

const llevaLaAccion = filtro => (filtro.action || []).some(a => a.$['android:name'] === ACCION_DE_LA_POLITICA);

/** Aplica al `AndroidManifest.xml` (ya parseado) la actividad de la política y su alias. Idempotente. */
function aplicarAlManifiesto(manifiesto) {
  const aplicacion = AndroidConfig.Manifest.getMainApplicationOrThrow(manifiesto);
  const principal = AndroidConfig.Manifest.getMainActivityOrThrow(manifiesto);
  const nombre = `.${NOMBRE_DE_LA_ACTIVIDAD}`;

  // Si otro plugin (el de la librería) dejó el filtro en la actividad principal, se quita: tocar el enlace no debe abrir la app.
  principal['intent-filter'] = (principal['intent-filter'] || []).filter(f => !llevaLaAccion(f));

  aplicacion.activity = (aplicacion.activity || []).filter(a => a.$['android:name'] !== nombre);
  aplicacion.activity.push({
    $: {
      'android:name': nombre,
      'android:exported': 'true',
      'android:excludeFromRecents': 'true',
      'android:theme': '@android:style/Theme.NoDisplay',
    },
    'intent-filter': [{ action: [{ $: { 'android:name': ACCION_DE_LA_POLITICA } }] }],
  });

  aplicacion['activity-alias'] = (aplicacion['activity-alias'] || []).filter(a => a.$['android:name'] !== NOMBRE_DEL_ALIAS);
  aplicacion['activity-alias'].push({
    $: {
      'android:name': NOMBRE_DEL_ALIAS,
      'android:exported': 'true',
      'android:targetActivity': nombre,
      'android:permission': 'android.permission.START_VIEW_PERMISSION_USAGE',
    },
    'intent-filter': [
      {
        action: [{ $: { 'android:name': 'android.intent.action.VIEW_PERMISSION_USAGE' } }],
        category: [{ $: { 'android:name': 'android.intent.category.HEALTH_PERMISSIONS' } }],
      },
    ],
  });
  return manifiesto;
}

/** La actividad: abre la política en el navegador y se cierra. Sin pantalla propia (`Theme.NoDisplay` exige terminar en `onCreate`). */
function codigoDeLaActividad(paquete, url = URL_DE_LA_POLITICA) {
  return `package ${paquete}

import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import android.os.Bundle

/**
 * Health Connect la abre desde su pantalla de permisos («Política de privacidad de Renaser»). Muestra la misma política que la
 * ficha de Play. Generada por plugins/withHealthConnect.js: no se edita a mano.
 */
class ${NOMBRE_DE_LA_ACTIVIDAD} : Activity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    try {
      startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("${url}")).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    } catch (e: ActivityNotFoundException) {
      // Sin navegador no hay nada que mostrar.
    }
    finish()
  }
}
`;
}

const conActividad = config =>
  withDangerousMod(config, [
    'android',
    async cfg => {
      const paquete = cfg.android && cfg.android.package;
      if (!paquete) throw new Error('withHealthConnect: falta android.package en app.json');
      const carpeta = path.join(cfg.modRequest.platformProjectRoot, 'app', 'src', 'main', 'java', ...paquete.split('.'));
      fs.mkdirSync(carpeta, { recursive: true });
      fs.writeFileSync(path.join(carpeta, `${NOMBRE_DE_LA_ACTIVIDAD}.kt`), codigoDeLaActividad(paquete));
      return cfg;
    },
  ]);

const conManifiesto = config =>
  withAndroidManifest(config, cfg => {
    cfg.modResults = aplicarAlManifiesto(cfg.modResults);
    return cfg;
  });

const withHealthConnect = config => conManifiesto(conActividad(config));

module.exports = createRunOncePlugin(withHealthConnect, 'renaser-health-connect', '1.0.0');
module.exports.aplicarAlManifiesto = aplicarAlManifiesto;
module.exports.codigoDeLaActividad = codigoDeLaActividad;
module.exports.URL_DE_LA_POLITICA = URL_DE_LA_POLITICA;
module.exports.NOMBRE_DE_LA_ACTIVIDAD = NOMBRE_DE_LA_ACTIVIDAD;
