// This script is for the home page of the web application.

let serverUrl = 'http://localhost:5000/';
window.onload = function () {
    // Check if the user is logged in by checking the sessionStorage
    fetch(serverUrl, {
        method: 'POST',
    })
        .then(response => response.json())
        .then(data => {
            if (data) {
                let rows = document.querySelectorAll('tr');
                // Skip the first row (header row) and iterate through all rows to append the company name
                for (let i = 1; i <= data.length; i++) {
                    let symbol = rows[i].firstChild.nextElementSibling.innerText;
                    if (data[i - 1]) {
                        rows[i].firstChild.nextElementSibling.innerText = `${data[i - 1]} ${symbol}`;
                    }
                }
            }
        })
        .catch(error => console.error('Error:', error));
}

// let rows = document.querySelectorAll('tr');
