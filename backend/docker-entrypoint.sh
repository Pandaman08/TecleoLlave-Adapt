#!/bin/sh
set -e

echo "[Docker Entrypoint] Ejecutando migracion de roles en SQLite..."
python migrate_add_role.py

echo "[Docker Entrypoint] Iniciando servidor TecleoLlave-Adapt..."
if [ "$#" -gt 0 ]; then
    exec "$@"
else
    exec uvicorn app.main:app --host 0.0.0.0 --port 8000
fi
