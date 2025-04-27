const mysql = require('mysql2');
const bcrypt = require('bcrypt');
require('dotenv').config();
const index = require('../index.js');


// Create a Connection to Database
const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
}).promise()

async function connectToDatabase() {
    try {
        await connection.connect();
        console.log("Connected to the MySQL server.");
    } catch (err) {
        console.error("Error connecting to the database:", err.message);
        process.exit(1); // optional: exit if critical
    }
}
connectToDatabase();


async function addUser(user) {
    /*
        Creates a new user in the database.
        params:
            user: object containing user properties:
                firstName, lastName, email, hashedPassword
        return:
            int: number of affected rows
                0: user not added to database
                1: user added to database
    */
    try {
        let stmt = "INSERT INTO users (firstName, lastName, email, password) VALUES (?, ?, ?, ?)";
        let params = [user.firstName, user.lastName, user.email, user.hashedPassword];
        let [results] = await connection.query(stmt, params);
        console.log("Results: ", results);
        if (results.affectedRows > 0) {
            console.log("User successfully added to database");
            return results.affectedRows
        }
        else {
            console.log("User not added to database");
            return results.affectedRows;
        }
    }
    catch (err) {
        console.log("Error adding user", err);
    }
}

async function compareCreds(email, password) {
    /*
        Compares the given credentials with the database
        params:
            email: user's email
            password: user's password
    */
    try {
        // Retrieve plain text password
        let query = "SELECT password FROM users WHERE email = ?";
        let [[hashedPassword]] = await connection.query(query, [email]);
        hashedPassword = hashedPassword.password;
        let compareResult = await bcrypt.compare(password, hashedPassword);
        return compareResult;
    }
    catch (err) {
        console.log("Error comparing credentials: ", err)
        return false;
    }
}

async function getInitials(email) {
    try {
        let query = "SELECT firstName, lastName FROM users WHERE email = ?";
        let [result] = await connection.query(query, [email]);
        console.log(result);
        if (result.length === 0) {
            console.log("No user found with that email address");
            return null;
        }
        else {
            console.log("User found with that email address");
            let fname = result[0].firstName[0];
            let lname = result[0].lastName[0];
            return fname + lname;
        }
    }
    catch (err) {
        console.log("Error retrieving initials", err);
    }
}

async function getUserId(email) {
    try {
        let query = "SELECT id FROM users WHERE email = ?";
        let [result] = await connection.query(query, [email]); // Returns array of arrays. Destructure to get first element of first array
        if (result.length === 0) {
            console.log("No user found with that email address");
            return 0;
        }
        else {
            console.log("User found with that email address");
            return result[0].id;
        }
    }
    catch (err) {
        console.log("Error retrieving userId from database: ", err)
    }
}

async function getUserPortfolio(id) {
    try {
        let query = "SELECT ticker, quantity FROM holdings WHERE userId = ?";
        let [result] = await connection.query(query, [id]);
        return result;
    }
    catch (err) {
        console.log("Error retrieving portfolio: ", err);
    }
}

async function getUserWatchlist(id) {
    try {
        let query = "SELECT ticker FROM watchlist WHERE userId = ?";
        let [result] = await connection.query(query, [id]);
        return result;
    }
    catch (err) {
        console.log("Error retrieving Watchlist: ", err)
    }
}

async function addStockToPortfolio({ userId, ticker, qty }) {
    try {

        // Check if stock already exists in portfolio

        // If stock exists, update quantity
        // UpdateQuantity()

        let query = "INSERT INTO holdings (userId, ticker, quantity) VALUES (?, ?, ?)"
        let params = [userId, ticker, qty]
        let [result] = await connection.query(query, params);

        // Update portfolio cache
        await index.updatePortfolioCache(userId);
        return result.insertId;
    }
    catch (err) {
        console.log("Error adding stock to portfolio: ", err)
    }
}

async function addStockToWatchList({ userId, ticker }) {
    try {
        let query = "INSERT INTO watchlist (userId, ticker) VALUES (?, ?)";
        let [result] = await connection.query(query, [userId, ticker]);
        if (result.affectedRows > 0) {

            // Update watchlist cache
            await index.updateWatchlistCache(userId);
            return result.affectedRows;
        }
        else {
            return "Query unsuccessful";
        }
        // return result.insertId;
    }
    catch (err) {
        console.log("Error adding stock to watchlist: ", err)
    }
}

