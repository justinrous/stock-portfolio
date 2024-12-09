// Entry point to server

const express = require('express');
const exphbs = require('express-handlebars');
const path = require('path');
const mysql = require('mysql2')
const db = require('./db/database.js');
const session = require('express-session');
const { hash } = require('crypto');
const bcrypt = require('bcrypt');
const stockScripts = require('./stock_scripts/stocks.js');
const { watch, stat } = require('fs');
const axios = require('axios');

const app = express();
const PORT = 5000;
const microserviceAUrl = 'http://127.0.0.1:4200';
const NEWSURL = "http://127.0.0.1:4350/news";
const DIVIDENDURL = "http://127.0.0.1:4600/dividend";


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
    cookie: { secure: false }
}))

// Functions

const saltRounds = 10;

async function hashPassword(password) {
    try {
        let hash = await bcrypt.hash(password, saltRounds);
        return hash;
    }
    catch (err) {
        console.error('Error hashing password: ', err)
    }
}


// Routes

app.get('/', async (req, res) => {

    // Get initials for nav bar login 
    let initials = null;
    let earnings = await stockScripts.getEarnings();
    console.log(earnings)
    if (req.session.email) {
        initials = req.session.initials;
    }

    res.render('home', {
        title: 'Home',
        stylesheet: '/styles/home.css',
        isLoggedIn: req.session.isLoggedIn,
        initials: initials,
        earnings: earnings
    });
})

app.get('/login', (req, res) => {
    res.render('login', { invalidLogin: req.session.invalidLogin, isLoggedIn: req.session.isLoggedIn, stylesheet: "./styles/login.css" })
})

app.post('/login', async (req, res) => {

    // Compare hashed password 

    let compare = await db.compareCreds(req.body.email, req.body.password);

    if (compare) {
        // Set session variables for login 
        req.session.isLoggedIn = true;
        req.session.invalidLogin = false;
        req.session.email = req.body.email;
        req.session.initials = await db.getInitials(req.body.email);
        res.redirect('/')
    }

    else {
        req.session.invalidLogin = true;
        res.redirect('/login')
    }


})

app.get('/register', (req, res) => {
    res.render('register', { title: 'Register', isLoggedIn: req.session.isLoggedIn, stylesheet: './styles/login.css' })
})

app.post('/register', async (req, res) => {
    // Query Database to insert new user 
    // fname, lname, email, hashed_password
    let hashedPassword = await hashPassword(req.body.password);

    let userID = await db.addUser({ fname: req.body.fname, lname: req.body.lname, email: req.body.email, hashedPassword: hashedPassword })

    // Set up session 
    req.session.isLoggedIn = true;
    req.session.email = req.body.email;
    req.session.initials = await db.getInitials(req.body.email);

    res.redirect('/');


})

app.get('/sign-out', (req, res) => {
    // Destroy the session 
    req.session.destroy((err) => {
        if (err) {
            console.error("Error destroyign session:", err);
            return res.redirect('/');
        }
        res.redirect('/')
    })
})

app.get('/portfolio', async (req, res) => {

    let id = null;
    let portfolio = null;
    let watchlist = null;
    let initials = null;
    // For stock in portfolio 
    if (req.session.email) {
        // Get userId
        id = await db.getUserId(req.session.email);
        console.log(`ID: ${id}`)
        // Get user portfolio
        portfolio = await db.getUserPortfolio(id);

        // Get price for each ticker in portfolio
        await (async () => {
            for (let stock of portfolio) {
                let currentPrice = await stockScripts.getStockPrice(stock.ticker);
                stock.currentPrice = currentPrice;
            }
        })();


        watchlist = await db.getUserWatchlist(id);
        console.log("Watchlist: ", watchlist)

        // Get price for each ticker in watchlist
        for (let stock of watchlist) {
            let currentPrice = await stockScripts.getStockPrice(stock.ticker);
            console.log(`Current price: ${currentPrice}`)
            stock.currentPrice = currentPrice;
            console.log("Stock: ", stock)
        }

        initials = await db.getInitials(req.session.email);


    }

    // Render price 
    res.render('portfolio', {
        portfolio: portfolio, watchlist: watchlist, isLoggedIn: req.session.isLoggedIn, stylesheet: './styles/portfolio.css',
        initials: initials
    })
})

app.post('/addStockToPortfolio', async (req, res) => {
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

})

