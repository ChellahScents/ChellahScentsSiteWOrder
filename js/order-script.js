// Enhanced order-script.js
// Handles dynamic file inputs, PayPal integration, Firebase upload & Firestore

const firebaseConfig = {
    apiKey: "AIzaSyBIIyuFigBoRR7Ev9wULduht3nx5kxp6i4",
    authDomain: "chellah-orders.firebaseapp.com",
    projectId: "chellah-orders",
    storageBucket: "chellah-orders.appspot.com",
    messagingSenderId: "577794209323",
    appId: "1:577794209323:web:6da2e20a2ddc1718945c6e"
  };
  
  firebase.initializeApp(firebaseConfig);
  const db = firebase.firestore();
  const storage = firebase.storage();
  
  function calculateTotal() {
    const form = document.getElementById('order-form');
    const services = [...form.querySelectorAll('input[name="service"]:checked')].map(el => el.value);
    const wordCount = parseInt(form.wordCount?.value || "0");
    const lengthMin = parseInt(form.lengthMin?.value || "0");
    const isRush = form.rush?.checked;
    let total = 0;
    if (services.includes("translation")) total += wordCount * 0.10;
    if (services.includes("transcription")) total += lengthMin * 1.00;
    if (services.includes("subtitling")) total += lengthMin * 1.25;
    if (isRush) total *= 1.25;
    return Math.max(total, 0.00);
  }
  
  function validateForm() {
    const form = document.getElementById('order-form');
    const services = form.querySelectorAll('input[name="service"]:checked');
    const email = form.customerEmail.value;
    const sourceLang = form.sourceLang.value;
    const targetLangs = [...form.targetLangs.selectedOptions].map(opt => opt.value);
  
    if (services.length === 0) return alert('Please select at least one service'), false;
    if (!email || !email.includes('@')) return alert('Please enter a valid email address'), false;
    if (!sourceLang) return alert('Please select a source language'), false;
    if (targetLangs.length === 0) return alert('Please select at least one target language'), false;
    return true;
  }
  
  function updateTotalDisplay() {
    const total = calculateTotal();
    document.getElementById("total-price").textContent = total.toFixed(2);
  }
  
  document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("order-form");
    const serviceCheckboxes = document.querySelectorAll('input[name="service"]');
    const translationFields = document.getElementById('translation-fields');
    const audioFields = document.getElementById('audio-fields');
  
    serviceCheckboxes.forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        translationFields.classList.toggle('hidden', !form.querySelector('input[value="translation"]:checked'));
        audioFields.classList.toggle('hidden',
          !form.querySelector('input[value="transcription"]:checked') &&
          !form.querySelector('input[value="subtitling"]:checked')
        );
      });
    });
  
    paypal.Buttons({
      style: {
        layout: 'vertical',
        color: 'gold',
        shape: 'rect',
        label: 'paypal'
      },
  
      createOrder: function (data, actions) {
        if (!validateForm()) {
          console.error("❌ Form validation failed");
          return Promise.reject("Form validation failed");
        }
  
        const price = calculateTotal().toFixed(2);
        return actions.order.create({
          purchase_units: [{ amount: { value: price } }]
        });
      },
  
      onApprove: async function (data, actions) {
        try {
          const captureResult = await actions.order.capture();
  
          const formData = new FormData(form);
          const orderID = `ORD-${Date.now()}`;
          const fileInput = document.getElementById("fileInput");
          const files = fileInput.files;
  
          const fileUploadPromises = Array.from(files).map(async (file) => {
            const fileRef = storage.ref(`orders/${orderID}/${file.name}`);
            const metadata = { contentType: file.type || 'application/octet-stream' };
            const snapshot = await fileRef.put(file, metadata);
            return await fileRef.getDownloadURL();
          });
  
          const fileLinks = await Promise.all(fileUploadPromises);
  
          const order = {
            orderID,
            customerEmail: formData.get("customerEmail"),
            sourceLang: formData.get("sourceLang"),
            targetLangs: formData.getAll("targetLangs"),
            services: formData.getAll("service"),
            wordCount: formData.get("wordCount") || 0,
            lengthMin: formData.get("lengthMin") || 0,
            rush: formData.get("rush") === "true",
            notes: formData.get("notes"),
            paid: true,
            totalPaid: calculateTotal().toFixed(2),
            timestamp: new Date().toISOString(),
            fileLinks
          };
  
          await db.collection("orders").doc(orderID).set(order);
  
          document.body.insertAdjacentHTML('beforeend', `
            <div id="confirmation" style="background:#d4edda;color:#155724;padding:1em;margin:1em 0;border:1px solid #c3e6cb;border-radius:5px;">
              ✅ <strong>Order ${orderID}</strong> placed successfully!<br>
              A confirmation has been sent to <strong>${formData.get("customerEmail")}</strong>.
            </div>
          `);
  
          form.reset();
          updateTotalDisplay();
        } catch (err) {
          console.error("❌ Order processing error:", err);
          alert("❌ Something went wrong after payment. Please contact support.");
        }
      },
  
      onError: function (err) {
        console.error("❌ PayPal Button Error:", err);
        alert("Payment could not be completed. Please try again or contact support.");
      }
    }).render('#paypal-button-container');
  
    updateTotalDisplay();
    form.addEventListener("change", updateTotalDisplay);
    form.addEventListener("input", updateTotalDisplay);
  });
  