const express = require('express');
const exphbs = require('express-handlebars');
const path = require('path');
const mysql = require('mysql2')
const db = require('./db/database.js');
const session = require('express-session');
const { hash } = require('crypto');
const bcrypt = require('bcrypt');
const { watch, stat } = require('fs');
const axios = require('axios');
const finnhubScript = require('./stock_scripts/finnhubApiScript.js');
// const redisDB = require('./db/redisClient.js');
const nodeCache = require('node-cache');

const app = express();
const PORT = 5000;

// Create a cache instance
const cache = new nodeCache({ stdTTL: 3600, checkperiod: 120 });

// Set View Engine
app.engine('hbs', exphbs.engine({ extname: '.hbs' }))
app.set('view engine', '.hbs')
app.set('views', './views')

// Initialize Middleware
app.use(express.static(path.join(__dirname, "public")))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(session({
    secret: "cs361-project-rousj",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, httpOnly: true, sameSite: false }
}))

/*******************************************************************************
 * * Helper Functions
 *******************************************************************************/


async function hashPassword(password) {
    try {
        const saltRounds = 10;
        let hash = await bcrypt.hash(password, saltRounds);
        return hash;
    }
    catch (err) {
        console.error('Error hashing password: ', err)
    }
}

function getPreviousDate(date) {
    /*
    ** This function is used to return a previous data from the month before.
    ** Example: date: 2025-08-25
    ** Return: date: 2025-07-01
    **
    ** Params:
    **      date: String date in the format YYYY-MM-DD
    ** Returns:
    **      new_date: String date from month previous
    */
    try {

        let intMonth = parseInt(date.slice(5, 7));
        let intYear = parseInt(date.slice(0, 4))
        let previousMonth;
        let previousYear;
        let newDate;

        if (intMonth == 1) {
            previousMonth = 12;
            previousYear = parseInt(intYear) - 1;
            newDate = String(previousYear) + '-' + String(previousMonth).padStart(2, "0") + '-' + '01';
        }
        else {
            previousMonth = intMonth - 1;
            newDate = String(intYear) + '-' + String(previousMonth).padStart(2, "0") + '-' + '01';
        }
        return newDate;
    }
    catch (err) {
        console.log(err);
        return false;
    }
}

async function updatePortfolioCache(userId) {
    try {
        let portfolioCacheId = 'portfolio-' + userId; // Create a unique cache ID for each user
        let portfolio = await db.getUserPortfolio(userId);
        // Serialize the portfolio data to a string and store it in the cache
        let serializedPortfolio = JSON.stringify(portfolio);
        cache.set(portfolioCacheId, serializedPortfolio, 3600); // Cache for 2 minutes
    }
    catch (err) {
        console.log("Error updating portfolio cache: ", err)
    }
}

async function updateWatchlistCache(userId) {
    try {
        let watchlistCacheId = 'watchlist-' + userId; // Create a unique cache ID for each user
        let watchlist = await db.getUserWatchlist(userId);
        // Serialize the watchlist data to a string and store it in the cache
        let serializedWatchlist = JSON.stringify(watchlist);
        cache.set(watchlistCacheId, serializedWatchlist, 3600); // Cache for 2 minutes
    }
    catch (err) {
        console.log("Error updating watchlist cache: ", err)
    }
}

async function isValidStock(params) {
    return;
}

/************************************************************************************
 ************************      Routes    *******************************************
 **********************************************************************************/

