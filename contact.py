# backend/app/routers/contact.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from app.core.email import _send_email

router = APIRouter(tags=["Contact"])


class ContactForm(BaseModel):
    name: str
    email: EmailStr
    subject: str
    message: str


@router.post("/contact")
def submit_contact(form: ContactForm):
    if len(form.message.strip()) < 10:
        raise HTTPException(status_code=400, detail="Message too short")

    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #1a6b4a; padding: 24px 30px; border-radius: 10px 10px 0 0;">
        <h2 style="color: white; margin: 0; font-size: 1.3rem;">📬 New Contact Form Submission</h2>
      </div>
      <div style="background: #f9fafb; padding: 24px 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; color: #6b7280; font-size: 0.85rem; width: 100px;"><strong>Name</strong></td><td style="padding: 8px 0; color: #111827;">{form.name}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280; font-size: 0.85rem;"><strong>Email</strong></td><td style="padding: 8px 0;"><a href="mailto:{form.email}" style="color: #1a6b4a;">{form.email}</a></td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280; font-size: 0.85rem;"><strong>Subject</strong></td><td style="padding: 8px 0; color: #111827;">{form.subject}</td></tr>
        </table>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
        <p style="color: #6b7280; font-size: 0.85rem; margin: 0 0 8px;"><strong>Message</strong></p>
        <div style="background: white; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; color: #111827; line-height: 1.7; white-space: pre-wrap;">{form.message}</div>
        <p style="color: #9ca3af; font-size: 0.78rem; margin-top: 16px;">
          Reply directly to this email to respond to {form.name}.
        </p>
      </div>
    </div>
    """

    success = _send_email(
        to_email="admin@roscaapp.com",
        subject=f"[RoscaApp Contact] {form.subject}",
        html_body=html,
    )

    if not success:
        raise HTTPException(status_code=500, detail="Failed to send message. Please try again later.")

    # Send confirmation to the user
    confirm_html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #1a6b4a; padding: 24px 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 1.5rem;">RoscaApp</h1>
      </div>
      <div style="background: #f9fafb; padding: 24px 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
        <h2 style="color: #1a6b4a;">Thanks for getting in touch, {form.name}!</h2>
        <p style="color: #4b5563; line-height: 1.7;">We've received your message and will get back to you as soon as possible, usually within 1–2 business days.</p>
        <div style="background: white; border-left: 4px solid #1a6b4a; padding: 12px 16px; margin: 16px 0; color: #4b5563; font-style: italic; line-height: 1.7;">"{form.message[:200]}{'...' if len(form.message) > 200 else ''}"</div>
        <p style="color: #9ca3af; font-size: 0.85rem;">If your query is urgent, you can reply directly to this email.</p>
      </div>
    </div>
    """
    _send_email(to_email=form.email, subject="We received your message — RoscaApp", html_body=confirm_html)

    return {"message": "Message sent successfully"}
