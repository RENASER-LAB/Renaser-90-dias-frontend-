"""Crea cinco cuentas base (y, con `--con-casos-dia-uno`, 35 de recuperación del Día 1) solo en el Postgres aislado de Testcontainers.

La contraseña aleatoria y los identificadores quedan en un archivo privado fuera del repo.
El onboarding inicial está completado en el fixture: el recorrido que se mide empieza en Hoy.
El aprendiz tiene la participación pendiente de elegir Día 1, como al aprobar su cuenta;
los cuatro roles del personal todavía no tienen participación.
"""

import argparse
import json
import os
from pathlib import Path
import secrets
import subprocess
import uuid


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--container", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--con-casos-dia-uno", action="store_true",
                        help="Añade cuentas antiguas y casos de recuperación del Día 1.")
    parser.add_argument("--redis-container",
                        help="Limpia solo contadores de login del Redis del mismo entorno Testcontainers.")
    args = parser.parse_args()
    out = Path(args.out).expanduser().resolve()
    repo = Path(__file__).resolve().parents[2]
    if out.is_relative_to(repo):
        raise SystemExit("El fixture con la contraseña debe quedar fuera del repositorio.")

    metadata = json.loads(subprocess.check_output(["docker", "inspect", args.container]))[0]
    config = metadata["Config"]
    env = dict(entry.split("=", 1) for entry in config["Env"] if "=" in entry)
    if (
        config.get("Labels", {}).get("org.testcontainers") != "true"
        or not config["Image"].startswith("pgvector/pgvector:")
        or env.get("POSTGRES_DB") != "test"
        or env.get("POSTGRES_USER") != "test"
    ):
        raise SystemExit("Solo se permite el Postgres 'test' creado por Testcontainers.")

    if args.redis_container:
        redis = json.loads(subprocess.check_output(["docker", "inspect", args.redis_container]))[0]["Config"]
        labels = redis.get("Labels", {})
        sesion = config.get("Labels", {}).get("org.testcontainers.sessionId")
        if (labels.get("org.testcontainers") != "true" or not redis["Image"].startswith("redis:")
                or not sesion or labels.get("org.testcontainers.sessionId") != sesion):
            raise SystemExit("Redis debe pertenecer a la misma sesión Testcontainers que el Postgres de prueba.")
        limpiar = """
            local cursor = '0'
            local claves = {}
            repeat
                local pagina = redis.call('SCAN', cursor, 'MATCH', 'reset-password:rl:login:*', 'COUNT', 100)
                cursor = pagina[1]
                for _, clave in ipairs(pagina[2]) do table.insert(claves, clave) end
            until cursor == '0'
            local borradas = 0
            for _, clave in ipairs(claves) do borradas = borradas + redis.call('DEL', clave) end
            return borradas
        """
        cantidad = subprocess.check_output(
            ["docker", "exec", args.redis_container, "redis-cli", "EVAL", limpiar, "0"], text=True).strip()
        print(f"{cantidad} contadores de login de la batería anterior retirados del Redis aislado.")

    password = secrets.token_urlsafe(24)
    actors = []
    sql = ["BEGIN;", "CREATE EXTENSION IF NOT EXISTS pgcrypto;"]
    roles = [
        ("MENTOR", "MENTOR"), ("ADMIN", "ADMIN"), ("ALCHEMIST", "ALQUIMISTA"),
        ("MENTOR_LEAD", "LIDER_MENTORES"), ("TRAINEE", "APRENDIZ"),
    ]

    def cuenta(role, db_role, caso=None):
        actor_id = str(uuid.uuid4())
        email = f"base-{actor_id}@renaser.test"
        actor = {"id": actor_id, "email": email, "role": role}
        if caso:
            actor["case"] = caso
        sql.append(f"""
            INSERT INTO renaser.usuarios (id, email, nombre_completo, rol, estado, hash_contrasena)
            VALUES ('{actor_id}', '{email}', 'Base E2E {role}', '{db_role}', 'ACTIVO',
                    '{{bcrypt}}' || crypt('{password}', gen_salt('bf', 10)));
            INSERT INTO renaser.estado_onboarding (usuario_id, completado, completado_en)
            VALUES ('{actor_id}', true, now());
        """)
        return actor

    for role, db_role in roles:
        actor = cuenta(role, db_role)
        actors.append(actor)
        actor_id = actor["id"]
        if role == "TRAINEE":
            sql.append(f"""
                INSERT INTO renaser.participantes_programa (usuario_id, fecha_inicio, timezone)
                VALUES ('{actor_id}', (now() AT TIME ZONE 'America/Lima')::date + 1, 'America/Lima');
            """)

    day_one_actors = []
    if args.con_casos_dia_uno:
        def participacion(actor, estado):
            if estado == "SIN_FILA":
                return
            actor_id = actor["id"]
            # La fecha provisional de una cuenta antigua NO implica que haya elegido su Día 1.
            desplazamiento, dia, fase = {
                "PENDIENTE": (-60, 0, "FASE_1_RENACER"),
                "FUTURO": (2, 0, "FASE_1_RENACER"),
                "EN_CURSO": (-9, 10, "FASE_2_DESARROLLO"),
                "GRADUADO": (-89, 90, "FASE_4_ASCENSION"),
            }[estado]
            dias_desde_activacion = max(0, 1 - desplazamiento) if desplazamiento < 0 else 0
            activado = "NULL" if estado == "PENDIENTE" else f"now() - interval '{dias_desde_activacion} days'"
            graduado = "true" if estado == "GRADUADO" else "false"
            fin = "now()" if estado == "GRADUADO" else "NULL"
            sql.append(f"""
                INSERT INTO renaser.participantes_programa
                    (usuario_id, fecha_inicio, timezone, dia_programa, fase,
                     programa_activado_en, programa_completado, programa_completado_en)
                VALUES ('{actor_id}', (now() AT TIME ZONE 'America/Lima')::date + {desplazamiento},
                    'America/Lima', {dia}, '{fase}', {activado}, {graduado}, {fin});
            """)

        for role, db_role in roles:
            for estado in ["PENDIENTE", "FUTURO", "EN_CURSO", "GRADUADO", "SIN_FILA"]:
                actor = cuenta(role, db_role, estado)
                participacion(actor, estado)
                day_one_actors.append(actor)
        for caso in ["ERROR_ESTADO", "ERROR_FECHAS", "ERROR_CAPACIDADES", "POST_SIN_RED",
                     "VENTANA", "OTRO_DISPOSITIVO", "TERMINOS_SIN_DIA", "CUENTA_A", "CUENTA_B",
                     "LENTO"]:
            role, db_role = ("TRAINEE", "APRENDIZ") if caso == "TERMINOS_SIN_DIA" else ("ADMIN", "ADMIN")
            actor = cuenta(role, db_role, caso)
            participacion(actor, "SIN_FILA" if caso in ["ERROR_CAPACIDADES", "CUENTA_A", "CUENTA_B"] else "PENDIENTE")
            day_one_actors.append(actor)
            if caso == "TERMINOS_SIN_DIA":
                sql.append(f"""
                    UPDATE renaser.estado_onboarding SET completado = false, completado_en = NULL,
                        terminos_aceptados_en = now() - interval '60 days'
                    WHERE usuario_id = '{actor['id']}';
                """)
    sql.append("COMMIT;")
    subprocess.run(
        ["docker", "exec", "-i", args.container, "psql", "-U", "test", "-d", "test", "-v", "ON_ERROR_STOP=1"],
        input="\n".join(sql), text=True, check=True, stdout=subprocess.DEVNULL,
    )
    out.parent.mkdir(parents=True, exist_ok=True)
    fd = os.open(out, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w") as stream:
        json.dump({"password": password, "actors": actors, "dayOneActors": day_one_actors}, stream, indent=2)
    os.chmod(out, 0o600)
    print(f"{len(actors) + len(day_one_actors)} cuentas nuevas preparadas. Fixture privado:", out)


if __name__ == "__main__":
    main()