app.get('/', async (req, res) => {

    try {
        let date = finnhubScript.getCurrentDate();
        let earnings;

        // Check if Earnings exist in Node Cache
        earnings = cache.get('earnings');

        if (!earnings) {
            // Get earnings from API
            earnings = await finnhubScript.getEarnings(date); // Array of earning objects

            // let companyProfile;
            // Get company name for each stock reporting earnings
            for (let e = 0; e < earnings.length; e++) {
                if (earnings[e].epsEstimate != null) {
                    earnings[e].epsEstimate = finnhubScript.formatNumber(earnings[e].epsEstimate);
                }
                if (earnings[e].epsActual != null) {
                    earnings[e].epsActual = finnhubScript.formatNumber(earnings[e].epsActual);
                }
                if (earnings[e].revenueEstimate != null) {
                    earnings[e].revenueEstimate = finnhubScript.formatNumber(earnings[e].revenueEstimate);
                }
                if (earnings[e].revenueActual != null) {
                    earnings[e].revenueActual = finnhubScript.formatNumber(earnings[e].revenueActual);
                }
            }

            // Serialize the earnings data to a string and store it in the cache
            let serializedEarnings = JSON.stringify(earnings);
            cache.set('earnings', serializedEarnings, 3600); // Cache for 1 hour
            console.log("Earnings not in cache, retrieved from API: ", serializedEarnings);
        }
        else {
            earnings = JSON.parse(earnings); // Parse the cached data back to an object
            console.log("Earnings cache hit.");
        }

        res.render('home', {
            title: 'Home',
            stylesheet: '/styles/home.css',
            isLoggedIn: req.session.isLoggedIn,
            initials: req.session.initials,
            earnings: earnings
        });
    }
    catch (err) {
        res.status(500).render('error', {
            message: "Oops! Something went wrong on the server.",
            stylesheet: 'styles/home.css'
        })
    }
})


// Post route for home page
app.post('/', async (req, res) => {
    try {
        console.log("Post request received.");
        let earnings = cache.get('earnings');
        earnings = JSON.parse(earnings); // Parse the cached data back to an object

        // If earnings data is empty, send response to client and return
        if (!earnings || earnings.length === 0) {
            console.log("No earnings data available.");
            res.send("No earnings data available.");
            return;
        }

        // Check if earnings data is available and if the company name is not set
        if (!(earnings[0].name)) {
            let companies = []; // Stores company names for each stock reporting earnings
            let companyProfile;
            for (let i = 0; i < earnings.length; i++) {
                companyProfile = await finnhubScript.getCompanyProfile(earnings[i].symbol);
                if (companyProfile && i < 59) { // Limit API calls to 60
                    earnings[i].name = companyProfile.name;
                    companies.push(companyProfile.name);
                }
                else {
                    break;
                }
            }
            // Set company names in cache
            cache.set('earnings', JSON.stringify(earnings), 3600); // Cache for 1 hour

            res.json(companies); // Send the company names as a response
        }
        else {
            res.send("");
        }

    }
    catch (err) {
        console.log("Error; ", err);
    }
})

app.get('/login', (req, res) => {
    try {
        res.render('login', { invalidLogin: req.session.invalidLogin, isLoggedIn: req.session.isLoggedIn, stylesheet: "./styles/login.css" })
    }
    catch (err) {
        res.status(500).render('error', {
            message: "Oops! Something went wrong on the server.",
            stylesheet: 'styles/home.css'
        })
    }
})

app.post('/login', async (req, res) => {

    try {
        let compare = await db.compareCreds(req.body.email, req.body.password);

        if (compare) {
            // Set session variables for login
            req.session.isLoggedIn = true;
            req.session.invalidLogin = false;
            req.session.email = req.body.email;
            req.session.initials = await db.getInitials(req.body.email);
            res.redirect('/');
        }

        else {
            req.session.invalidLogin = true;
            res.redirect('/login');
        }
    }
    // Compare hashed password
    catch (err) {
        res.status(500).render('error', {
            message: "Oops! Something went wrong on the server.",
            stylesheet: 'styles/home.css'
        })
    }
})

app.get('/register', (req, res) => {
    try {
        res.render('register', { title: 'Register', invalidRegister: req.session.invalidRegister, isLoggedIn: req.session.isLoggedIn, stylesheet: './styles/login.css' })
    }
    catch (err) {
        res.status(500).render('error', {
            message: "Oops! Something went wrong on the server.",
            stylesheet: 'styles/home.css'
        })
    }
})

app.post('/register', async (req, res) => {
    try {

        // Check if user already exists
        let user = await db.getUserId(req.body.email);
        if (user) {
            // User already exists
            req.session.invalidRegister = true;
            console.log("User already exists: ", user);
            res.redirect('/register');
            return;
        }
        else {
            // Query Database to insert new user
            // fname, lname, email, hashed_password
            let hashedPassword = await hashPassword(req.body.password);

            let affectedRows = await db.addUser({ firstName: req.body.fname, lastName: req.body.lname, email: req.body.email, hashedPassword: hashedPassword });
            if (affectedRows == 0) {
                // Unable to add user to database
                req.session.invalidRegister = true;
                res.redirect('/register');
                return;
            }
            else {
                // Set up session
                req.session.isLoggedIn = true;
                req.session.email = req.body.email;
                req.session.initials = await db.getInitials(req.body.email);
                req.session.invalidRegister = false;
            }

            res.redirect('/');
        }
    }
    catch (err) {
        res.status(500).render('error', {
            message: "Oops! Something went wrong on the server and could not register new account.",
            stylesheet: 'styles/home.css'
        })
    }
})

