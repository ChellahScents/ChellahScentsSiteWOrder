// Firebase Function: sendOrderEmails
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();

const gmailEmail = "order@chellah-scents.com";
const gmailPassword = "GL4HS&CbA4Nm3bH&"; // Replace with your Google App Password

const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: gmailEmail,
    pass: gmailPassword
  }
});

exports.sendOrderEmails = functions.firestore
  .document("orders/{orderId}")
  .onCreate(async (snap, context) => {
    const order = snap.data();

    const emailText = `
New order received from ${order.customerEmail}:
Order ID: ${order.orderID}
Services: ${order.services.join(", ")}
Source: ${order.sourceLang}
Target: ${order.targetLangs.join(", ")}
Total Paid: $${order.totalPaid}

Notes:
${order.notes || "None"}

Download links:
${order.fileLinks.join("\n")}
    `;

    const mailOptions = {
      from: `Chellah Scents <${gmailEmail}>`,
      to: [order.customerEmail, "mbounejmate@gmail.com"],
      subject: `Your Order ${order.orderID} Confirmation`,
      text: emailText
    };

    await transporter.sendMail(mailOptions);
    console.log("✅ Confirmation email sent");
  });
