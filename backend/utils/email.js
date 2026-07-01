const sgMail = require('@sendgrid/mail');

const sendEmail = async ({ to, subject, html, text }) => {
  const apiKey = process.env.SENDGRID_API_KEY;

  // Development/Mock fallback if no valid key is provided
  if (!apiKey || apiKey.startsWith('SG.mock') || apiKey === 'SG.your_sendgrid_api_key_here') {
    console.log('\n--- [EMAIL MOCK SERVICE] ---');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Text Body: ${text || 'N/A'}`);
    console.log(`HTML Body: ${html || 'N/A'}`);
    console.log('----------------------------\n');
    return { mock: true, success: true };
  }

  // Set API Key
  sgMail.setApiKey(apiKey);

  const msg = {
    to,
    from: process.env.FROM_EMAIL || 'noreply@campuspay.com',
    subject,
    text: text || '',
    html: html || '',
  };

  try {
    await sgMail.send(msg);
    return { mock: false, success: true };
  } catch (error) {
    console.error('SendGrid Error:', error.response ? error.response.body : error.message);
    throw new Error('Email could not be sent');
  }
};

module.exports = sendEmail;
