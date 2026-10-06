#!/usr/bin/env python3
"""
Script de verificación de envío de correos con Gmail SMTP
TecleoLlave-Adapt - Biometría Conductual UNT
"""
import sys
import os
from pathlib import Path

# Cargar variables de entorno del backend
env_path = Path(__file__).resolve().parent / ".env"
if env_path.exists():
    from dotenv import load_dotenv
    load_dotenv(env_path)

from app.services.email_service import email_service

def test_smtp_configuration():
    print("=" * 60)
    print("📧 PRUEBA DE ENVÍO REAL GMAIL (SMTP)")
    print("=" * 60)
    
    user = os.getenv("SMTP_USER", "").strip()
    pwd = os.getenv("SMTP_PASSWORD", "").strip()
    
    print(f"Servidor SMTP : {os.getenv('SMTP_HOST', 'smtp.gmail.com')}:{os.getenv('SMTP_PORT', '587')}")
    print(f"Usuario Gmail : {user if user else '[NO CONFIGURADO]'}")
    print(f"Contraseña App: {'*' * len(pwd) if pwd else '[NO CONFIGURADO]'}")
    print("-" * 60)
    
    if not user or not pwd:
        print("\n❌ ATENCIÓN: SMTP_USER o SMTP_PASSWORD están vacíos en backend/.env")
        print("\nPasos para configurarlo:")
        print("1. Ve a tu cuenta de Google: https://myaccount.google.com/security")
        print("2. Activa 'Verificación en dos pasos' (2-Step Verification).")
        print("3. Entra a 'Contraseñas de aplicaciones': https://myaccount.google.com/apppasswords")
        print("4. Escribe un nombre (ej. 'TecleoLlave') y copia la clave de 16 caracteres (ej. 'abcd efgh ijkl mnop').")
        print("5. Edita backend/.env y coloca:")
        print("   SMTP_USER=tu_correo@gmail.com")
        print("   SMTP_PASSWORD=abcdefghijklmnop")
        print("=" * 60)
        return False
        
    destinatario = input(f"Ingresa correo destino para prueba [Enter para usar {user}]: ").strip()
    if not destinatario:
        destinatario = user
        
    test_otp = "982341"
    print(f"\n🚀 Enviando código de prueba '{test_otp}' a {destinatario}...")
    success = email_service.send_otp_email(destinatario, test_otp)
    
    if success:
        print("\n🎉 ¡ÉXITO TOTAL! El correo fue recibido por Gmail y enviado al destinatario.")
        print("Revisa la bandeja de entrada (y carpeta de spam si es la primera vez).")
    else:
        print("\n❌ Error en el envío. Verifica:")
        print(" - Que la contraseña sea la Contraseña de Aplicación de 16 caracteres (no tu clave habitual de Gmail).")
        print(" - Que no tenga espacios innecesarios.")
    print("=" * 60)
    return success

if __name__ == "__main__":
    test_smtp_configuration()
