// competitive rates + rush surcharge
const PRICES = {
    translation: 0.12,    // $ per word
    transcription: 1.30,  // $ per minute
    subtitling: 3.50      // $ per minute
  };
  const RUSH_SURCHARGE = 0.25;  // 25% extra
  
  document.addEventListener('DOMContentLoaded', () => {
    const form       = document.getElementById('order-form');
    const services   = form.querySelectorAll('input[name=service]');
    const rushChk    = form.querySelector('input[name=rush]');
    const transFld   = document.getElementById('translation-fields');
    const audioFld   = document.getElementById('audio-fields');
    const wcInput    = form.querySelector('input[name=wordCount]');
    const lenInput   = form.querySelector('input[name=lengthMin]');
    const totalSpan  = document.getElementById('total-price');
    const orderNumIn = document.getElementById('orderNumber');
  
    // generate simple order number: timestamp + random
    const orderNumber = 'ORD-' + Date.now() + '-' + Math.floor(Math.random()*900+100);
    orderNumIn.value = orderNumber;
  
    function updateFields(){
      const sel = Array.from(services).filter(cb=>cb.checked).map(cb=>cb.value);
      transFld.classList.toggle('hidden', !sel.includes('translation'));
      audioFld.classList.toggle('hidden',
        !sel.includes('transcription') && !sel.includes('subtitling')
      );
    }
  
    function recalc(){
      let total = 0;
      const sel = Array.from(services).filter(cb=>cb.checked).map(cb=>cb.value);
      const wc  = +wcInput.value || 0;
      const m   = +lenInput.value || 0;
      if(sel.includes('translation'))   total += wc * PRICES.translation;
      if(sel.includes('transcription')) total += m  * PRICES.transcription;
      if(sel.includes('subtitling'))    total += m  * PRICES.subtitling;
      if(rushChk.checked) total *= (1 + RUSH_SURCHARGE);
  
      total = Math.max(0, total);
      totalSpan.textContent = total.toFixed(2);
  
      // expose for PayPal or backend
      window.CHELLAH_TOTAL = total;
      document.dispatchEvent(new Event('orderChanged'));
    }
  
    // wire events
    services.forEach(cb => cb.addEventListener('change',()=>{ updateFields(); recalc(); }));
    [wcInput,lenInput,rushChk].forEach(el => el.addEventListener('input', recalc));
  
    // init
    updateFields(); recalc();
  });