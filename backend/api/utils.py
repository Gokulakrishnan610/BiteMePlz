from django.core.mail import send_mail
from django.conf import settings
from django.utils.html import strip_tags

def send_otp_email(email, otp, user_name):
    """
    Send OTP email to user
    """
    subject = 'Campus Kiosk - Email Verification'
    
    # HTML content
    html_message = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 10px; text-align: center;">
            <h1 style="color: white; margin: 0;">Campus Kiosk</h1>
            <p style="color: white; margin: 10px 0 0 0;">Your Digital Campus Marketplace</p>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 10px; margin-top: 20px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <h2 style="color: #333; margin-bottom: 20px;">Email Verification</h2>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
                Hi <strong>{user_name}</strong>,
            </p>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
                Thank you for registering with Campus Kiosk! To complete your registration, please use the verification code below:
            </p>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                <h3 style="color: #333; margin: 0 0 10px 0; font-size: 18px;">Your Verification Code</h3>
                <div style="background: white; padding: 15px; border-radius: 6px; border: 2px dashed #667eea; display: inline-block;">
                    <span style="font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 8px;">{otp}</span>
                </div>
            </div>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
                This code will expire in <strong>10 minutes</strong>. If you didn't request this verification, please ignore this email.
            </p>
            
            <div style="background: #e8f5e8; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <p style="color: #2d5a2d; margin: 0; font-size: 14px;">
                    <strong>Security Tip:</strong> Never share this code with anyone. Campus Kiosk will never ask for your verification code via phone or email.
                </p>
            </div>
        </div>
        
        <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
            <p>© 2024 Campus Kiosk. All rights reserved.</p>
            <p>This is an automated email, please do not reply.</p>
        </div>
    </div>
    """
    
    # Plain text content
    plain_message = f"""
    Campus Kiosk - Email Verification
    
    Hi {user_name},
    
    Thank you for registering with Campus Kiosk! To complete your registration, please use the verification code below:
    
    Your Verification Code: {otp}
    
    This code will expire in 10 minutes. If you didn't request this verification, please ignore this email.
    
    Security Tip: Never share this code with anyone. Campus Kiosk will never ask for your verification code via phone or email.
    
    © 2024 Campus Kiosk. All rights reserved.
    This is an automated email, please do not reply.
    """
    
    try:
        # Send email
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

def send_resend_otp_email(email, otp, user_name):
    """
    Send resend OTP email to user
    """
    subject = 'Campus Kiosk - New Verification Code'
    
    # HTML content
    html_message = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 10px; text-align: center;">
            <h1 style="color: white; margin: 0;">Campus Kiosk</h1>
            <p style="color: white; margin: 10px 0 0 0;">Your Digital Campus Marketplace</p>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 10px; margin-top: 20px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <h2 style="color: #333; margin-bottom: 20px;">New Verification Code</h2>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
                Hi <strong>{user_name}</strong>,
            </p>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
                You requested a new verification code. Here's your new code:
            </p>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                <h3 style="color: #333; margin: 0 0 10px 0; font-size: 18px;">Your New Verification Code</h3>
                <div style="background: white; padding: 15px; border-radius: 6px; border: 2px dashed #667eea; display: inline-block;">
                    <span style="font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 8px;">{otp}</span>
                </div>
            </div>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
                This code will expire in <strong>10 minutes</strong>. If you didn't request this verification, please ignore this email.
            </p>
            
            <div style="background: #e8f5e8; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <p style="color: #2d5a2d; margin: 0; font-size: 14px;">
                    <strong>Security Tip:</strong> Never share this code with anyone. Campus Kiosk will never ask for your verification code via phone or email.
                </p>
            </div>
        </div>
        
        <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
            <p>© 2024 Campus Kiosk. All rights reserved.</p>
            <p>This is an automated email, please do not reply.</p>
        </div>
    </div>
    """
    
    # Plain text content
    plain_message = f"""
    Campus Kiosk - New Verification Code
    
    Hi {user_name},
    
    You requested a new verification code. Here's your new code:
    
    Your New Verification Code: {otp}
    
    This code will expire in 10 minutes. If you didn't request this verification, please ignore this email.
    
    Security Tip: Never share this code with anyone. Campus Kiosk will never ask for your verification code via phone or email.
    
    © 2024 Campus Kiosk. All rights reserved.
    This is an automated email, please do not reply.
    """
    
    try:
        # Send email
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