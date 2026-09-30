#!/usr/bin/env node
/**
 * Arregla el parlante de `@speechmatics/expo-two-way-audio` (0.1.2) para la voz en vivo (E-458).
 *
 * EL SÍNTOMA (2026-09-30, el dueño con el APK 1.5.0 build 87): «la respuesta se entrecorta».
 *
 * LO QUE TIENE EL PAQUETE (AudioEngine.kt):
 *   1. La cola del parlante es un `LinkedList` que escriben dos hilos a la vez: el de JavaScript
 *      (`playPCMData`) y el que reproduce (`poll`). `LinkedList` no es segura entre hilos: un pedazo
 *      puede perderse o quedar trabado en la cola hasta que llegue el siguiente.
 *   2. `isPlaying` no es `@Volatile` y se revisa sin candado: si JavaScript encola justo cuando el
 *      hilo que reproduce está saliendo del bucle, nadie arranca a reproducir ese pedazo.
 *   3. El `AudioTrack` usa el búfer mínimo (unas decenas de milisegundos): cualquier demora del hilo
 *      que reproduce se oye como un corte.
 *   4. No hay forma de vaciar lo encolado: callar al orbe (o que la persona lo interrumpa) dejaba
 *      sonar el resto de la respuesta.
 *
 * EL ARREGLO. Cola `LinkedBlockingQueue`, arranque bajo candado, búfer de al menos 200 ms y una
 * función nueva `clearPlayback()` (vacía la cola y el búfer del `AudioTrack`). Idempotente (deja una
 * marca). Si el paquete cambia y los fragmentos no se encuentran, FALLA: un parche que no se aplica
 * en silencio dejaría el APK con el parlante viejo sin que nadie lo note.
 *
 * Es código nativo: hace falta un APK nuevo para que llegue al teléfono.
 */
const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..', 'node_modules', '@speechmatics', 'expo-two-way-audio', 'android', 'src', 'main', 'java', 'expo', 'modules', 'twowayaudio');
const MARCA = '// [renaser] parlante seguro entre hilos y clearPlayback (scripts/arreglar-parlante-two-way-audio.js)';

const MOTOR = [
  ['import java.util.concurrent.Executors\n', 'import java.util.concurrent.Executors\nimport java.util.concurrent.LinkedBlockingQueue\n'],
  [
    'private val audioSampleQueue: Queue<ByteArray> = LinkedList()',
    'private val audioSampleQueue: Queue<ByteArray> = LinkedBlockingQueue()\n    private val playbackLock = Any()',
  ],
  ['    var isPlaying = false\n', '    @Volatile var isPlaying = false\n'],
  [
    '            AUDIO_FORMAT\n        )\n\n        audioTrack = AudioTrack(',
    '            AUDIO_FORMAT\n        ).coerceAtLeast(SAMPLE_RATE * 2 / 5) // al menos 200 ms de audio\n\n        audioTrack = AudioTrack(',
  ],
  [
    `    fun playPCMData(data: ByteArray) {
        audioSampleQueue.add(data)
        if (!isPlaying) {
            playAudioFromSampleQueue()
        }
    }

    private fun playAudioFromSampleQueue() {
        executorServicePlayback.execute{
            isPlaying = true
            try {
                while (audioSampleQueue.isNotEmpty()){
                    val data = audioSampleQueue.poll()
                    if (data != null){
                        playSample(data)
                        val audioVolume = calculateRMSLevel(data)
                        onOutputVolumeCallback?.invoke(audioVolume)
                    }else{
                        break
                    }
                }
            }catch (e: Exception){
                Log.e("AudioEngine", "Error playing audio", e)
                e.printStackTrace()
            }finally {
                isPlaying = false
                onOutputVolumeCallback?.invoke(0.0F)
            }
        }
    }`,
    `    fun playPCMData(data: ByteArray) {
        audioSampleQueue.add(data)
        synchronized(playbackLock) {
            if (!isPlaying) {
                isPlaying = true
                playAudioFromSampleQueue()
            }
        }
    }

    private fun playAudioFromSampleQueue() {
        executorServicePlayback.execute{
            try {
                while (true) {
                    val data = audioSampleQueue.poll()
                    if (data == null) {
                        // Se deja de reproducir solo si, bajo el candado, la cola sigue vacía: así un
                        // pedazo que llega justo ahora no queda trabado.
                        val vacia = synchronized(playbackLock) {
                            val sigueVacia = audioSampleQueue.isEmpty()
                            if (sigueVacia) isPlaying = false
                            sigueVacia
                        }
                        if (vacia) break
                        continue
                    }
                    playSample(data)
                    val audioVolume = calculateRMSLevel(data)
                    onOutputVolumeCallback?.invoke(audioVolume)
                }
            }catch (e: Exception){
                Log.e("AudioEngine", "Error playing audio", e)
                synchronized(playbackLock) { isPlaying = false }
            }finally {
                onOutputVolumeCallback?.invoke(0.0F)
            }
        }
    }

    /** Vacía lo encolado y lo que queda en el búfer: el orbe se calla ya. */
    fun clearPlayback() {
        audioSampleQueue.clear()
        try {
            audioTrack.pause()
            audioTrack.flush()
            audioTrack.play()
        } catch (e: Exception) {
            Log.e("AudioEngine", "Error clearing playback", e)
        }
    }`,
  ],
];

const MODULO = [
  [
    `         Function("playPCMData") { data: kotlin.ByteArray ->
             audioEngine?.playPCMData(data)
         }`,
    `         Function("playPCMData") { data: kotlin.ByteArray ->
             audioEngine?.playPCMData(data)
         }

         Function("clearPlayback") {
             audioEngine?.clearPlayback()
         }`,
  ],
];

function parchar(nombre, cambios) {
  const archivo = path.join(raiz, nombre);
  let texto = fs.readFileSync(archivo, 'utf8');
  if (texto.includes(MARCA)) return false;
  for (const [antes, despues] of cambios) {
    if (!texto.includes(antes)) {
      throw new Error(`[renaser] ${nombre}: no se encontró el fragmento a parchar (¿cambió el paquete?):\n${antes.slice(0, 120)}`);
    }
    texto = texto.replace(antes, despues);
  }
  fs.writeFileSync(archivo, `${MARCA}\n${texto}`);
  return true;
}

if (!fs.existsSync(raiz)) process.exit(0);
const cambiados = [parchar('AudioEngine.kt', MOTOR), parchar('ExpoTwoWayAudioModule.kt', MODULO)];
if (cambiados.some(Boolean)) {
  console.log('[renaser] expo-two-way-audio: parlante seguro entre hilos, búfer de 200 ms y clearPlayback');
}
