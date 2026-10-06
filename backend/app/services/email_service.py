import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
import logging

from pathlib import Path
from dotenv import load_dotenv

ENV_PATH = Path(__file__).resolve().parent.parent.parent / ".env"

logger = logging.getLogger("tecleollave.email")

class EmailService:
    def _get_config(self):
        if ENV_PATH.exists():
            load_dotenv(ENV_PATH, override=True)
        smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
        smtp_port = int(os.getenv("SMTP_PORT", "587"))
        smtp_user = os.getenv("SMTP_USER", "").strip()
        # Eliminar cualquier espacio dentro de la contraseña de aplicación de Google
        smtp_password = os.getenv("SMTP_PASSWORD", "").strip().replace(" ", "")
        from_name = os.getenv("SMTP_FROM_NAME", "TecleoLlave UNT · Estudio Biométrico")
        return smtp_host, smtp_port, smtp_user, smtp_password, from_name

    def is_configured(self) -> bool:
        _, _, user, pwd, _ = self._get_config()
        return bool(user and pwd)

    def send_otp_email(self, to_email: str, otp_code: str) -> bool:
        """
        Envía un correo electrónico real con el código OTP mediante Gmail SMTP (TLS).
        """
        smtp_host, smtp_port, smtp_user, smtp_password, from_name = self._get_config()
        if not smtp_user or not smtp_password:
            logger.warning(
                f"[SMTP NO CONFIGURADO] No se han definido SMTP_USER o SMTP_PASSWORD en el archivo .env. "
                f"Código OTP para {to_email}: >>> {otp_code} <<<"
            )
            return False

        subject = f"Tu código de acceso TecleoLlave: {otp_code}"
        sender = f"{from_name} <{smtp_user}>"

        # Mensaje de texto plano alternativo
        text_content = (
            f"TECLEOLLAVE - ESTUDIO DE BIOMETRÍA CONDUCTUAL MÓVIL\n"
            f"Universidad Nacional de Trujillo\n\n"
            f"Tu código de verificación de 6 dígitos es: {otp_code}\n\n"
            f"Este código es válido durante los próximos 10 minutos.\n"
            f"Por favor ingrésalo en la aplicación móvil para continuar con tu participación en el estudio.\n\n"
            f"Si no solicitaste este código, puedes ignorar este mensaje."
        )

        # Plantilla HTML con diseño moderno y limpio
        html_content = f"""
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="utf-8">
          <style>
            body {{
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              background-color: #030712;
              color: #f3f4f6;
              margin: 0;
              padding: 24px;
            }}
            .card {{
              max-width: 480px;
              margin: 0 auto;
              background-color: #0b0f19;
              border: 1px solid #1f2937;
              border-radius: 16px;
              padding: 32px 24px;
              text-align: center;
              box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
            }}
            .logo-badge {{
              display: inline-block;
              background: rgba(99, 102, 241, 0.15);
              border: 1px solid rgba(99, 102, 241, 0.3);
              color: #818cf8;
              font-size: 24px;
              padding: 10px 16px;
              border-radius: 12px;
              margin-bottom: 16px;
            }}
            h1 {{
              color: #ffffff;
              font-size: 20px;
              font-weight: 700;
              margin: 0 0 8px 0;
            }}
            p {{
              color: #94a3b8;
              font-size: 14px;
              line-height: 1.5;
              margin: 0 0 24px 0;
            }}
            .code-box {{
              background: linear-gradient(135deg, #111827 0%, #1e1b4b 100%);
              border: 2px dashed #6366f1;
              border-radius: 12px;
              padding: 18px;
              margin: 20px 0;
            }}
            .otp-code {{
              font-family: 'Courier New', Courier, monospace;
              font-size: 34px;
              font-weight: 800;
              letter-spacing: 8px;
              color: #38bdf8;
              margin: 0;
            }}
            .expiry {{
              font-size: 12px;
              color: #fbbf24;
              margin-top: 8px;
              font-weight: 600;
            }}
            .footer {{
              border-top: 1px solid #1f2937;
              padding-top: 16px;
              margin-top: 24px;
              font-size: 11px;
              color: #64748b;
            }}
          </style>
        </head>
        <body>
          <div class="card">
            <div class="logo-badge">🛡️ TecleoLlave</div>
            <h1>Verificación de Seguridad</h1>
            <p>
              Estás participando en la investigación sobre <strong>Biometría Conductual y App Locker para Dispositivos Móviles</strong> de la Universidad Nacional de Trujillo.
            </p>

            <div class="code-box">
              <div class="otp-code">{otp_code}</div>
              <div class="expiry">⏱️ Válido por 10 minutos</div>
            </div>

            <p style="font-size: 13px;">
              Ingresa este código en la aplicación móvil de tu teléfono para comenzar las pruebas de tecleo.
            </p>

            <div class="footer">
              Universidad Nacional de Trujillo · Seguridad de la Información<br>
              Este es un correo automático generado para el estudio de investigación.
            </div>
          </div>
        </body>
        </html>
        """

        message = MIMEMultipart("alternative")
        message["Subject"] = subject
        message["From"] = sender
        message["To"] = to_email

        part1 = MIMEText(text_content, "plain", "utf-8")
        part2 = MIMEText(html_content, "html", "utf-8")
        message.attach(part1)
        message.attach(part2)

        try:
            context = ssl.create_default_context()
            with smtplib.SMTP(smtp_host, smtp_port, timeout=15) as server:
                server.ehlo()
                server.starttls(context=context)
                server.ehlo()
                server.login(smtp_user, smtp_password)
                server.sendmail(smtp_user, to_email, message.as_string())
            logger.info(f"[GMAIL SMTP ENVIADO] Código OTP enviado exitosamente a {to_email}")
            print(f"\n[GMAIL SMTP SUCCESS] Correo real enviado a: {to_email} con código: {otp_code}\n")
            return True
        except Exception as e:
            logger.error(f"[GMAIL SMTP ERROR] No se pudo enviar el correo a {to_email}: {str(e)}")
            print(f"\n[GMAIL SMTP ERROR] Falló el envío a {to_email}: {e}\n")
            return False

email_service = EmailService()
