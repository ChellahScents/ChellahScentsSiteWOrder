// Enhanced order-script.js with proper upload error handling and sweet confirmation
const firebaseConfig = {
    apiKey: "AIzaSyBIIyuFigBoRR7Ev9wULduht3nx5kxp6i4",
    authDomain: "chellah-orders.firebaseapp.com",
    projectId: "chellah-orders",
    storageBucket: "chellah-orders",
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
      console.log("✅ PayPal payment approved");
      try {
        const captureResult = await actions.order.capture();
        console.log("✅ Payment captured:", captureResult);

        const formData = new FormData(form);
        const orderID = `ORD-${Date.now()}`;

        const translationFiles = form.querySelector('input[name="translationFiles"]').files;
        const transcriptionFiles = form.querySelector('input[name="transcriptionFiles"]').files;
        const subtitlingFiles = form.querySelector('input[name="subtitlingFiles"]').files;

        const allFiles = [
          ...translationFiles,
          ...transcriptionFiles,
          ...subtitlingFiles
        ];

        console.log("🟡 Preparing upload. Files selected:", allFiles.length);

        let fileLinks = [];
        const uploadResults = await Promise.allSettled(
          Array.from(allFiles).map(async (file) => {
            try {
              console.log("📤 Uploading file:", file.name);
              const fileRef = storage.ref(`orders/${orderID}/${file.name}`);
              const metadata = { contentType: file.type || 'application/octet-stream' };
              const snapshot = await fileRef.put(file, metadata);
              const url = await fileRef.getDownloadURL();
              console.log("✅ Uploaded:", url);
              return url;
            } catch (e) {
              console.error("❌ Failed upload for", file.name, e);
              throw e;
            }
          })
        );

        fileLinks = uploadResults
          .filter(result => result.status === "fulfilled")
          .map(result => result.value);

        if (fileLinks.length === 0) {
          alert("❌ All uploads failed due to CORS or auth. Nothing saved.");
          return;
        }

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

        console.log("📝 Writing order to Firestore:", order);
        await db.collection("orders").doc(orderID).set(order);
        console.log("✅ Firestore write complete");

        const confirmationBox = document.createElement("div");
        confirmationBox.style.cssText = `
          position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
          background: #f0fdf4; color: #166534; padding: 2em; border-radius: 10px;
          border: 2px solid #bbf7d0; text-align: center; font-size: 1.1em; z-index: 1000;
          box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        `;
        confirmationBox.innerHTML = `
          ✅ <strong>Order ${orderID}</strong> placed successfully!<br>
          A confirmation has been sent to <strong>${formData.get("customerEmail")}</strong>.<br><br>
          <button onclick="location.reload()" style="margin-top:1em; padding:0.5em 1.5em; background:#10b981; color:white; border:none; border-radius:5px; cursor:pointer;">
            New Order
          </button>
        `;
        document.body.appendChild(confirmationBox);

        form.reset();
        updateTotalDisplay();

      } catch (err) {
        console.error("❌ Unhandled order error:", err);
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
