# backend/app/core/email.py
import smtplib
import os
from datetime import datetime
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
        msg["From"] = f"RoscaApp (no-reply) <{EMAIL_FROM}>"
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


def _wrap_email(inner_html: str) -> str:
    """
    Shared shell for every outgoing email: header with the real RoscaApp
    logo (matching the site's green/gold branding), the email-specific
    content in the middle, and a consistent do-not-reply/contact footer
    at the bottom. Keeping this in one place means every template stays
    visually consistent and the footer only needs to be updated once.
    """
    year = datetime.utcnow().year
    return f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #ffffff; padding: 24px 30px 18px; text-align: center; border: 1px solid #e5e7eb; border-bottom: 3px solid #1a6b4a; border-radius: 10px 10px 0 0;">
        <span style="font-size: 1.9rem; font-weight: 400; font-family: Georgia, 'DM Serif Display', serif; letter-spacing: 0.01em; color: #1a6b4a;">
          Rosca<span style="color: #f0a500;">App</span>
        </span>
      </div>
      <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
        {inner_html}
      </div>
      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-top: 1px solid #e5e7eb; border-radius: 0 0 10px 10px; padding: 18px 30px 22px; text-align: center;">
        <p style="margin: 0 0 6px; color: #9ca3af; font-size: 0.75rem; line-height: 1.6;">
          This is an automated message from RoscaApp — this inbox isn't monitored, so please don't reply.
        </p>
        <p style="margin: 0 0 6px; color: #9ca3af; font-size: 0.75rem; line-height: 1.6;">
          Need help? Visit our <a href="{FRONTEND_URL}/contact" style="color: #1a6b4a; text-decoration: underline;">Contact page</a>.
        </p>
        <p style="margin: 0; color: #b0b7c0; font-size: 0.72rem;">
          © {year} RoscaApp. All rights reserved.
        </p>
      </div>
    </div>
    """


def send_welcome_email(to_email: str, full_name: str) -> bool:
    subject = "Welcome to RoscaApp! 🎉"
    inner = f"""
        <h2 style="color: #1f2937; margin-top: 0;">Welcome, {full_name}! 👋</h2>
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
             style="background: linear-gradient(135deg, #1a6b4a, #124d35); color: white; padding: 12px 30px;
                    border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">
            Go to Dashboard
          </a>
        </div>
        <p style="color: #9ca3af; font-size: 0.85rem; text-align: center; margin-top: 20px;">
          If you didn't create this account, please ignore this email.
        </p>
    """
    return _send_email(to_email, subject, _wrap_email(inner))


def send_verification_email(to_email: str, full_name: str, token: str) -> bool:
    verify_link = f"{FRONTEND_URL}/verify-email?token={token}"
    subject = "Verify your RoscaApp account"
    inner = f"""
        <h2 style="color: #1f2937; margin-top: 0;">Hi {full_name}, one more step</h2>
        <p style="color: #4b5563; line-height: 1.6;">
          Please confirm this is your email address to activate your account.
          This link expires in <strong>30 minutes</strong>.
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="{verify_link}"
             style="background: linear-gradient(135deg, #1a6b4a, #124d35); color: white; padding: 12px 30px;
                    border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">
            Verify My Email
          </a>
        </div>
        <p style="color: #4b5563; font-size: 0.85rem;">
          Or copy and paste this link into your browser:<br/>
          <a href="{verify_link}" style="color: #1a6b4a; word-break: break-all;">{verify_link}</a>
        </p>
        <p style="color: #9ca3af; font-size: 0.85rem; margin-top: 20px;">
          If you didn't create this account, you can safely ignore this email.
        </p>
    """
    return _send_email(to_email, subject, _wrap_email(inner))


def send_password_reset_email(to_email: str, full_name: str, reset_token: str) -> bool:
    reset_link = f"{FRONTEND_URL}/reset-password?token={reset_token}"
    subject = "RoscaApp — Password Reset Request"
    inner = f"""
        <h2 style="color: #1f2937; margin-top: 0;">Password Reset Request</h2>
        <p style="color: #4b5563; line-height: 1.6;">Hi {full_name},</p>
        <p style="color: #4b5563; line-height: 1.6;">
          We received a request to reset your password. Click the button below to set a new password.
          This link expires in <strong>1 hour</strong>.
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="{reset_link}"
             style="background: linear-gradient(135deg, #1a6b4a, #124d35); color: white; padding: 12px 30px;
                    border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">
            Reset My Password
          </a>
        </div>
        <p style="color: #4b5563; font-size: 0.85rem;">
          Or copy and paste this link into your browser:<br/>
          <a href="{reset_link}" style="color: #1a6b4a; word-break: break-all;">{reset_link}</a>
        </p>
        <p style="color: #9ca3af; font-size: 0.85rem; margin-top: 20px;">
          If you didn't request a password reset, you can safely ignore this email.
          Your password will not be changed.
        </p>
    """
    return _send_email(to_email, subject, _wrap_email(inner))