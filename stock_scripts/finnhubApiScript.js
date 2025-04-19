const finnhub = require('finnhub');
const axios = require('axios');
require('dotenv').config();


// Finnhub Client setup
const api_key = finnhub.ApiClient.instance.authentications['api_key'];
api_key.apiKey = process.env.FINNHUB_API_KEY;
const finnhubClient = new finnhub.DefaultApi();


function formatNumber(num) {
    // Function accepts a number and formats it as a string with commas for readability
    if (num == null) {
        return null;
    }
    else {
        return num.toLocaleString('en-US', {
            style: 'decimal',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        });
    }
}

async function getStockPrice(ticker) {
    /*
    *** Get stock price from Alpha Vantage API
    ** returns:
    **      - Array of stock prices [open, high, low, close, volume]
    */

    try {
        return new Promise((resolve, reject) => {
            finnhubClient.quote(ticker, (err, data, response) => {
                if (err) {
                    console.log("Error with API call: ", error);
                    reject(false);
                }
                else {
                    try {
                        let stockPrice = data?.c;
                        let openPrice = data?.o;
                        let highPrice = data?.h;
                        let lowPrice = data?.l;
                        resolve([stockPrice, openPrice, highPrice, lowPrice]);
                    }
                    catch (err) {
                        console.log("Error formatting data: ", err);
                        reject(false);
                    }
                }
            })
        })
    }
    catch (err) {
        console.log(err);
        return null;
    }
}


async function getBasicFinancials(symbol) {
    try {
        return new Promise((resolve, reject) => {
            finnhubClient.companyBasicFinancials(symbol, 'all', (err, data, response) => {
                if (err) {
                    console.log("Error with API call: ", err)
                    reject(false);
                }
                else {
                    try {
                        let annual = data?.series?.annual;
                        let quarterly = data?.series?.quarterly;
                        let metric = data?.metric;
                        let annualMetrics, quarterlyMetrics;
                        // console.log("Market Cap: ", metric?.marketCapitalization);
                        if (annual) {
                            annualMetrics = {
                                "eps": { "period": annual?.eps?.[0]?.period, "value": formatNumber(annual?.eps?.[0]?.v) },
                                "ebitPerShare": { "period": annual?.ebitPerShare?.[0]?.period, "value": formatNumber(annual?.ebitPerShare?.[0]?.v) },
                                "ev": { "period": annual?.ev?.[0]?.period, "value": formatNumber(annual?.ev?.[0]?.v * 1000000) },
                                "operatingMargin": { "period": annual?.operatingMargin?.[0]?.period, "value": formatNumber(annual?.operatingMargin?.[0]?.v) },
                                "grossMargin": { "period": annual?.grossMargin?.[0]?.period, "value": formatNumber(annual?.grossMargin?.[0]?.v) },
                                "bookValue": { "period": annual?.bookValue?.[0]?.period, "value": formatNumber(annual?.bookValue?.[0]?.v) },
                                "pb": { "period": annual?.pb?.[0]?.period, "value": formatNumber(annual?.pb?.[0]?.v) },
                                "pe": { "period": annual?.pe?.[0]?.period, "value": formatNumber(annual?.pe?.[0]?.v) },
                                "ps": { "period": annual?.ps?.[0]?.period, "value": formatNumber(annual?.ps?.[0]?.v) },
                                "cashRatio": { "period": annual?.cashRatio?.[0]?.period, "value": formatNumber(annual?.cashRatio?.[0]?.v) },
                                "currentRatio": { "period": annual?.currentRatio?.[0]?.period, "value": formatNumber(annual?.currentRatio?.[0]?.v) },
                                "quickRatio": { "period": annual?.quickRatio?.[0]?.period, "value": formatNumber(annual?.quickRatio?.[0]?.v) },
                                "roa": { "period": annual?.roa?.[0]?.period, "value": formatNumber(annual?.roa?.[0]?.v * 100) },
                                "roe": { "period": annual?.roe?.[0]?.period, "value": formatNumber(annual?.roe?.[0]?.v * 100) },
                            }
                        }
                        if (quarterly) {
                            quarterlyMetrics = {
                                "eps": { "period": quarterly?.eps?.[0]?.period, "value": formatNumber(quarterly?.eps?.[0]?.v) },
                                "ebitPerShare": { "period": quarterly?.ebitPerShare?.[0]?.period, "value": formatNumber(quarterly?.ebitPerShare?.[0]?.v) },
                                "ev": { "period": quarterly?.ev?.[0]?.period, "value": formatNumber(quarterly?.ev?.[0]?.v * 1000000) },
                                "operatingMargin": { "period": quarterly?.operatingMargin?.[0]?.period, "value": formatNumber(quarterly?.operatingMargin?.[0]?.v) },
                                "grossMargin": { "period": quarterly?.grossMargin?.[0]?.period, "value": formatNumber(quarterly?.grossMargin?.[0]?.v) },
                                "bookValue": { "period": quarterly?.bookValue?.[0]?.period, "value": formatNumber(quarterly?.bookValue?.[0]?.v) },
                                "pb": { "period": quarterly?.pb?.[0]?.period, "value": formatNumber(quarterly?.pb?.[0]?.v) },
                                "pe": { "period": quarterly?.pe?.[0]?.period, "value": formatNumber(quarterly?.peTTM?.[0]?.v) },
                                "ps": { "period": quarterly?.ps?.[0]?.period, "value": formatNumber(quarterly?.psTTM?.[0]?.v) },
                                "cashRatio": { "period": quarterly?.cashRatio?.[0]?.period, "value": formatNumber(quarterly?.cashRatio?.[0]?.v) },
                                "currentRatio": { "period": quarterly?.currentRatio?.[0]?.period, "value": formatNumber(quarterly?.currentRatio?.[0]?.v) },
                                "quickRatio": { "period": quarterly?.quickRatio?.[0]?.period, "value": formatNumber(quarterly?.quickRatio?.[0]?.v) },
                                "roa": { "period": quarterly?.roa?.[0]?.period, "value": formatNumber(quarterly?.roaTTM?.[0]?.v * 100) },
                                "roe": { "period": quarterly?.roe?.[0]?.period, "value": formatNumber(quarterly?.roeTTM?.[0]?.v * 100) },
                            }
                        }
                        let stats = {
                            "marketCap": formatNumber(metric?.marketCapitalization * 1000000),
                            "revenuePerShareAnnual": formatNumber(metric?.revenuePerShareAnnual),
                            "revenuePerShareTTM": formatNumber(metric?.revenuePerShareTTM),
                            "revenueGrowthQuarterlyYoy": formatNumber(metric?.revenueGrowthQuarterlyYoy),
                            "revenueGrowthTTMYoy": formatNumber(metric?.revenueGrowthTTMYoy),
                            "revenueGrowth3Y": formatNumber(metric?.revenueGrowth3Y),
                            "revenueGrowth5Y": formatNumber(metric?.revenueGrowth5Y),
                            "epsAnnual": formatNumber(metric?.epsAnnual),
                            "epsGrowthQuarterlyYoy": formatNumber(metric?.epsGrowthQuarterlyYoy),
                            "epsGrowthTTMYoy": formatNumber(metric?.epsGrowthTTMYoy),
                            "epsGrowth3Y": formatNumber(metric?.epsGrowth3Y),
                            "epsGrowth5Y": formatNumber(metric?.epsGrowth5Y)
                        }

                        resolve({
                            "annual": annualMetrics,
                            "quarterly": quarterlyMetrics,
                            "stats": stats
                        });
                    }
                    catch (err) {
                        console.log("Error formatting data: ", err);
                        reject(false);
                    }
                }
            })
        })

    }
    catch (err) {
        let message = "Error retrieving the statistics";
        console.log(message, err);
        return message;
    }
}


