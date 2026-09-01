#!/usr/bin/env python3
"""
TECLEOLLAVE-ADAPT - Demo Runner
Runs complete demo: setup data, run experiment, show results.
"""

import sys
import os

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

import subprocess
import time
import signal
import atexit

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from demo_setup import run_demo_setup, create_impostor_demo


def run_backend():
    """Start backend server."""
    print("🚀 Iniciando backend...")
    backend_dir = os.path.join(os.path.dirname(__file__), 'backend')
    env = os.environ.copy()
    env['PYTHONPATH'] = backend_dir
    
    proc = subprocess.Popen(
        [sys.executable, '-m', 'app.main'],
        cwd=backend_dir,
        env=env
    )
    
    # Wait for server to start
    time.sleep(3)
    print("✅ Backend iniciado en http://localhost:8000")
    return proc


def run_frontend():
    """Build and preview frontend."""
    print("🎨 Construyendo frontend...")
    frontend_dir = os.path.join(os.path.dirname(__file__), 'frontend')
    
    result = subprocess.run(
        ['npm', 'run', 'build'],
        cwd=frontend_dir,
        capture_output=True,
        text=True,
        shell=(sys.platform == 'win32')
    )
    
    if result.returncode == 0:
        print("✅ Frontend construido")
    else:
        print(f"❌ Error construyendo frontend: {result.stderr}")
    
    return True


def run_demo_data():
    """Generate demo data."""
    print("\n📊 Generando datos de demostración...")
    from demo_setup import run_demo_setup
    
    success = run_demo_setup(
        username="demo_user",
        password="demo123456",
        n_enroll=10,
        n_auth_sessions=12,
        drift_profile="gradual"
    )
    
    if success:
        print("✅ Datos de demo generados")
    else:
        print("❌ Error generando datos de demo")


def run_experiment():
    """Run a quick experiment."""
    print("\n🧪 Ejecutando experimento comparativo...")
    
    # Import and run experiment
    from demo_setup import run_demo_setup
    from app.database import SessionLocal
    from app.services.experiment_service import run_experiment
    
    db = SessionLocal()
    
    try:
        result = run_experiment(
            db=db,
            user_id=1,  # demo_user
            n_sessions=10,
            samples_per_session=5,
            impostor_ratio=0.3,
            drift_profile='gradual'
        )
        print(f"✅ Experimento completado: {result.experiment_id}")
        print(f"   Resumen: {result.summary}")
    except Exception as e:
        print(f"⚠️  Error en experimento: {e}")
    finally:
        db.close()


def run_impostor_demo():
    """Run impostor detection demo."""
    print("\n🕵️ Ejecutando demo de detección de impostor...")
    from demo_setup import create_impostor_demo
    create_impostor_demo()


def start_servers():
    """Start both backend and frontend preview."""
    print("🚀 Iniciando servidores para demo en vivo...")
    
    backend_proc = run_backend()
    
    try:
        # Keep running
        print("\n" + "="*60)
        print("🌐 DEMO EN VIVO")
        print("="*60)
        print("Backend:  http://localhost:8000")
        print("Frontend: http://localhost:5173 (ejecuta 'npm run dev' en frontend/)")
        print("API Docs: http://localhost:8000/docs")
        print("\nPresiona Ctrl+C para detener")
        print("="*60)
        
        # Wait for interrupt
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n\n🛑 Deteniendo servidores...")
    finally:
        if 'backend_proc' in locals():
            backend_proc.terminate()


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="TECLEOLLAVE-ADAPT Demo Runner")
    parser.add_argument("command", choices=[
        "setup",      # Generate demo data
        "experiment", # Run experiment
        "impostor",   # Impostor detection demo
        "serve",      # Start servers for live demo
        "all"         # Run everything
    ], help="Command to run")
    parser.add_argument("--no-frontend", action="store_true", help="Skip frontend build")
    
    args = parser.parse_args()
    
    if args.command == "setup" or args.command == "all":
        run_demo_data()
    
    if args.command == "experiment" or args.command == "all":
        # Setup first if needed
        if args.command == "all":
            # Already done in setup
            pass
        run_experiment()
    
    if args.command == "impostor":
        run_impostor_demo()
    
    if args.command == "serve":
        if not args.no_frontend:
            run_frontend()
        start_servers()
    
    if args.command == "all":
        run_impostor_demo()
        print("\n" + "="*60)
        print("✅ DEMO COMPLETA LISTA")
        print("="*60)
        print("Para demo en vivo ejecuta: python run_demo.py serve")


if __name__ == "__main__":
    import time
    main()