app.post('/addStockToWatchlist', async (req, res) => {
    let userId = await db.getUserId(req.session.email);

    let stock = {
        userId: userId,
        ticker: req.body.ticker
    }

    let watchListId = await db.addStockToWatchList(stock);

    res.redirect('/portfolio');
})

app.delete('/deleteStockFromPortfolio', async (req, res) => {
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
})

app.delete('/deleteStockFromWatchlist', async (req, res) => {
    // Call Delete Method 
    let id = await db.getUserId(req.session.email);
    console.log(id)
    let params = { id: id, ticker: req.body.ticker };
    console.log(params)
    let result = await db.deleteStockFromWatchlist(params);
    if (result.affectedRows == 1) {
        res.json({ success: true, message: "Stock deleted from watchlist" })
    }
    else {
        res.send("Error deleting stock")
    }
})


app.get('/statistics', (req, res) => {

    res.render('statistics', {
        stylesheet: './styles/statistics.css',
        isLoggedIn: req.session.isLoggedIn,
        initials: req.session.initials,
        statistics: null
    })
})

app.post('/statistics', async (req, res) => {

    let ticker = req.body.ticker;
    console.log(ticker)
    let { data } = await axios(microserviceAUrl, {
        'method': 'get',
        'params': { 'symbol': ticker }
    })
    if (res.status == 204) {
        console.log("Error retreiving statistics")
        res.send("Error retreiving statistics")
    }
    else {
        console.log(data)
        res.render('statistics',
            {
                stylesheet: './styles/statistics.css',
                ticker: ticker,
                isLoggedIn: req.session.isLoggedIn,
                initials: req.session.initials,
                "statistics": {
                    peRatio: data.peRatio,
                    eps: data.eps,
                    operatingMargin: data.operatingMargin,
                    salesPerShare: data.salesPerShare,
                    fiftyTwoWeekHigh: data.fiftyTwoWeekHigh,
                    fiftyTwoWeekLow: data.fiftyTwoWeekLow,
                    dividendYield: data.dividendYield,
                    marketCap: data.marketCap,
                    quarterlyRevenueGrowth: data.quarterlyRevenueGrowth
                }
            })
    }
})

function getPreviousDate([date, weekday, year, month, day]) {
    let intMonth = parseInt(month)
    let intYear = parseInt(year)
    let previousMonth = null;
    let previousYear = String(intYear - 1);

    if (intMonth == 1) {
        previousMonth = 12;
        previousYear = parseInt(year) - 1;
        newDate = String(previousYear) + '-' + String(previousMonth) + '-' + '01';
        return newDate;
    }
    else {
        previousMonth = intMonth - 1;
        newDate = year + '-' + String(previousMonth) + '-' + '01';
        return newDate;
    }
}

app.get('/news', (req, res) => {

    let displayData = null;

    res.render('news', {
        stylesheet: './styles/news.css',
        isLoggedIn: req.session.isLoggedIn,
        initials: req.session.initials,
        displayData: displayData
    })
})

app.post('/news', async (req, res) => {
    let symbol = req.body.symbol;

    let [date, weekday, year, month, day] = await stockScripts.getCurrentDate();

    let to = year + '-' + month + '-' + day;
    let from = getPreviousDate([date, weekday, year, month, day])
    console.log(symbol, from, to)


    let newsResponse = await axios.get(NEWSURL, {
        params: {
            symbol: symbol,
            from: from,
            to: to
        }
    })

    // Format response data as a list of first 10 properties
    let data = newsResponse.data;
    let displayData = [];
    for (let i = 0; i < data.length; i++) {
        newsObj = data[i][1];
        displayData.push(newsObj)
    }
    console.log(displayData)



    res.render('news', {
        stylesheet: './styles/news.css',
        ticker: symbol,
        isLoggedIn: req.session.isLoggedIn,
        initials: req.session.initials,
        displayData: displayData
    })

})

app.post('/dividend', async (req, res) => {
    let { symbol, yield, investmentAmount } = req.body;

    yield = parseFloat(yield);
    investmentAmount = parseFloat(investmentAmount);

    try {
        let dividendRes = await axios.post(DIVIDENDURL, {
            yield: yield,
            initialInvestment: investmentAmount
        })
        console.log(dividendRes.data);
        return res.json(dividendRes.data);
    }
    catch (err) {
        console.log(err)
    }
})



app.listen(PORT, () => {
    console.log(`Server is running on port: ${PORT}`);
})