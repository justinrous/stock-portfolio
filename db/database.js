const mysql = require('mysql2');
const bcrypt = require('bcrypt');


// Create a Connection to Database
const connection = mysql.createConnection({
    host: "127.0.0.1",
    user: "root",
    password: "R00t",
    database: "cs361db"
}).promise()

connection.connect((err) => {
    if (err) {
        return console.log("Error connecting to the database: " + console.error);
    }
    else {
        console.log("Connected to the datbase")
    }
})

async function addUser(user) {
    /*
        Inserts user into database. 
        user: obj
            values: fname, lname, email, password
    */
    try {
        let stmt = "INSERT INTO users (firstName, lastName, email, password) VALUES (?, ?, ?, ?)";
        let params = [user.fname, user.lname, user.email, user.hashedPassword];
        let [results] = await connection.query(stmt, params);
        return results.insertId;
    }
    catch (err) {
        console.log("Error adding user", err);
    }
}

async function compareCreds(email, password) {
    try {
        // Retrieve plain text password
        let query = "SELECT password FROM users WHERE email = ?";
        let [[hashedPassword]] = await connection.query(query, [email]);
        hashedPassword = hashedPassword.password;
        let compareResult = await bcrypt.compare(password, hashedPassword);
        return compareResult;
    }
    catch (err) {

    }
}

async function getInitials(email) {
    try {
        let query = "SELECT firstName, lastName FROM users WHERE email = ?";
        let [[result]] = await connection.query(query, [email])
        let fname = result.firstName[0];
        let lname = result.lastName[0];
        return fname + lname;
    }
    catch (err) {
        console.log("Error retrieving initials", err)
    }
}

async function getUserId(email) {
    try {
        let query = "SELECT id FROM users WHERE email = ?";
        let [[result]] = await connection.query(query, [email]);
        return result.id;
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
        let query = "INSERT INTO holdings (userId, ticker, quantity) VALUES (?, ?, ?)"
        let params = [userId, ticker, qty]
        let [result] = await connection.query(query, params);
        return result.insertId;
    }
    catch (err) {
        console.log("Error adding stock to portfolio: ", err)
    }
}

async function addStockToWatchList({ userId, ticker }) {
    try {
        let query = "INSERT INTO watchlist (userId, ticker) VALUES (?, ?)";
        let [result] = await connection.query(query, [userId, ticker])
        return result.insertId;
    }
    catch (err) {
        console.log("Error adding stock to watchlist: ", err)
    }
}

async function deleteStockFromPortfolio({ id, ticker }) {
    let query = "DELETE FROM holdings WHERE userId = ? AND ticker = ? "
    let [result] = await connection.query(query, [id, ticker])
    return result;
}

async function deleteStockFromWatchlist({ id, ticker }) {
    let query = "DELETE FROM watchlist WHERE userId = ? AND ticker = ? "
    let [result] = await connection.query(query, [id, ticker])
    return result;
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



