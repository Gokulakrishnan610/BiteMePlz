import nodemailer from 'nodemailer';

const sendEmail = async (email, subject, text) => {
  try {
    const transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST||"smtp.gmail.com",
      port: process.env.SMTP_PORT||"587",
      secure: false,
      auth: {
        user: process.env.SMTP_USER||"asivasabariganesan@gmail.com",
        pass: process.env.SMTP_PASS||"azba osyp mziq ktqf",
      },
    });

    // Extract OTP from text if present
    const otpMatch = text.match(/\d{6}/);
    const isPasswordReset = text.toLowerCase().includes('reset');
    const isVerification = text.toLowerCase().includes('verification');

    // Create enhanced HTML email template with Campus Kiosk theme
    const htmlTemplate = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #0d0d0d 0%, #1a1a1a 50%, #0d0d0d 100%);
            color: #ffffff;
            line-height: 1.6;
            padding: 20px;
            min-height: 100vh;
          }
          
          .container {
            max-width: 600px;
            margin: 0 auto;
            background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 50%, #1a1a1a 100%);
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(162, 89, 255, 0.3);
            overflow: hidden;
            border: 2px solid #a259ff;
          }
          
          .header {
            background: linear-gradient(135deg, #a259ff 0%, #9c27b0 100%);
            padding: 40px 30px;
            text-align: center;
            position: relative;
            overflow: hidden;
          }
          
          .header::before {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
            animation: shimmer 4s ease-in-out infinite;
          }
          
          @keyframes shimmer {
            0%, 100% { transform: rotate(0deg) scale(1); }
            50% { transform: rotate(180deg) scale(1.1); }
          }
          
          .logo-container {
            position: relative;
            z-index: 2;
            margin-bottom: 20px;
          }
          
          .logo-icon {
            width: 60px;
            height: 60px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 15px;
            backdrop-filter: blur(10px);
            border: 2px solid rgba(255, 255, 255, 0.3);
          }
          
          .logo-icon::before {
            content: '⚡';
            font-size: 28px;
            color: #ffffff;
          }
          
          .logo {
            font-size: 32px;
            font-weight: bold;
            color: #ffffff;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
            position: relative;
            z-index: 1;
            margin-bottom: 10px;
          }
          
          .subtitle {
            font-size: 16px;
            color: #E5E7EB;
            position: relative;
            z-index: 1;
            opacity: 0.9;
          }
          
          .content {
            padding: 40px 30px;
            background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
          }
          
          .greeting {
            font-size: 24px;
            color: #a259ff;
            margin-bottom: 20px;
            font-weight: 600;
          }
          
          .message {
            font-size: 16px;
            color: #E5E7EB;
            margin-bottom: 30px;
            line-height: 1.8;
          }
          
          .otp-container {
            background: linear-gradient(135deg, #a259ff 0%, #9c27b0 100%);
            border-radius: 15px;
            padding: 30px;
            text-align: center;
            margin: 30px 0;
            border: 2px solid #a259ff;
            box-shadow: 0 15px 35px rgba(162, 89, 255, 0.4);
            position: relative;
            overflow: hidden;
          }
          
          .otp-container::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
            animation: slide 2s infinite;
          }
          
          @keyframes slide {
            0% { left: -100%; }
            100% { left: 100%; }
          }
          
          .otp-label {
            font-size: 14px;
            color: #E5E7EB;
            margin-bottom: 15px;
            text-transform: uppercase;
            letter-spacing: 2px;
            font-weight: 600;
          }
          
          .otp-code {
            font-size: 42px;
            font-weight: bold;
            color: #ffffff;
            letter-spacing: 12px;
            font-family: 'Courier New', monospace;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
            margin: 10px 0;
            position: relative;
            z-index: 1;
          }
          
          .otp-validity {
            font-size: 12px;
            color: #D1D5DB;
            margin-top: 15px;
            opacity: 0.8;
          }
          
          .action-button {
            display: inline-block;
            background: linear-gradient(135deg, #a259ff 0%, #9c27b0 100%);
            color: #ffffff;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 10px;
            font-weight: 600;
            margin: 20px 0;
            box-shadow: 0 10px 25px rgba(162, 89, 255, 0.3);
            transition: all 0.3s ease;
          }
          
          .warning {
            background: linear-gradient(135deg, #2d2d2d 0%, #404040 100%);
            border-left: 4px solid #F59E0B;
            padding: 20px;
            margin: 25px 0;
            border-radius: 8px;
            font-size: 14px;
            color: #F3F4F6;
          }
          
          .warning-icon {
            display: inline-block;
            width: 20px;
            height: 20px;
            background: #F59E0B;
            border-radius: 50%;
            margin-right: 10px;
            vertical-align: middle;
          }
          
          .warning-icon::before {
            content: '⚠';
            color: #ffffff;
            font-size: 12px;
            display: block;
            text-align: center;
            line-height: 20px;
          }
          
          .footer {
            background: linear-gradient(135deg, #0d0d0d 0%, #1a1a1a 100%);
            padding: 30px;
            text-align: center;
            border-top: 2px solid #a259ff;
          }
          
          .footer-text {
            font-size: 14px;
            color: #9CA3AF;
            margin-bottom: 15px;
          }
          
          .company-name {
            font-size: 20px;
            font-weight: bold;
            color: #a259ff;
            margin-bottom: 10px;
          }
          
          .contact-info {
            font-size: 12px;
            color: #6B7280;
          }
          
          .divider {
            height: 2px;
            background: linear-gradient(90deg, transparent 0%, #a259ff 50%, transparent 100%);
            margin: 25px 0;
          }
          
          .social-links {
            margin: 20px 0;
          }
          
          .social-link {
            display: inline-block;
            width: 40px;
            height: 40px;
            background: rgba(162, 89, 255, 0.2);
            border-radius: 50%;
            margin: 0 10px;
            text-decoration: none;
            color: #a259ff;
            line-height: 40px;
            text-align: center;
            border: 1px solid rgba(162, 89, 255, 0.3);
            transition: all 0.3s ease;
          }
          
          .features {
            display: flex;
            justify-content: space-around;
            margin: 30px 0;
            flex-wrap: wrap;
          }
          
          .feature {
            text-align: center;
            flex: 1;
            min-width: 150px;
            margin: 10px;
          }
          
          .feature-icon {
            width: 50px;
            height: 50px;
            background: linear-gradient(135deg, #a259ff 0%, #9c27b0 100%);
            border-radius: 50%;
            margin: 0 auto 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
          }
          
          .feature-title {
            font-size: 14px;
            font-weight: 600;
            color: #a259ff;
            margin-bottom: 5px;
          }
          
          .feature-desc {
            font-size: 12px;
            color: #9CA3AF;
          }
          
          @media (max-width: 600px) {
            .container {
              margin: 10px;
              border-radius: 15px;
            }
            
            .content {
              padding: 25px 20px;
            }
            
            .otp-code {
              font-size: 32px;
              letter-spacing: 8px;
            }
            
            .features {
              flex-direction: column;
            }
            
            .feature {
              margin: 15px 0;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo-container">
              <div class="logo-icon"></div>
              <div class="logo">Campus Kiosk</div>
              <div class="subtitle">Your Digital Campus Marketplace</div>
            </div>
          </div>
          
          <div class="content">
            <div class="greeting">Hello there! 👋</div>
            
            <div class="message">
              ${isPasswordReset ? 
                'We received a request to reset your password. Use the secure code below to create a new password for your Campus Kiosk account:' :
                isVerification ?
                'Welcome to Campus Kiosk! Please verify your email address using the secure code below to complete your registration:' :
                'Thank you for using Campus Kiosk. Here\'s your secure verification code:'
              }
            </div>
            
            ${otpMatch ? `
              <div class="otp-container">
                <div class="otp-label">Your Secure Verification Code</div>
                <div class="otp-code">${otpMatch[0]}</div>
                <div class="otp-validity">⏰ Valid for 10 minutes only</div>
              </div>
            ` : ''}
            
            <div class="warning">
              <span class="warning-icon"></span>
              <strong>Security Notice:</strong> Never share this code with anyone. Our team will never ask for your verification code via phone or email. If you didn't request this, please ignore this email and consider changing your password.
            </div>
            
            <div class="features">
              <div class="feature">
                <div class="feature-icon">⚡</div>
                <div class="feature-title">Lightning Fast</div>
                <div class="feature-desc">Quick & seamless shopping</div>
              </div>
              <div class="feature">
                <div class="feature-icon">🛡️</div>
                <div class="feature-title">Secure</div>
                <div class="feature-desc">Bank-level security</div>
              </div>
              <div class="feature">
                <div class="feature-icon">📱</div>
                <div class="feature-title">Mobile Ready</div>
                <div class="feature-desc">Shop anywhere, anytime</div>
              </div>
            </div>
            
            <div class="divider"></div>
            
            <div class="message">
              ${isPasswordReset ? 
                'After verification, you\'ll be able to create a new secure password for your account.' :
                'Once verified, you\'ll have access to all Campus Kiosk features including wallet management, order tracking, and exclusive campus deals.'
              }
            </div>
            
            <div class="message">
              Need help? Our support team is here for you 24/7. Simply reply to this email or visit our help center.
            </div>
          </div>
          
          <div class="footer">
            <div class="company-name">Campus Kiosk</div>
            <div class="footer-text">
              Making campus shopping convenient, secure, and delightful
            </div>
            
            <div class="social-links">
              <a href="#" class="social-link">📧</a>
              <a href="#" class="social-link">📱</a>
              <a href="#" class="social-link">🌐</a>
            </div>
            
            <div class="contact-info">
              This is an automated message from Campus Kiosk. Please do not reply to this email.<br>
              © ${new Date().getFullYear()} Campus Kiosk. All rights reserved.
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    await transporter.sendMail({
      from: process.env.SMTP_FROM||"Campus Kiosk <asivasabariganesan@gmail.com>",
      to: email,
      subject: `🚀 ${subject} - Campus Kiosk`,
      text: text,
      html: htmlTemplate,
    });

    console.log("✅ Email sent successfully to:", email);
  } catch (error) {
    console.log("❌ Email not sent");
    console.log(error);
    throw error;
  }
};

export default sendEmail;