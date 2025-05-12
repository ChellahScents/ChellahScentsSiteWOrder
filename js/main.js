document.addEventListener('DOMContentLoaded', () => {
    const btn = document.querySelector('.nav-toggle');
    const menu = document.querySelector('.nav-menu');
    btn.addEventListener('click', () => menu.classList.toggle('open'));
  });