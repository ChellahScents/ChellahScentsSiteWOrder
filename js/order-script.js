// Enhanced order-script.js with proper upload handling and sweet confirmation for individual service blocks
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
    let total = 0;
  
    const translationChecked = form.querySelector('#translation-check')?.checked;
    const transcriptionChecked = form.querySelector('#transcription-check')?.checked;
    const subtitlingChecked = form.querySelector('#subtitling-check')?.checked;
  
    const wordCount = parseInt(form.querySelector('#wordCount')?.value || "0");
    const transcriptionMin = parseInt(form.querySelector('#transcriptionLengthMin')?.value || "0");
    const subtitlingMin = parseInt(form.querySelector('#subtitlingLengthMin')?.value || "0");
    const isRush = form.querySelector('#rush')?.checked;
  
    if (translationChecked) total += wordCount * 0.10;
    if (transcriptionChecked) total += transcriptionMin * 1.00;
    if (subtitlingChecked) total += subtitlingMin * 1.25;
    if (isRush) total *= 1.25;
    return Math.max(total, 0.00);
  }
  
  function validateForm() {
    const form = document.getElementById('order-form');
    const email = form.querySelector('#customerEmail')?.value;
  
    if (!email || !email.includes('@')) return alert('Please enter a valid email address'), false;
    return true;
  }
  
  function updateTotalDisplay() {
    const total = calculateTotal();
    document.getElementById("total-price").textContent = total.toFixed(2);
  }
  
  document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("order-form");
  
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
        if (price <= 0) {
          alert("⚠️ Your total is $0. Please select services or enter valid data.");
          return Promise.reject("Zero amount");
        }
  
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
          const services = [];
          const fileLinks = [];
  
          const serviceGroups = [
            {
              name: 'translation',
              checked: form.querySelector('#translation-check')?.checked,
              source: form.querySelector('#translationSource')?.value || '',
              target: form.querySelector('#translationTarget')?.value || '',
              files: form.querySelector('#translationFiles')?.files || [],
              count: parseInt(form.querySelector('#wordCount')?.value || "0")
            },
            {
              name: 'transcription',
              checked: form.querySelector('#transcription-check')?.checked,
              source: form.querySelector('#transcriptionSource')?.value || '',
              target: form.querySelector('#transcriptionTarget')?.value || '',
              files: form.querySelector('#transcriptionFiles')?.files || [],
              count: parseInt(form.querySelector('#transcriptionLengthMin')?.value || "0")
            },
            {
              name: 'subtitling',
              checked: form.querySelector('#subtitling-check')?.checked,
              source: form.querySelector('#subtitlingSource')?.value || '',
              target: form.querySelector('#subtitlingTarget')?.value || '',
              files: form.querySelector('#subtitlingFiles')?.files || [],
              count: parseInt(form.querySelector('#subtitlingLengthMin')?.value || "0")
            }
          ];
  
          for (const svc of serviceGroups) {
            if (!svc.checked) continue;
  
            services.push({
              type: svc.name,
              sourceLang: svc.source,
              targetLang: svc.target,
              unitCount: svc.count
            });
  
            for (let file of svc.files) {
              const fileRef = storage.ref(`orders/${orderID}/${svc.name}/${file.name}`);
              const snapshot = await fileRef.put(file);
              const url = await fileRef.getDownloadURL();
              fileLinks.push(url);
            }
          }
  
          const order = {
            orderID,
            customerEmail: formData.get("customerEmail"),
            rush: form.querySelector("#rush")?.checked || false,
            notes: formData.get("notes") || "",
            services,
            paid: true,
            totalPaid: calculateTotal().toFixed(2),
            timestamp: new Date().toISOString(),
            fileLinks
          };
  
          await db.collection("orders").doc(orderID).set(order);
  
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
  