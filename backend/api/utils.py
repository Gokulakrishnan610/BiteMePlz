from django.core.mail import send_mail
import json
import uuid
from django.conf import settings
from django.utils.html import strip_tags
from decimal import Decimal


class UUIDEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, uuid.UUID):
            return str(obj)
        if isinstance(obj, Decimal):
            return str(obj)
        return json.JSONEncoder.default(self, obj)

def convert_uuids_to_str_recursive(data):
    if isinstance(data, dict):
        return {k: convert_uuids_to_str_recursive(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [convert_uuids_to_str_recursive(elem) for elem in data]
    elif isinstance(data, uuid.UUID):
        return str(data)
    elif isinstance(data, Decimal):
        return str(data)
    return data

def send_otp_email(email, otp, user_name):
    """Send OTP email using the same visual template, with Campus Kiosk content."""
    subject = 'Campus Kiosk - Email Verification'

    html_message = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset=\"UTF-8\">
  <title>Campus Kiosk - Email Verification</title>
  <link href=\"https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap\" rel=\"stylesheet\">
  <style>
    body {{
      background: #f8fafc;
      font-family: 'Inter', Arial, sans-serif;
      color: #22223b;
      margin: 0;
      padding: 0;
    }}
    .email-card {{
      background: #fff;
      max-width: 420px;
      margin: 40px auto;
      border-radius: 16px;
      box-shadow: 0 4px 24px rgba(139, 92, 246, 0.08), 0 1.5px 4px rgba(0,0,0,0.04);
      padding: 32px 24px 24px 24px;
      border: 1px solid #ececec;
    }}
    .logo {{
      display: block;
      margin: 0 auto 24px auto;
      width: 150px;
      height: auto;
    }}
    h2 {{
      font-size: 1.4rem;
      font-weight: 600;
      margin: 0 0 12px 0;
      color: #4f46e5;
      text-align: center;
    }}
    .otp {{
      font-size: 2.2em;
      font-weight: bold;
      color: #8b5cf6;
      letter-spacing: 0.15em;
      background: #f3f4f6;
      border-radius: 8px;
      padding: 12px 0;
      text-align: center;
      margin: 24px 0 16px 0;
      box-shadow: 0 1px 4px rgba(139, 92, 246, 0.06);
    }}
    .footer {{
      margin-top: 24px;
      font-size: 0.95rem;
      color: #6b7280;
      text-align: center;
    }}
    @media (max-width: 600px) {{
      .email-card {{
        padding: 16px 4vw 16px 4vw;
      }}
    }}
  </style>
  </head>
  <body>
    <div class=\"email-card\">
      <img src=\"https://students.rajalakshmi.org/images/rec_logo.png\" alt=\"REC Logo\" class=\"logo\"/>
      <h2>Verify your Campus Kiosk account</h2>
      <p style=\"text-align:center; margin-bottom: 8px;\">Hi {user_name},</p>
      <p style=\"text-align:center; margin: 12px 0 0 0;\">
        Use the OTP below to verify your Campus Kiosk account:
      </p>
      <div class=\"otp\">{otp}</div>
      <p style=\"text-align:center; margin: 12px 0 0 0; color:#6b7280;\">
        This code is valid for 10 minutes. Do not share it with anyone.
      </p>
      <div class=\"footer\"></div>
    </div>
  </body>
  </html>
    """

    plain_message = (
        "Campus Kiosk - Email Verification\n\n"
        f"Hi {user_name},\n\n"
        f"Your verification code is: {otp}\n\n"
        "This code is valid for 10 minutes. Do not share it with anyone.\n"
    )
    
    try:
        print(f"📧 Sending OTP email from {settings.DEFAULT_FROM_EMAIL} to {email}")
        print(f"📧 Subject: {subject}")
        print(f"📧 OTP: {otp}")
        
        # Try Brevo API first (works on Render free tier)
        try:
            import requests
            brevo_api_key = 'xkeysib-c8b3b001e9f8a4d7c2b5e6f3a1d8c9b2e5f7a3d6c1b4e8f2a5d9c3b7e1f4a8d2'
            
            response = requests.post(
                'https://api.brevo.com/v3/smtp/email',
                headers={
                    'api-key': brevo_api_key,
                    'Content-Type': 'application/json'
                },
                json={
                    'sender': {'email': settings.DEFAULT_FROM_EMAIL, 'name': 'Campus Kiosk'},
                    'to': [{'email': email}],
                    'subject': subject,
                    'htmlContent': html_message
                },
                timeout=10
            )
            
            if response.status_code == 201:
                print(f"✅ Email sent via Brevo API to {email}")
                return True
            else:
                print(f"⚠️  Brevo API returned {response.status_code}: {response.text}")
                raise Exception(f"Brevo API failed: {response.status_code}")
                
        except Exception as api_error:
            print(f"⚠️  Brevo API failed: {api_error}, falling back to SMTP...")
            
            # Fallback to SMTP (for local development)
            result = send_mail(
                subject=subject,
                message=strip_tags(plain_message),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email],
                html_message=html_message,
                fail_silently=False,
            )
            print(f"📧 send_mail() returned: {result} (1 = success)")
            print(f"✅ Email sent via SMTP to {email}")
            return True
            
    except Exception as e:
        print(f"❌ Error sending email: {e}")
        import traceback
        traceback.print_exc()
        return False

def send_resend_otp_email(email, otp, user_name):
    """Send resend OTP email using the same visual template, with Campus Kiosk content."""
    subject = 'Campus Kiosk - New Verification Code'

    html_message = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset=\"UTF-8\">
  <title>Campus Kiosk - New Verification Code</title>
  <link href=\"https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap\" rel=\"stylesheet\">
  <style>
    body {{
      background: #f8fafc;
      font-family: 'Inter', Arial, sans-serif;
      color: #22223b;
      margin: 0;
      padding: 0;
    }}
    .email-card {{
      background: #fff;
      max-width: 420px;
      margin: 40px auto;
      border-radius: 16px;
      box-shadow: 0 4px 24px rgba(139, 92, 246, 0.08), 0 1.5px 4px rgba(0,0,0,0.04);
      padding: 32px 24px 24px 24px;
      border: 1px solid #ececec;
    }}
    .logo {{
      display: block;
      margin: 0 auto 24px auto;
      width: 150px;
      height: auto;
    }}
    h2 {{
      font-size: 1.4rem;
      font-weight: 600;
      margin: 0 0 12px 0;
      color: #4f46e5;
      text-align: center;
    }}
    .otp {{
      font-size: 2.2em;
      font-weight: bold;
      color: #8b5cf6;
      letter-spacing: 0.15em;
      background: #f3f4f6;
      border-radius: 8px;
      padding: 12px 0;
      text-align: center;
      margin: 24px 0 16px 0;
      box-shadow: 0 1px 4px rgba(139, 92, 246, 0.06);
    }}
    .footer {{
      margin-top: 24px;
      font-size: 0.95rem;
      color: #6b7280;
      text-align: center;
    }}
    @media (max-width: 600px) {{
      .email-card {{
        padding: 16px 4vw 16px 4vw;
      }}
    }}
  </style>
  </head>
  <body>
    <div class=\"email-card\">
      <img src=\"https://students.rajalakshmi.org/images/rec_logo.png\" alt=\"REC Logo\" class=\"logo\"/>
      <h2>Campus Kiosk – One-Time Passcode (OTP)</h2>
      <p style=\"text-align:center; margin-bottom: 8px;\">Hi {user_name},</p>
      <p style=\"text-align:center; margin: 12px 0 0 0;\">
        You requested a new verification code. Use the OTP below to verify your Campus Kiosk account:
      </p>
      <div class=\"otp\">{otp}</div>
      <p style=\"text-align:center; margin: 12px 0 0 0; color:#6b7280;\">
        This code is valid for 10 minutes. Do not share it with anyone.
      </p>
      <div class=\"footer\"></div>
    </div>
  </body>
  </html>
    """

    plain_message = (
        "Campus Kiosk - New Verification Code\n\n"
        f"Hi {user_name},\n\n"
        f"Your new verification code is: {otp}\n\n"
        "This code is valid for 10 minutes. Do not share it with anyone.\n"
    )
    
    try:
        send_mail(
            subject=subject,
            message=strip_tags(plain_message),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            html_message=html_message,
            fail_silently=False,
        )
        return True
    except Exception as e:
        print(f"Error sending email: {e}")
        return False


def send_transport_otp_email(email: str, otp: str, student_name: str) -> bool:
    """Send Transport/Bus Boarding Point OTP using the provided HTML template."""
    subject = 'Bus Boarding Point OTP'

    html_message = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset=\"UTF-8\">
  <title>Transport OTP</title>
  <link href=\"https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap\" rel=\"stylesheet\">
  <style>
    body {{
      background: #f8fafc;
      font-family: 'Inter', Arial, sans-serif;
      color: #22223b;
      margin: 0;
      padding: 0;
    }}
    .email-card {{
      background: #fff;
      max-width: 420px;
      margin: 40px auto;
      border-radius: 16px;
      box-shadow: 0 4px 24px rgba(139, 92, 246, 0.08), 0 1.5px 4px rgba(0,0,0,0.04);
      padding: 32px 24px 24px 24px;
      border: 1px solid #ececec;
    }}
    .logo {{
      display: block;
      margin: 0 auto 24px auto;
      width: 150px;
      height: auto;
    }}
    h2 {{
      font-size: 1.4rem;
      font-weight: 600;
      margin: 0 0 12px 0;
      color: #4f46e5;
      text-align: center;
    }}
    .otp {{
      font-size: 2.2em;
      font-weight: bold;
      color: #8b5cf6;
      letter-spacing: 0.15em;
      background: #f3f4f6;
      border-radius: 8px;
      padding: 12px 0;
      text-align: center;
      margin: 24px 0 16px 0;
      box-shadow: 0 1px 4px rgba(139, 92, 246, 0.06);
    }}
    .footer {{
      margin-top: 24px;
      font-size: 0.95rem;
      color: #6b7280;
      text-align: center;
    }}
    @media (max-width: 600px) {{
      .email-card {{
        padding: 16px 4vw 16px 4vw;
      }}
    }}
  </style>
  </head>
  <body>
    <div class=\"email-card\">
      <img src=\"https://students.rajalakshmi.org/images/rec_logo.png\" alt=\"REC Logo\" class=\"logo\"/>
      <h2>Bus Boarding Point OTP</h2>
      <p style=\"text-align:center; margin-bottom: 8px;\">Hello {student_name},</p>
      <p style=\"text-align:center; margin: 16px 0 0 0; font-weight:600; color:#dc2626; font-size:1.05em;\">
        Important: You can confirm your transport location only once. After confirmation, no further changes are possible. Please review your location carefully before proceeding.
      </p>
      <p style=\"text-align:center; margin: 12px 0 0 0;\">
        Your OTP for confirming your transport location is:
      </p>
      <div class=\"otp\">{otp}</div>
      <p style=\"text-align:center; margin: 12px 0 0 0;\">
        This OTP is valid for a single use. Please do not share it with anyone.
      </p>
      <div class=\"footer\"></div>
    </div>
  </body>
  </html>
    """

    plain_message = (
        "Bus Boarding Point OTP\n\n"
        f"Hello {student_name},\n\n"
        "Important: You can confirm your transport location only once. After confirmation, no further changes are possible.\n\n"
        f"Your OTP for confirming your transport location is: {otp}\n\n"
        "This OTP is valid for a single use. Please do not share it with anyone.\n"
    )

    try:
        send_mail(
            subject=subject,
            message=strip_tags(plain_message),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            html_message=html_message,
            fail_silently=False,
        )
        return True
    except Exception as e:
        print(f"Error sending transport OTP email: {e}")
        return False