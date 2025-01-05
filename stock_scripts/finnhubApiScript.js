const finnhub = require('finnhub');
const axios = require('axios')


// Finnhub Client setup
const api_key = finnhub.ApiClient.instance.authentications['api_key'];
api_key.apiKey = 'ct3ti8pr01qlnp2p8bdgct3ti8pr01qlnp2p8be0'
const finnhubClient = new finnhub.DefaultApi()


function formatNumber(num) {
    // Function accepts a number and formats it as a string with commas for readability

    if (!num) {
        return null;
    }

    let formattedString = '';
    let str = String(num);
    let total = str.length - 1;
    let count = 0;

    while (total >= 0) {

        if (count > 2) {
            formattedString = ',' + formattedString;
            formattedString = str[total] + formattedString;
            console.log(formattedString)
            count = 1;
        }
        else {
            formattedString = str[total] + formattedString;
            ++count;
            console.log(formattedString)
        }
        --total;
    }
    return formattedString;
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
                        console.log(quarterly)
                        if (annual) {
                            annualMetrics = {
                                "eps": { "period": annual?.eps?.[0]?.period, "value": annual?.eps?.[0]?.v },
                                "ebitPerShare": { "period": annual?.ebitPerShare?.[0]?.period, "value": annual?.ebitPerShare?.[0]?.v },
                                "ev": { "period": annual?.ev?.[0]?.period, "value": annual?.ev?.[0]?.v },
                                "operatingMargin": { "period": annual?.operatingMargin?.[0]?.period, "value": annual?.operatingMargin?.[0]?.v },
                                "grossMargin": { "period": annual?.grossMargin?.[0]?.period, "value": annual?.grossMargin?.[0]?.v },
                                "bookValue": { "period": annual?.bookValue?.[0]?.period, "value": annual?.bookValue?.[0]?.v },
                                "pb": { "period": annual?.pb?.[0]?.period, "value": annual?.pb?.[0]?.v },
                                "pe": { "period": annual?.pe?.[0]?.period, "value": annual?.pe?.[0]?.v },
                                "ps": { "period": annual?.ps?.[0]?.period, "value": annual?.ps?.[0]?.v },
                                "cashRatio": { "period": annual?.cashRatio?.[0]?.period, "value": annual?.cashRatio?.[0]?.v },
                                "currentRatio": { "period": annual?.currentRatio?.[0]?.period, "value": annual?.currentRatio?.[0]?.v },
                                "quickRatio": { "period": annual?.quickRatio?.[0]?.period, "value": annual?.quickRatio?.[0]?.v },
                                "roa": { "period": annual?.roa?.[0]?.period, "value": annual?.roa?.[0]?.v },
                                "roe": { "period": annual?.roe?.[0]?.period, "value": annual?.roe?.[0]?.v },
                            }
                        }
                        if (quarterly) {
                            quarterlyMetrics = {
                                "eps": { "period": quarterly?.eps?.[0]?.period, "value": quarterly?.eps?.[0]?.v },
                                "ebitPerShare": { "period": quarterly?.ebitPerShare?.[0]?.period, "value": quarterly?.ebitPerShare?.[0]?.v },
                                "ev": { "period": quarterly?.ev?.[0]?.period, "value": quarterly?.ev?.[0]?.v },
                                "operatingMargin": { "period": quarterly?.operatingMargin?.[0]?.period, "value": quarterly?.operatingMargin?.[0]?.v },
                                "grossMargin": { "period": quarterly?.grossMargin?.[0]?.period, "value": quarterly?.grossMargin?.[0]?.v },
                                "bookValue": { "period": quarterly?.bookValue?.[0]?.period, "value": quarterly?.bookValue?.[0]?.v },
                                "pb": { "period": quarterly?.pb?.[0]?.period, "value": quarterly?.pb?.[0]?.v },
                                "pe": { "period": quarterly?.pe?.[0]?.period, "value": quarterly?.peTTM?.[0]?.v },
                                "ps": { "period": quarterly?.ps?.[0]?.period, "value": quarterly?.psTTM?.[0]?.v },
                                "cashRatio": { "period": quarterly?.cashRatio?.[0]?.period, "value": quarterly?.cashRatio?.[0]?.v },
                                "currentRatio": { "period": quarterly?.currentRatio?.[0]?.period, "value": quarterly?.currentRatio?.[0]?.v },
                                "quickRatio": { "period": quarterly?.quickRatio?.[0]?.period, "value": quarterly?.quickRatio?.[0]?.v },
                                "roa": { "period": quarterly?.roa?.[0]?.period, "value": quarterly?.roaTTM?.[0]?.v },
                                "roe": { "period": quarterly?.roe?.[0]?.period, "value": quarterly?.roeTTM?.[0]?.v },
                            }
                        }
                        let stats = {
                            "marketCap": metric?.marketCapitalization,
                            "revenuePerShareAnnual": metric?.revenuePerShareAnnual,
                            "revenuePerShareTTM": metric?.revenuePerShareTTM,
                            "revenueGrowthQuarterlyYoy": metric?.revenueGrowthQuarterlyYoy,
                            "revenueGrowthTTMYoy": metric?.revenueGrowthTTMYoy,
                            "revenueGrowth3Y": metric?.revenueGrowth3Y,
                            "revenueGrowth5Y": metric?.revenueGrowth5Y,
                            "epsAnnual": metric?.epsAnnual,
                            "epsGrowthQuarterlyYoy": metric?.epsGrowthQuarterlyYoy,
                            "epsGrowthTTMYoy": metric?.epsGrowthTTMYoy,
                            "epsGrowth3Y": metric?.epsGrowth3Y,
                            "epsGrowth5Y": metric?.epsGrowth5Y
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
                console.log(error)
                reject(error)
            }
            else {
                console.log("Within news functon")
                let data2 = Object.entries(data);
                let data3 = data2.slice(0, 10);
                console.log(data3)
                resolve(data3)
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

exports.getBasicFinancials = getBasicFinancials;
exports.getCompanyNews = getCompanyNews;
exports.getEarnings = getEarnings;
exports.getCompanyProfile = getCompanyProfile;
exports.formatNumber = formatNumber;

