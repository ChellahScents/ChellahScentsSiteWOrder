const nodemailer = require('nodemailer');
const { IncomingForm } = require('formidable');
const fs = require('fs');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // parse multipart form
  const form = new IncomingForm();
  return new Promise((resolve, reject) => {
    form.parse(event, async (err, fields, files) => {
      if (err) return reject({ statusCode: 500, body: 'Form parse error' });

      // build order record
      const order = {
        number: fields.orderNumber,
        customerEmail: fields.customerEmail,
        sourceLang: fields.sourceLang,
        targetLangs: fields.targetLangs,
        services: fields.service,
        wordCount: fields.wordCount,
        lengthMin: fields.lengthMin,
        rush: !!fields.rush,
        notes: fields.notes,
        total: fields.totalPrice,
        timestamp: new Date().toISOString()
      };

      // ### Persist order (e.g. append to a JSON file) ###
      const dbPath = './orders.json';
      let db = [];
      try { db = JSON.parse(fs.readFileSync(dbPath)); } catch(_){ }
      db.push(order);
      fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

      // ### Email Setup ###
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

      // attachments array
      const attachments = [];
      for (let key in files) {
        const file = files[key];
        if (Array.isArray(file)) {
          file.forEach(f => attachments.push({ filename: f.name, path: f.path }));
        } else {
          attachments.push({ filename: file.name, path: file.path });
        }
      }

      // common mail options
      const mailOpts = {
        from: `"Chellah Scents" <${process.env.SENDER_EMAIL}>`,
        to: [ 'mbounejmate@gmail.com', fields.customerEmail ],
        subject: `New Order ${order.number}`,
        text: `
Order #: ${order.number}
Customer: ${order.customerEmail}
Services: ${order.services}
Words: ${order.wordCount}, Minutes: ${order.lengthMin}, Rush: ${order.rush}
Total: $${order.total}
Notes: ${order.notes}
        `,
        attachments
      };

      // send email
      await transporter.sendMail(mailOpts);

      // respond
      resolve({
        statusCode: 200,
        body: JSON.stringify({ success: true, orderNumber: order.number })
      });
    });
  });
};