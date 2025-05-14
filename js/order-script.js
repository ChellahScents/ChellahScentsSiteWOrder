// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBIIyuFigBoRR7Ev9wULduht3nx5kxp6i4",
    authDomain: "chellah-orders.firebaseapp.com",
    projectId: "chellah-orders",
    storageBucket: "chellah-orders.appspot.com",
    messagingSenderId: "577794209323",
    appId: "1:577794209323:web:6da2e20a2ddc1718945c6e"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const storage = firebase.storage();

// Calculate total price for services
function calculateTotal() {
    const MINIMUM_CHARGE = 0.00;
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
  
    return Math.max(total, MINIMUM_CHARGE);
}

// Validate form
function validateForm() {
    const form = document.getElementById('order-form');
    const services = form.querySelectorAll('input[name="service"]:checked');
    const email = form.customerEmail.value;
    const sourceLang = form.sourceLang.value;
    const targetLangs = [...form.targetLangs.selectedOptions].map(opt => opt.value);
    const files = document.getElementById("fileInput").files;

    if (services.length === 0) {
        alert('Please select at least one service');
        return false;
    }

    if (!email || !email.includes('@')) {
        alert('Please enter a valid email address');
        return false;
    }

    if (!sourceLang) {
        alert('Please select a source language');
        return false;
    }

    if (targetLangs.length === 0) {
        alert('Please select at least one target language');
        return false;
    }

    if (files.length === 0) {
        alert('Please upload at least one file');
        return false;
    }

    return true;
}

// Update display of total price
function updateTotalDisplay() {
    const total = calculateTotal();
    document.getElementById("total-price").textContent = total.toFixed(2);
}

// Add event listeners for price calculation
document.getElementById("order-form").addEventListener("change", updateTotalDisplay);
document.getElementById("order-form").addEventListener("input", updateTotalDisplay);

// Initialize PayPal buttons after DOM loads
document.addEventListener("DOMContentLoaded", () => {
    // Show/hide service-specific fields
    const serviceCheckboxes = document.querySelectorAll('input[name="service"]');
    const translationFields = document.getElementById('translation-fields');
    const audioFields = document.getElementById('audio-fields');

    serviceCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            translationFields.classList.toggle('hidden', !document.querySelector('input[name="service"][value="translation"]:checked'));
            audioFields.classList.toggle('hidden', 
                !document.querySelector('input[name="service"][value="transcription"]:checked') && 
                !document.querySelector('input[name="service"][value="subtitling"]:checked')
            );
        });
    });

    // PayPal Buttons Configuration
    paypal.Buttons({
        style: {
            layout: 'vertical',
            color: 'gold',
            shape: 'rect',
            label: 'paypal'
        },
        createOrder: function(data, actions) {
            if (!validateForm()) {
                return Promise.reject("Form validation failed");
            }

            const price = calculateTotal().toFixed(2);
            return actions.order.create({
                purchase_units: [{
                    amount: { value: price }
                }]
            });
        },
        onApprove: async function(data, actions) {
            try {
                const captureResult = await actions.order.capture();
                
                const form = document.getElementById('order-form');
                const formData = new FormData(form);
                const orderID = `ORD-${Date.now()}`;

                // File Upload
                const files = document.getElementById("fileInput").files;
                const fileUploadPromises = Array.from(files).map(async (file) => {
                    const fileRef = storage.ref(`orders/${orderID}/${file.name}`);
                    const snapshot = await fileRef.put(file);
                    return await fileRef.getDownloadURL();
                });

                const fileLinks = await Promise.all(fileUploadPromises);

                // Prepare Order Object
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
                    fileLinks: fileLinks
                };

                // Save to Firestore
                await db.collection("orders").doc(orderID).set(order);

                alert("Order placed successfully! Our team will process your request shortly.");
                form.reset();
                updateTotalDisplay();

            } catch (err) {
                console.error("Order processing error:", err);
                alert("An error occurred. Please try again or contact support.");
            }
        },
        onError: function(err) {
            console.error("PayPal Button Error:", err);
            alert("Payment could not be completed. Please try again or contact support.");
        }
    }).render('#paypal-button-container');

    // Initial total display update
    updateTotalDisplay();
});