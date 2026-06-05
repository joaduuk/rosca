# backend/app/core/email.py
import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.hostinger.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "465"))
SMTP_USER = os.getenv("SMTP_USER", "")        # e.g. noreply@yourdomain.com
SMTP_PASS = os.getenv("SMTP_PASS", "")
EMAIL_FROM = os.getenv("EMAIL_FROM", SMTP_USER)
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
APP_NAME = os.getenv("APP_NAME", "ROSCA")


def _send_email(to_email: str, subject: str, html_body: str) -> bool:
    """Send an email via SMTP_SSL. Returns True on success, False on failure."""
    if not SMTP_USER or not SMTP_PASS:
        print(f"[EMAIL] SMTP not configured — skipping email to {to_email}: {subject}")
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{APP_NAME} <{EMAIL_FROM}>"
        msg["To"] = to_email
        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT) as server:
            server.ehlo()
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(EMAIL_FROM, to_email, msg.as_string())

        print(f"[EMAIL] Sent '{subject}' to {to_email}")
        return True
    except Exception as e:
        print(f"[EMAIL] Failed to send to {to_email}: {e}")
        return False


def send_welcome_email(to_email: str, full_name: str) -> bool:
    subject = f"Welcome to {APP_NAME}! 🎉"
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea, #764ba2); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 2rem;">🔄 {APP_NAME}</h1>
      </div>
      <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
        <h2 style="color: #1f2937;">Welcome, {full_name}! 👋</h2>
        <p style="color: #4b5563; line-height: 1.6;">
          Your account has been created successfully. You can now:
        </p>
        <ul style="color: #4b5563; line-height: 1.8;">
          <li>Create or join a ROSCA savings group</li>
          <li>Track contributions and payouts</li>
          <li>Manage your payout schedule</li>
        </ul>
        <div style="text-align: center; margin: 30px 0;">
          <a href="{FRONTEND_URL}/dashboard"
             style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 12px 30px;
                    border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">
            Go to Dashboard
          </a>
        </div>
        <p style="color: #9ca3af; font-size: 0.85rem; text-align: center; margin-top: 20px;">
          If you didn't create this account, please ignore this email.
        </p>
      </div>
    </div>
    """
    return _send_email(to_email, subject, html)


def send_password_reset_email(to_email: str, full_name: str, reset_token: str) -> bool:
    reset_link = f"{FRONTEND_URL}/reset-password?token={reset_token}"
    subject = f"{APP_NAME} — Password Reset Request"
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea, #764ba2); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 2rem;">🔄 {APP_NAME}</h1>
      </div>
      <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
        <h2 style="color: #1f2937;">Password Reset Request</h2>
        <p style="color: #4b5563; line-height: 1.6;">Hi {full_name},</p>
        <p style="color: #4b5563; line-height: 1.6;">
          We received a request to reset your password. Click the button below to set a new password.
          This link expires in <strong>1 hour</strong>.
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="{reset_link}"
             style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 12px 30px;
                    border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">
            Reset My Password
          </a>
        </div>
        <p style="color: #4b5563; font-size: 0.85rem;">
          Or copy and paste this link into your browser:<br/>
          <a href="{reset_link}" style="color: #667eea; word-break: break-all;">{reset_link}</a>
        </p>
        <p style="color: #9ca3af; font-size: 0.85rem; margin-top: 20px;">
          If you didn't request a password reset, you can safely ignore this email.
          Your password will not be changed.
        </p>
      </div>
    </div>
    """
    return _send_email(to_email, subject, html)