app.get('/sign-out', (req, res) => {
    try {
        // Destroy the session
        req.session.destroy((err) => {
            if (err) {
                console.error("Error destroyign session:", err);
                return res.redirect('/');
            }
            res.redirect('/')
        })
    }
    catch (err) {
        res.status(500).render('error', {
            message: "Oops! Something went wrong on the server.",
            stylesheet: 'styles/home.css'
        })
    }
})

app.get('/portfolio', async (req, res) => {
    try {
        let id = null;
        let portfolio = null;
        let watchlist = null;
        let initials = null;
        // await stockScript.getStockPrice('AAPL'); // Test API call to check if API is working
        // For stock in portfolio
        if (req.session.email) {
            // Get userId
            id = await db.getUserId(req.session.email);
            portfolioCacheId = 'portfolio-' + id; // Create a unique cache ID for each user
            watchlistCacheId = 'watchlist-' + id; // Create a unique cache ID for each user
            // Check if portfolio exists in cache
            portfolio = cache.get(portfolioCacheId);
            if (!portfolio) {
                // Get portfolio from database
                portfolio = await db.getUserPortfolio(id);
                // Serialize the portfolio data to a string and store it in the cache
                let serializedPortfolio = JSON.stringify(portfolio);
                cache.set(portfolioCacheId, serializedPortfolio, 3600); // Cache for 1 hour
            }
            else {
                portfolio = JSON.parse(portfolio); // Parse the cached data back to an object
                console.log("Portfolio cache hit.");
            }
            // Check if watchlist exists in cache
            watchlist = cache.get(watchlistCacheId);
            if (!watchlist) {
                // Get watchlist from database
                watchlist = await db.getUserWatchlist(id);
                // Serialize the watchlist data to a string and store it in the cache
                let serializedWatchlist = JSON.stringify(watchlist);
                cache.set(watchlistCacheId, serializedWatchlist, 3600); // Cache for 1 hour
            }
            else {
                watchlist = JSON.parse(watchlist); // Parse the cached data back to an object
                console.log("Watchlist cache hit.");
            }

            // Get stock price for each stock ticker in portfolio
            await (async () => {
                for (let stock of portfolio) {
                    // Check if stock price is already in cache
                    let stockCacheId = 'stockPrice-' + stock.ticker; // Create a unique cache ID for each stock ticker
                    let stockPrice = cache.get(stockCacheId);
                    if (!stockPrice) {
                        // Get stock price from API
                        stockPrice = await finnhubScript.getStockPrice(stock.ticker);
                        if (!stockPrice) {
                            stockPrice = stockPrice[0]; // Get the first element of the array
                        }
                        // Serialize the stock price data to a string and store it in the cache
                        let serializedStockPrice = JSON.stringify(stockPrice);
                        cache.set(stockCacheId, serializedStockPrice, 120); // Cache for 2 minutes
                    }
                    else {
                        stockPrice = JSON.parse(stockPrice); // Parse the cached data back to an object
                        console.log("Stock price cache hit.");
                    }
                    // Set stock price in portfolio object
                    stock.price = finnhubScript.formatNumber(parseFloat(stockPrice[0]));
                    stock.openPrice = finnhubScript.formatNumber(parseFloat(stockPrice[1]));
                    stock.highPrice = finnhubScript.formatNumber(parseFloat(stockPrice[2]));
                    stock.lowPrice = finnhubScript.formatNumber(parseFloat(stockPrice[3]));
                }
            })();

            // Get stock price for each stock ticker in watchlist
            await (async () => {
                for (let stock of watchlist) {
                    // Check if stock price is already in cache
                    let stockCacheId = 'stockPrice-' + stock.ticker; // Create a unique cache ID for each stock ticker
                    let stockPrice = cache.get(stockCacheId);
                    if (!stockPrice) {
                        // Get stock price from API
                        stockPrice = await finnhubScript.getStockPrice(stock.ticker);
                        // Serialize the stock price data to a string and store it in the cache
                        let serializedStockPrice = JSON.stringify(stockPrice);
                        cache.set(stockCacheId, serializedStockPrice, 120); // Cache for 2 minutes
                    }
                    else {
                        stockPrice = JSON.parse(stockPrice); // Parse the cached data back to an object
                        console.log("Stock price cache hit.");
                    }
                    // Set stock price in watchlist object
                    stock.price = finnhubScript.formatNumber(parseFloat(stockPrice[0]));
                    stock.openPrice = finnhubScript.formatNumber(parseFloat(stockPrice[1]));
                    stock.highPrice = finnhubScript.formatNumber(parseFloat(stockPrice[2]));
                    stock.lowPrice = finnhubScript.formatNumber(parseFloat(stockPrice[3]));
                }
            })();

            initials = await db.getInitials(req.session.email);
        }

        // Render price
        res.render('portfolio', {
            portfolio: portfolio, watchlist: watchlist, isLoggedIn: req.session.isLoggedIn, stylesheet: './styles/portfolio.css',
            initials: initials
        })
    }
    catch (err) {
        res.status(500).render('error', {
            message: "Oops! Something went wrong on the server.",
            stylesheet: 'styles/home.css'
        })
    }
})

