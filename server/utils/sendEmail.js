import nodemailer from 'nodemailer';

const sendEmail = async (email, subject, text) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST||"smtp.gmail.com",
      port: process.env.SMTP_PORT||"587",
      secure: false,
      auth: {
        user: process.env.SMTP_USER||"asivasabariganesan@gmail.com",
        pass: process.env.SMTP_PASS||"azba osyp mziq ktqf",
      },
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM||"asivasabariganesan@gmail.com",
      to: email,
      subject: subject,
      text: text,
    });

    console.log("Email sent successfully");
  } catch (error) {
    console.log("Email not sent");
    console.log(error);
  }
};

export default sendEmail;