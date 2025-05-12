const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const formData = JSON.parse(event.body); // for simple field-only data
  const { customerEmail, sourceLang, targetLangs, service, wordCount, lengthMin, rush, notes } = formData;

  const msg = {
    to: 'mbounejmate@gmail.com',
    from: 'orders@chellah-scents.com',
    subject: 'New Order Received',
    text: `Email: ${customerEmail}
Source Language: ${sourceLang}
Target Language(s): ${targetLangs}
Services: ${service}
Word Count: ${wordCount}
Length: ${lengthMin} minutes
Rush: ${rush}
Notes: ${notes}`,
  };

  try {
    await sgMail.send(msg);
    return { statusCode: 200, body: JSON.stringify({ message: 'Order email sent!' }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Email failed to send' }) };
  }
};
