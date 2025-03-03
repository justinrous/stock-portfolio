const axios = require('axios');
const db = require('../db/database.js');


let url = "https://www.alphavantage.co/query";
let earningsUrl = "https://earnings-reports.onrender.com/";

function getCurrentDate() {
    /* Gets current date in the format YYYY-MM-DD */
    let date = new Date().toISOString();
    return date.slice(0, 10);

    /*
    let now = new Date();
    let year = String(now.getFullYear());
    let month = String(now.getMonth() + 1).padStart(2, '0');
    let day = String(now.getDate()).padStart(2, '0');
    let weekday = now.getDay();
    let currentDate = year + "-" + month + "-" + day;
    return [currentDate, weekday, year, month, day];
    */
}

async function getStockPrice(ticker) {
    try {
        // Check if today's prices has already been stored to db
        let [date, weekday] = getCurrentDate();

        // Check if it is the weekend
        if (weekday == 0 || weekday == 6) {
            let dbRes = await db.getCurrentStockPrice(ticker);
            if (dbRes) {
                return dbRes;
            }
        }
        else if (weekday != 0 && weekday != 6) {
            let dbRes = await db.getCurrentStockPrice(ticker, date);
            if (dbRes) {
                return dbRes;
            }
        }

        let params = {
            function: "TIME_SERIES_DAILY",
            symbol: ticker,
            outputsize: "compact",
            apikey: "2FWMV39FE2R2V0S4",
        }
        let response = await axios.get(url, { params: params })
        let result = response['data']['Time Series (Daily)'];
        let newResult = Object.entries(result)[0]
        date = newResult[0];
        let stockStats = newResult[1] // Prices object
        let stockArray = [stockStats["1. open"], stockStats["2. high"], stockStats["3. low"], stockStats["4. close"], stockStats["5. volume"]];
        // Round prices to two decimal
        stockArray.forEach((stockPrice, index, arr) => {
            // Parse each price to 2 decimals
            if (index != 4) {
                let x = Number(stockPrice);
                let p = x.toFixed(2);
                let price = Number(p);
                arr[index] = price;
            }
            // Convert float to number type
            else {
                let float = Number(stockPrice);
                arr[index] = float;
            }
        })
        let dbResult = await db.addCurrentStockPrice([ticker, date, stockArray]);
        if (dbResult) {
            return stockArray[0];
        }
        else {
            return "Error adding stock prices to database"
        }
    }

    catch (err) {
        console.log(err)
    }
}



async function getEarnings() {
    try {
        let [date, weekday] = getCurrentDate();
        if (weekday == 6 || weekday == 0) {
            return null;
        }
        // Check if Earnings exist in database
        let earnings = await db.getEarnings(date);
        if (earnings) {
            return earnings;
        }
        else {
            try {
                const response = await axios.post(earningsUrl, { 'date': date })
                if (response.data) {
                    // Send earnings to database
                    let dbEntry = db.addEarnings(response.data);
                    return response.data
                }
                else {
                    return null;
                }
            }
            catch (err) {
                console.log('Error retreiving earnings from API call', err)
                return [];
            }
        }
    }
    catch (err) {
        console.log("unable to get earnings", err)
        return "An error occurred"
    }
}


async function calculateDividendYield({ yield, initialInvestment, reinvest }) {

    let totalDividendIncome = 0;
    let investmentsArray = []; // Array of objects

    for (let year = 1; year < 11; year++) {
        totalDividendIncome += initialInvestment * (yield / 100);

        switch (year) {
            case 3:
                investmentsArray.push(initialInvestment + totalDividendIncome);
                break;
            case 5:
                investmentsArray.push(initialInvestment + totalDividendIncome);
                break;
            case 10:
                investmentsArray.push(initialInvestment + totalDividendIncome)
                break;
            default:
                continue;
        }
    }
    return investmentsArray;

}

exports.getStockPrice = getStockPrice;
exports.getEarnings = getEarnings;
exports.getCurrentDate = getCurrentDate;
exports.calculateDividendYield = calculateDividendYield;