app.post('/addStockToPortfolio', async (req, res) => {
    try {
        // Get User ID from database
        let userId = await db.getUserId(req.session.email);

        // Check if stock already in user's portfolio

        // Verify stock ticker is valid

        // Insert stock into portfolio
        let stock = {
            userId: userId,
            ticker: req.body.ticker,
            qty: parseInt(req.body.qty)
        };

        let portfolioId = await db.addStockToPortfolio(stock);
        console.log("Portfolio ID: ", portfolioId);

        // Redirect to portfolio
        res.redirect('/portfolio')
    }
    catch (err) {
        console.log('Error adding stock to portfolio: ', err);
        return false;
    }

})

app.post('/addStockToWatchlist', async (req, res) => {
    try {
        let userId = await db.getUserId(req.session.email);

        // Check if stock already in user's portfolio

        // Verify stock ticker is valid

        let stock = {
            userId: userId,
            ticker: req.body.ticker
        }

        let watchListId = await db.addStockToWatchList(stock);

        res.redirect('/portfolio');
    }
    catch (err) {
        console.log('Error adding stock to watchlist: ', err);
        return false;
    }
})

app.delete('/deleteStockFromPortfolio', async (req, res) => {
    try {
        // Call Delete Method
        let id = await db.getUserId(req.session.email);
        let params = { id: id, ticker: req.body.ticker };
        let result = await db.deleteStockFromPortfolio(params);
        if (result.affectedRows == 1) {
            res.json({ success: true, message: "Stock deleted from portfolio" })
        }
        else {
            res.send("Error deleting stock")
        }
    }
    catch (err) {
        console.log('Error deleting stock from portfolio: ', err);
        return false;
    }

})

app.delete('/deleteStockFromWatchlist', async (req, res) => {
    try {
        // Call Delete Method
        let id = await db.getUserId(req.session.email);
        let params = { id: id, ticker: req.body.ticker };
        let result = await db.deleteStockFromWatchlist(params);
        if (result.affectedRows == 1) {
            res.json({ success: true, message: "Stock deleted from watchlist" })
        }
        else {
            res.send("Error deleting stock")
        }
    }
    catch (err) {
        console.log('Error deleting stock from watchlist: ', err);
        return false;
    }
})


app.get('/statistics', (req, res) => {
    try {
        res.render('statistics', {
            stylesheet: './styles/statistics.css',
            isLoggedIn: req.session.isLoggedIn,
            initials: req.session.initials,
            statistics: []
        })
    }
    catch (err) {
        res.status(500).render('error', {
            message: "Oops! Something went wrong on the server.",
            stylesheet: 'styles/home.css'
        })
    }
})

