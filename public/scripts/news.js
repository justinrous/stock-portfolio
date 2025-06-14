
let marketNewsBtn = document.querySelector('#marketNews');
let companyNewsBtn = document.querySelector('#companyNews');
let form = document.querySelector('form');

let pathname;

window.addEventListener('DOMContentLoaded', () => {
    // Initialize the buttons
    pathname = window.location.pathname;
    if (pathname === '/news') {
        marketNewsBtn.classList.add('active');
        companyNewsBtn.classList.remove('active');
        form.classList.add('hidden');
    } else if (pathname === '/companyNews') {
        companyNewsBtn.classList.add('active');
        marketNewsBtn.classList.remove('active');
        form.classList.remove('hidden');
    }
});
