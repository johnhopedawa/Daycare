const nodemailer = require('nodemailer');

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM;
const SMTP_SECURE = process.env.SMTP_SECURE === 'true';

let transporter = null;

const getTransporter = () => {
  if (transporter) {
    return transporter;
  }

  if (!SMTP_HOST || !SMTP_FROM) {
    throw new Error('Email service not configured (SMTP_HOST/SMTP_FROM missing)');
  }

  const config = {
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
  };

  if (SMTP_USER) {
    config.auth = {
      user: SMTP_USER,
      pass: SMTP_PASS,
    };
  }

  transporter = nodemailer.createTransport(config);
  return transporter;
};

const sendEmail = async ({ to, subject, text, html }) => {
  const transport = getTransporter();

  return transport.sendMail({
    from: SMTP_FROM,
    to,
    subject,
    text,
    html,
  });
};

module.exports = { sendEmail };