app.post('/statistics', async (req, res) => {

    try {
        let symbol1 = req.body.symbol1;
        let statistics = []; // Array to store statistics for each symbol
        let cacheId = 'statistics-' + symbol1; // Create a unique cache ID for each symbol
        let symbol1Stats = cache.get(cacheId); // Check if statistics exist in cache
        if (!symbol1Stats) {
            // Get statistics from API
            symbol1Stats = await finnhubScript.getBasicFinancials(symbol1);
            symbol1Stats.symbol = symbol1;
            // Serialize the statistics data to a string and store it in the cache
            let serializedStatistics = JSON.stringify(symbol1Stats);
            cache.set(cacheId, serializedStatistics, 3600); // Cache for 1 hour
        }
        else {
            console.log("Statistics cache hit.");
            symbol1Stats = JSON.parse(symbol1Stats); // Parse the cached data back to an object
        }
        statistics.push(symbol1Stats);

        let symbol2Stats;
        let symbol2;
        if (req.body.symbol2) {
            symbol2 = req.body.symbol2;
            let cacheId = 'statistics-' + symbol2; // Create a unique cache ID for each symbol
            symbol2Stats = cache.get(cacheId); // Check if statistics exist in cache
            if (!symbol2Stats) {
                // Get statistics from API
                symbol2Stats = await finnhubScript.getBasicFinancials(symbol2);
                symbol2Stats.symbol = symbol2;
                // Serialize the statistics data to a string and store it in the cache
                let serializedStatistics = JSON.stringify(symbol2Stats);
                cache.set(cacheId, serializedStatistics, 3600); // Cache for 1 hour
            }
            else {
                console.log("Statistics cache hit.");
                symbol2Stats = JSON.parse(symbol2Stats); // Parse the cached data back to an object
            }
            statistics.push(symbol2Stats);
        }
        // console.log("Symbol1 Market Cap: ", symbol1Stats.stats.marketCap);

        res.render('statistics',
            {
                stylesheet: './styles/statistics.css',
                isLoggedIn: req.session.isLoggedIn,
                initials: req.session.initials,
                statistics: statistics
            })
    }
    catch (err) {
        res.status(500).render('error', {
            message: "Oops! Something went wrong on the server.",
            stylesheet: 'styles/home.css'
        })
    }
})

app.get('/news', (req, res) => {
    try {
        let displayData = null;

        res.render('news', {
            stylesheet: './styles/news.css',
            isLoggedIn: req.session.isLoggedIn,
            initials: req.session.initials,
            displayData: displayData
        })
    }
    catch (err) {
        res.status(500).render('error', {
            message: "Oops! Something went wrong on the server.",
            stylesheet: 'styles/home.css'
        })
    }
})

app.post('/news', async (req, res) => {
    try {
        let symbol = req.body.symbol;
        let to = finnhubScript.getCurrentDate(); // Today's date
        let from = getPreviousDate(to);
        cacheId = 'companyNews-' + symbol; // Create a unique cache ID for each symbol

        let companyNews = cache.get(cacheId);
        if (!companyNews) {
            companyNews = await finnhubScript.getCompanyNews({
                symbol: symbol,
                from: from,
                to: to
            });
            // Serialize the company news data to a string and store it in the cache
            let serializedCompanyNews = JSON.stringify(companyNews);
            cache.set('companyNews', serializedCompanyNews, 3600); // Cache for 1 hour
        }
        else {
            console.log("Company news cache hit.");
            companyNews = JSON.parse(companyNews); // Parse the cached data back to an object
        }

        /*********************************************************************************
        // API returns an array of arrays. Code loops through each array and extracts the news object.
        // News Object properties include:
            - category
            - datetime
            - headline
            - id
            - image
            - related
            - source
            - summary
        *********************************************************************************/

        let displayData = [];
        let newsObj;
        for (let i = 0; i < companyNews.length; i++) {
            newsObj = companyNews[i][1];
            displayData.push(newsObj)
        }

        res.render('news', {
            stylesheet: './styles/news.css',
            ticker: symbol,
            isLoggedIn: req.session.isLoggedIn,
            initials: req.session.initials,
            displayData: displayData
        })
    }
    catch (err) {
        res.status(500).render('error', {
            message: "Oops! Something went wrong on the server.",
            stylesheet: 'styles/home.css'
        })
    }

})

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port: ${PORT}`);
})

exports.updatePortfolioCache = updatePortfolioCache;
exports.updateWatchlistCache = updateWatchlistCache;

