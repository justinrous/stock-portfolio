const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config();
const index = require('../index.js');


// Create a Connection to Local Database in Development
const pool = mysql.createPool({
    host: process.env.LOCAL_DB_HOST,
    user: process.env.LOCAL_DB_USER,
    password: process.env.LOCAL_DB_PASSWORD,
    database: process.env.LOCAL_DB_NAME,
    port: 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});


/*
// Create a Connection to Database in Production (Google Cloud SQL)
const pool = mysql.createPool({
    socketPath: process.env.INSTANCE_CONNECTION_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
}); */




// Test a connection immediately to confirm the DB is reachable
async function testDatabaseConnection() {
    try {
        const connection = await pool.getConnection();
        console.log("Successfully connected to the MySQL database.");
        connection.release(); // Release it back to the pool
    } catch (err) {
        console.error("Error connecting to the MySQL database:", err);
        process.exit(1);
    }
}

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
        let stmt = "INSERT INTO users (firstName, lastName, email, user_password) VALUES (?, ?, ?, ?)";
        let params = [user.firstName, user.lastName, user.email, user.hashedPassword];
        let [results] = await pool.query(stmt, params);
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
        let query = "SELECT user_password FROM users WHERE email = ?";
        let [[hashedPassword]] = await pool.query(query, [email]);
        hashedPassword = hashedPassword.user_password;
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
        let [result] = await pool.query(query, [email]);
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
        let [result] = await pool.query(query, [email]); // Returns array of arrays. Destructure to get first element of first array
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
        let [result] = await pool.query(query, [id]);
        return result;
    }
    catch (err) {
        console.log("Error retrieving portfolio: ", err);
    }
}

async function getUserWatchlist(id) {
    try {
        let query = "SELECT ticker FROM watchlist WHERE userId = ?";
        let [result] = await pool.query(query, [id]);
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
        let [result] = await pool.query(query, params);

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
        let [result] = await pool.query(query, [userId, ticker]);
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
    let [result] = await pool.query(query, [id, ticker]);

    // Update stock price caching for deleted stock
    await index.updatePortfolioCache(id);

    return result;
}

async function deleteStockFromWatchlist({ id, ticker }) {
    try {
        let query = "DELETE FROM watchlist WHERE userId = ? AND ticker = ?"
        let [result] = await pool.query(query, [id, ticker]);

        // Update stock price caching for deleted stock
        await index.updateWatchlistCache(id);


        return result;
    }
    catch (err) {
        console.log("Error removing stock from watclist: ", err)
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
exports.testDatabaseConnection = testDatabaseConnection;




