
let stockInput2 = document.querySelector('#stock-input2');
let add = document.querySelector('#add');

add.addEventListener('click', (e) => {
    stockInput2.style.display = 'block';
    add.style.display = 'none';
})


/******************************************************************************
 * ************************** Quartersly & Annual Toggle **********************
 ******************************************************************************/

// let tableQuarterly = document.querySelector('.table-quarterly');
// let tableAnnual = document.querySelector('.table-annual');

let companyContainers = document.querySelectorAll('.company-container');

function toggle(element) {

    // Select Radio Button
    let buttons = [];
    let quarterlyBtn = element.querySelector('.quarterly');
    let annualBtn = element.querySelector('.annual');
    buttons.push(quarterlyBtn, annualBtn);

    // Select containers to toggle
    let tableQuarterly = element.querySelector('.table-quarterly');
    let tableAnnual = element.querySelector('.table-annual');

    // Add Event Listener
    buttons.forEach((button, index, array) => {
        button.addEventListener('click', (e) => {

            if (e.target == quarterlyBtn) {
                // Remove checked for annual and remove container from the DOM
                annualBtn.checked = false;
                tableAnnual.classList.add('hide-table');

                quarterlyBtn.checked = true;
                tableQuarterly.classList.remove('hide-table');
            }
            else {
                annualBtn.checked = true;
                tableAnnual.classList.remove('hide-table');

                quarterlyBtn.checked = false;
                tableQuarterly.classList.add('hide-table')
            }
        })
    })
}

companyContainers.forEach(toggle);



/*******************************************************************************
 ***************************** Dividend Tracker *******************************
 ******************************************************************************/
let dividendBtn = document.querySelector('.dividend-button');

dividendBtn.addEventListener('click', (e) => {

    let dividendContainer = document.querySelector('.dividend-container');

    let yield = null;
    let ths = document.querySelectorAll('th');
    for (let th of ths) {
        if (th.textContent == 'Dividend Yield') {
            if (th) {
                yield = th.nextElementSibling.textContent;
            }
        }
    }
    console.log(yield)

    let form = document.createElement('form');
    form.classList.add('dynamicForm')

    // Dynamically Populate Symbol

    let formDiv = document.createElement('div');
    let symbol = document.querySelector('th').textContent;
    let label = document.createElement('label');
    label.textContent = "Symbol: "
    label.setAttribute('for', 'symbol');
    let input = document.createElement('input');
    input.setAttribute('type', "text");
    input.setAttribute('id', 'ticker');
    input.setAttribute('name', 'ticker');
    input.setAttribute('value', symbol);
    // Insert Elements into div container 
    formDiv.appendChild(label);
    formDiv.appendChild(input);


    // Dynamically Populate Yield
    let formDiv2 = document.createElement('div');
    let label2 = document.createElement('label');
    label2.textContent = "Yield: "
    label2.setAttribute('for', 'yield');
    let input2 = document.createElement('input');
    input2.setAttribute('type', 'text');
    input2.setAttribute('id', 'yield');
    input2.setAttribute('name', 'yield');
    input2.setAttribute('value', yield);
    // Insert Elements into div container 
    formDiv2.appendChild(label2);
    formDiv2.appendChild(input2);


    // Create Input to Enter Initial Investment
    let formDiv3 = document.createElement('div');
    let label3 = document.createElement('label');
    label3.setAttribute('for', 'investment');
    label3.textContent = "Initial Investment Amount: "
    let input3 = document.createElement('input');
    input3.setAttribute('type', 'text');
    input3.setAttribute('id', 'investment');
    input3.setAttribute('name', 'investment');
    // Insert Elements into div container 
    formDiv3.appendChild(label3);
    formDiv3.appendChild(input3);

    // Create submit button 
    let submit = document.createElement('input');
    submit.setAttribute('type', 'submit');


    // Style FormDivs
    let formDivs = [formDiv, formDiv2, formDiv3];
    formDivs.forEach((element, index) => {
        element.classList.add('formDiv')
    })

    // Insert Form into DOM 
    form.appendChild(formDiv);
    form.appendChild(formDiv2);
    form.appendChild(formDiv3);
    form.appendChild(submit)
    dividendContainer.appendChild(form);

    submit.addEventListener('click', (e) => {
        e.preventDefault();

        if (!input2.value) {
            window.alert("Please select a stock with a positive dividiend yield")
        }
        else {
            fetch('/dividend', {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json'
                },
                body:
                    JSON.stringify({
                        symbol: input.value,
                        yield: input2.value,
                        investmentAmount: input3.value
                    })
            })
                .then(response => response.json())
                .then((data) => {
                    form.remove();
                    // Dynamically create table and populate API response
                    let table = document.createElement('table');
                    let tr1 = document.createElement('tr');
                    let th1 = document.createElement('th');
                    th1.textContent = "Investment Amount after 3 years: ";
                    let td1 = document.createElement('td');
                    td1.textContent = String(data[0])
                    tr1.appendChild(th1);
                    tr1.appendChild(td1);

                    let tr2 = document.createElement('tr');
                    let th2 = document.createElement('th');
                    th2.textContent = "Investment Amount after 5 years: ";
                    let td2 = document.createElement('td');
                    td2.textContent = String(data[1])
                    tr2.appendChild(th2);
                    tr2.appendChild(td2);

                    let tr3 = document.createElement('tr');
                    let th3 = document.createElement('th');
                    th3.textContent = "Investment Amount after 10 years: ";
                    let td3 = document.createElement('td');
                    td3.textContent = String(data[2])
                    tr3.appendChild(th3);
                    tr3.appendChild(td3);

                    table.appendChild(tr1);
                    table.appendChild(tr2);
                    table.appendChild(tr3);

                    dividendContainer.appendChild(table);


                })
        }
    })



})