async function getCompanyNews({ symbol, from, to }) {

    return new Promise((resolve, reject) => {
        finnhubClient.companyNews(symbol, from, to, (error, data, response) => {
            if (error) {
                console.log(error);
                reject(error);
            }
            else {
                let data2 = Object.entries(data);
                let data3 = data2.slice(0, 10);
                resolve(data3);
            }
        })
    })
}


async function getEarnings(date) {
    return new Promise((resolve, reject) => {
        finnhubClient.earningsCalendar({ "from": date, "to": date }, (error, data, response) => {
            if (error) {
                reject(error);
            }
            else {
                console.log(data.earningsCalendar)
                resolve(data.earningsCalendar);
            }
        })
    })
}


async function getCompanyProfile(symbol) {
    return new Promise((resolve, reject) => {
        finnhubClient.companyProfile2({ 'symbol': symbol }, (error, data, response) => {
            if (error) {
                reject(error);
            }
            else {
                resolve(data);
            }
        })
    })
}

function getCurrentDate() {
    /* Gets current date in the format YYYY-MM-DD */
    let date = new Date().toISOString();
    return date.slice(0, 10);
}

exports.getBasicFinancials = getBasicFinancials;
exports.getCompanyNews = getCompanyNews;
exports.getEarnings = getEarnings;
exports.getCompanyProfile = getCompanyProfile;
exports.formatNumber = formatNumber;
exports.getStockPrice = getStockPrice;
exports.getCurrentDate = getCurrentDate;


