const axios = require('axios');
const db = require('../db/database.js');


let url = "https://www.alphavantage.co/query";

function getCurrentDate() {
    let now = new Date();
    let year = String(now.getFullYear());
    let month = String(now.getMonth() + 1).padStart(2, '0');
    let day = String(now.getDate()).padStart(2, '0');
    let weekday = now.getDay();
    let currentDate = year + "-" + month + "-" + day;
    return [currentDate, weekday];
}

async function getStockPrice(ticker) {

    // Check if today's prices has already been stored to db 
    let [date, weekday] = getCurrentDate();

    // Check if it is the weekend
    if (weekday == 0 || weekday == 6) {
        let dbRes = await db.getCurrentStockPrice(ticker);
        console.log("Result from db", dbRes)
        if (dbRes) {
            return dbRes;
        }
    }
    else if (weekday != 0 && weekday != 6) {
        let dbRes = await db.getCurrentStockPrice(ticker, date);
        console.log("Result from db: ", dbRes)
        if (dbRes) {
            return dbRes;
        }
    }

    console.log("Couldn't find it")



    let params = {
        function: "TIME_SERIES_DAILY",
        symbol: ticker,
        outputsize: "compact",
        apikey: "2FWMV39FE2R2V0S4",
    }
    axios.get(url, { params: params })
        .then(async (response) => {
            // let date = getCurrentDate();
            console.log("Api response", response)
            let result = response['data']['Time Series (Daily)'];
            let newResult = Object.entries(result)[0]
            let date = newResult[0];
            let stockStats = newResult[1] // Prices object
            let stockArray = [stockStats["1. open"], stockStats["2. high"], stockStats["3. low"], stockStats["4. close"], stockStats["5. volume"]];
            console.log("REsponse from API ", stockArray)
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
        })
        .catch(err => {
            console.log(err)
        })
}


exports.getStockPrice = getStockPrice;