async function deleteStockFromPortfolio({ id, ticker }) {
    let query = "DELETE FROM holdings WHERE userId = ? AND ticker = ?"
    let [result] = await connection.query(query, [id, ticker]);

    // Update stock price caching for deleted stock
    await index.updatePortfolioCache(id);

    return result;
}

async function deleteStockFromWatchlist({ id, ticker }) {
    try {
        let query = "DELETE FROM watchlist WHERE userId = ? AND ticker = ?"
        let [result] = await connection.query(query, [id, ticker]);

        // Update stock price caching for deleted stock
        await index.updateWatchlistCache(id);


        return result;
    }
    catch (err) {
        console.log("Error removing stock from watclist: ", err)
    }

}


// currentStockPrice table in database

async function addCurrentStockPrice([ticker, date, stockArray]) {
    try {
        let query = "INSERT INTO stockPrices(ticker, stockDate, openPrice, highPrice, lowPrice, closePrice, volume) VALUES" +
            "(?, ?, ?, ?, ?, ?, ?)"
        let [openPrice, highPrice, lowPrice, closePrice, volume] = stockArray;

        let [result] = await connection.query(query, [ticker, date, openPrice, highPrice, lowPrice, closePrice, volume]);
        if (result.affectedRows > 0) {
            return result.affectedRows;
        }
        else {
            return "Query unsuccessful"
        }
    }
    catch (err) {
        console.log("Error adding stock prices to database", err)
    }
}

async function getCurrentStockPrice(ticker, date = null) {
    try {
        if (date == null) {
            let query = "SELECT openPrice FROM stockPrices WHERE ticker = ?";
            let [[result]] = await connection.query(query, ticker)
            if (result) {
                let price = result["openPrice"];
                return price;
            }
            else {
                return null;
            }
        }
        else {
            let query = "SELECT openPrice FROM stockPrices WHERE ticker = ? AND stockDate = ?";
            let [[result]] = await connection.query(query, [ticker, date])
            if (!result || result.length == 0) {
                return null;
            }
            else {
                let price = result["openPrice"]
                return price;
            }
        }
    }
    catch (err) {
        console.log("Error retrieving stock from database: ", err)
    }

}

async function addEarnings(earnings) {
    try {
        for (let company of earnings) {
            let query = "INSERT INTO earnings (earningsDate, companyName, epsEstimate, revenueEstimate, symbol) VALUES (?, ?, ?, ?, ?)"
            let [result] = await connection.query(query, [company.date, company.companyName, company.epsEstimate, company.revenueEstimate, company.symbol])
            if (result.affectedRows != 1) {
                console.log(`Couldn't add ${earnings.companyName} to database`)
            }
        }
        return result.affectedRows;
    }
    catch (err) {
        console.log("Error adding earnings to db", err);
        return false;
    }
}

async function getEarnings(date) {
    try {
        let query = "SELECT * FROM earnings WHERE earningsDate = ?"
        let [result] = await connection.query(query, [date])
        if (result.length === 0) {
            return null;
        }
        else {
            return result;
        }
    }
    catch (err) {
        console.log("Error retrieving earnings data from database: ", err)
    }
}

exports.addUser = addUser;
exports.compareCreds = compareCreds;
exports.getInitials = getInitials;
exports.addStockToPortfolio = addStockToPortfolio;
exports.addStockToWatchList = addStockToWatchList;
exports.getUserId = getUserId;
exports.getUserPortfolio = getUserPortfolio;
exports.getUserWatchlist = getUserWatchlist;
exports.deleteStockFromPortfolio = deleteStockFromPortfolio;
exports.deleteStockFromWatchlist = deleteStockFromWatchlist;
exports.addCurrentStockPrice = addCurrentStockPrice;
exports.getCurrentStockPrice = getCurrentStockPrice;
exports.addEarnings = addEarnings;
exports.getEarnings = getEarnings;



