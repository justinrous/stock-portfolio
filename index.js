const express = require('express');
const exphbs = require('express-handlebars');
const path = require('path');
const mysql = require('mysql2')
const db = require('./db/database.js');
const session = require('express-session');
const { hash } = require('crypto');
const bcrypt = require('bcrypt');
const stockScript = require('./stock_scripts/stockScript.js');
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

// Functions

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

/************************************************************************************
 ************************      Routes    *******************************************
 **********************************************************************************/

app.get('/', async (req, res) => {

    try {
        let date = stockScript.getCurrentDate();
        let earnings;

        console.log("Current date: ", date);

        // Check if Earnings exist in Redis
        // earnings = await redisDB.getEarnings();
        earnings = cache.get('earnings'); // Check if earnings are in cache

        if (!earnings) {
            // Get earnings from API
            earnings = await finnhubScript.getEarnings('2025-03-28'); // Array of earning objects

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

                // Get company profile for each stock reporting earnings
                /*
                companyProfile = await finnhubScript.getCompanyProfile(earnings[e].symbol);

                if (companyProfile) {
                    earnings[e].name = companyProfile.name;
                } */
                earnings[e].name = "Company Name";
            }
            // Set earnings in node cache

            // Serialize the earnings data to a string before storing it in the cache
            let serializedEarnings = JSON.stringify(earnings);
            cache.set('earnings', serializedEarnings, 3600); // Cache for 1 hour
            console.log("Earnings not in cache, retrieved from API: ", serializedEarnings);
        }
        else {
            earnings = JSON.parse(earnings); // Parse the cached data back to an object
            console.log("Earnings already in cache: ", earnings);
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

/*
// Post route for home page
app.post('/', async (req, res) => {

 } */

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
        res.render('register', { title: 'Register', isLoggedIn: req.session.isLoggedIn, stylesheet: './styles/login.css' })
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
        // Query Database to insert new user
        // fname, lname, email, hashed_password
        let hashedPassword = await hashPassword(req.body.password);

        let userID = await db.addUser({ firstName: req.body.fname, lastName: req.body.lname, email: req.body.email, hashedPassword: hashedPassword })

        // Set up session
        req.session.isLoggedIn = true;
        req.session.email = req.body.email;
        req.session.initials = await db.getInitials(req.body.email);

        res.redirect('/');
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
            // Get user portfolio
            portfolio = await db.getUserPortfolio(id);
            watchlist = await db.getUserWatchlist(id);
            console.log("Portfolio: ", portfolio);
            console.log("Watchlist: ", watchlist);

            // Get stock price for each stock ticker in portfolio
            await (async () => {
                for (let stock of portfolio) {
                    let prices = await finnhubScript.getStockPrice(stock.ticker);
                    console.log(prices);
                    stock.price = finnhubScript.formatNumber(parseFloat(prices[0]));
                    stock.openPrice = finnhubScript.formatNumber(parseFloat(prices[1]));
                    stock.highPrice = finnhubScript.formatNumber(parseFloat(prices[2]));
                    stock.lowPrice = finnhubScript.formatNumber(parseFloat(prices[3]));
                }
            })();

            // Get stock price for each stock ticker in watchlist
            await (async () => {
                for (let stock of watchlist) {
                    let prices = await finnhubScript.getStockPrice(stock.ticker);
                    stock.price = finnhubScript.formatNumber(parseFloat(prices[0]));
                    stock.openPrice = finnhubScript.formatNumber(parseFloat(prices[1]));
                    stock.highPrice = finnhubScript.formatNumber(parseFloat(prices[2]));
                    stock.lowPrice = finnhubScript.formatNumber(parseFloat(prices[3]));
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

        // Insert stock into portfolio
        let stock = {
            userId: userId,
            ticker: req.body.ticker,
            qty: parseInt(req.body.qty)
        };

        let portfolioId = await db.addStockToPortfolio(stock);

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
        let statistics = [];
        let symbol1Stats = await finnhubScript.getBasicFinancials(symbol1);
        symbol1Stats.symbol = symbol1;
        statistics.push(symbol1Stats);

        let symbol2Stats;
        let symbol2;
        if (req.body.symbol2) {
            symbol2 = req.body.symbol2;
            symbol2Stats = await finnhubScript.getBasicFinancials(symbol2);
            symbol2Stats.symbol = symbol2;
            statistics.push(symbol2Stats);
        }

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

        let to = stockScript.getCurrentDate(); // Today's date

        let from = getPreviousDate(to);


        let newsResponse = await finnhubScript.getCompanyNews({
            symbol: symbol,
            from: from,
            to: to
        })

        // Format response data as a list of first 10 properties
        let displayData = [];
        let newsObj;
        for (let i = 0; i < newsResponse.length; i++) {
            newsObj = newsResponse[i][1];
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

app.post('/dividend', async (req, res) => {
    try {
        let { symbol, yield, investmentAmount } = req.body;

        yield = parseFloat(yield);
        investmentAmount = parseFloat(investmentAmount);

        let dividendRes = await stockScript.calculateDividendYield(
            {
                yield: yield,
                initialInvestment: investmentAmount,
                reinvest: false
            })

        return res.json(dividendRes.data);
    }
    catch (err) {
        console.log(err)
    }
})



app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port: ${PORT}`);
})