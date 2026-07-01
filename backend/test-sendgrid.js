require('dotenv').config();
const sendEmail = require('./utils/email');

const testSend = async () => {
  console.log('Testing SendGrid connection...');
  console.log('SENDGRID_API_KEY:', process.env.SENDGRID_API_KEY ? 'Present' : 'Missing');
  console.log('FROM_EMAIL:', process.env.FROM_EMAIL);

  try {
    const result = await sendEmail({
      to: 'cs24i1025@iiitdm.ac.in', // The user's email from the logs
      subject: 'SendGrid Test Code',
      text: 'This is a test email to verify SendGrid integration.',
      html: '<strong>This is a test email to verify SendGrid integration.</strong>'
    });
    console.log('Result:', result);
  } catch (error) {
    console.error('Test Failed with Error:', error);
  }
};

testSend();
