#!/usr/bin/env python3
"""E2E de la spec 006 con Maestro: un flujo por cuenta, usando `.maestro/correr.sh` (sesión por adb).

Cuentas y contraseña en ~/.config/renaser-e2e/semaforo-podio.json (fuera del repo). No imprime credenciales.
El fragmento que espera cada flujo de Hoy sale de GET /home del backend LOCAL.
Uso (desde la raíz del repo):  python3 -I .maestro/semaforo-podio/correr-006.py http://localhost:8092 [CASO,…]
"""
import http.cookiejar, json, os, subprocess, sys, urllib.request

BACKEND = sys.argv[1]
SOLO = set(sys.argv[2].split(',')) if len(sys.argv) > 2 else None
C = json.load(open(os.path.expanduser('~/.config/renaser-e2e/semaforo-podio.json')))
AQUI = os.path.dirname(os.path.abspath(__file__))
CON_PERMISO = {'ADMIN', 'ALQUIMISTA', 'LIDER_MENTORES', 'SOPORTE_TI'}
SIN_PERMISO = {'MENTOR', 'GUIA_APRENDIZ'}


def sesion(cuenta):
    op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))

    def pedir(ruta, token=None, datos=None):
        cabeceras = {'Content-Type': 'application/json', **({'X-Auth-Token': token} if token else {})}
        req = urllib.request.Request(BACKEND + ruta, data=json.dumps(datos).encode() if datos else None,
                                     headers=cabeceras, method='POST' if datos else 'GET')
        with op.open(req, timeout=20) as r:
            return r.headers, json.loads(r.read() or b'{}')

    h, _ = pedir('/api/v1/auth/login', datos={'email': cuenta['email'], 'contrasena': C['password']})
    return lambda ruta: pedir(ruta, h.get('X-Auth-Token'))[1]


def palabras(texto):
    sueltas = ''.join(ch if ch.isalnum() else ' ' for ch in texto).split()
    # Sin la primera palabra (puede llevar coma). Entre palabras va «.*» porque el texto puede tener puntos,
    # comas o un salto de línea entre ellas, y ningún otro signo de regex.
    return '.*'.join(sueltas[1:5])


def fragmento(cuenta):
    home = sesion(cuenta)('/api/v1/home')
    return palabras(((home.get('semaforo') or {}).get('mensaje') or {}).get('texto') or '')


def del_chat(cuenta):
    """Nombre del chat de soporte y un fragmento del mensaje personalizado de su última tarjeta diaria."""
    for c in sesion(cuenta)('/api/v1/chat/conversations'):
        if c['conversation'].get('type') == 'SUPPORT':
            texto = (c.get('lastMessage') or {}).get('text') or ''
            nombre = c['conversation'].get('nombre') or ''
            return ' '.join(nombre.split()[:1]), palabras(texto.split('\n\n', 1)[-1])
    return '', ''


def correr(flujo, cuenta, espera='', chat=''):
    env = {**os.environ, 'E2E_APRENDIZ_EMAIL': cuenta['email'], 'E2E_APRENDIZ_PASSWORD': C['password'],
           'E2E_ADMIN_EMAIL': cuenta['email'], 'E2E_ADMIN_PASSWORD': C['password'],
           'E2E_LIMPIAR_LIMITE_LOCAL': '1', 'MAESTRO_CASO': cuenta['caso'], 'MAESTRO_ESPERA': espera, 'MAESTRO_CHAT': chat,
           'MAESTRO_SALIDA': os.environ.get('MAESTRO_SALIDA', '/tmp/maestro-renaser-006')}
    r = subprocess.run(['.maestro/correr.sh', os.path.join(AQUI, flujo)], env=env, capture_output=True, text=True)
    salida = (r.stdout + r.stderr).replace(C['password'], '••••')
    ok = r.returncode == 0
    print(f"{'✔' if ok else '✘'} {cuenta['caso']:15s} {flujo}", flush=True)
    if not ok:
        print('   ' + '\n   '.join(salida.strip().splitlines()[-25:]), flush=True)
    return ok


resultados = []
for c in C['cuentas']:
    if SOLO and c['caso'] not in SOLO:
        continue
    if c['caso'] in CON_PERMISO:
        resultados.append(correr('31-ranking-descargar-podio.yaml', c))
    elif c['caso'] in SIN_PERMISO:
        resultados.append(correr('32-ranking-sin-descargar.yaml', c))
    else:
        resultados.append(correr('30-hoy-mensaje-del-semaforo.yaml', c, fragmento(c)))
        if c['caso'] == 'VERDE':
            resultados.append(correr('32-ranking-sin-descargar.yaml', c))
            nombre, espera = del_chat(c)
            if espera:  # la tarjeta diaria ya salió (ver la cabecera del flujo 33)
                resultados.append(correr('33-chat-tarjeta-diaria.yaml', c, espera, nombre))
print(f"\nResultado: {sum(resultados)} de {len(resultados)} flujos bien")
sys.exit(0 if all(resultados) else 1)
