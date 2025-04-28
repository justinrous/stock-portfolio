// Unit tests for databas.js functions using mock database connection
/*
jest.mock('mysql2');

const db = require('../db/database');
const mysql = require('mysql2');


describe('Database Functions', () => {
    let mockConnection;

    beforeEach(() => {
        mockConnection = {
            query: jest.fn(),
        };
        mysql.createConnection.mockReturnValue(mockConnection);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('addUser should insert a new user into the database', async () => {
        const user = {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            hashedPassword: 'hashedpassword123',
        };

        mockConnection.query.mockResolvedValue(1); // Simulate successful insertion

        const result = await db.addUser(user);

        expect(mockConnection.query).toHaveBeenCalledWith(
            'INSERT INTO users (firstName, lastName, email, password) VALUES (?, ?, ?, ?)',
            [user.firstName, user.lastName, user.email, user.hashedPassword]
        );
        expect(result).toBe(1);
    });

    test('getUserPortfolio should retrieve a user portfolio from the database', async () => {
        const userId = 1;
        const mockPortfolio = [
            { ticker: 'AAPL', quantity: 10 },
            { ticker: 'GOOGL', quantity: 5 },
        ];

        mockConnection.query.mockResolvedValue([mockPortfolio]);

        const portfolio = await db.getUserPortfolio(userId);

        expect(mockConnection.query).toHaveBeenCalledWith(
            'SELECT ticker, quantity FROM holdings WHERE userId = ?',
            [userId]
        );
        expect(portfolio).toEqual(mockPortfolio);
    });

    test('deleteStockFromPortfolio should remove a stock from the user portfolio', async () => {
        const params = { id: 1, ticker: 'AAPL' };

        mockConnection.query.mockResolvedValue([{ affectedRows: 1 }]);

        const result = await db.deleteStockFromPortfolio(params);

        expect(mockConnection.query).toHaveBeenCalledWith(
            'DELETE FROM holdings WHERE userId = ? AND ticker = ?',
            [params.id, params.ticker]
        );
        expect(result.affectedRows).toBe(1);
    });

    test('addStockToWatchList should insert a stock into the user watchlist', async () => {
        const stock = { userId: 1, ticker: 'MSFT' };

        mockConnection.query.mockResolvedValue([{ insertId: 2 }]);

        const watchlistId = await db.addStockToWatchList(stock);

        expect(mockConnection.query).toHaveBeenCalledWith(
            'INSERT INTO watchlist (userId, ticker) VALUES (?, ?)',
            [stock.userId, stock.ticker]
        );
        expect(watchlistId).toBe(2);
    });

    test('getUserWatchlist should retrieve a user watchlist from the database', async () => {
        const userId = 1;
        const mockWatchlist = [
            { ticker: 'AAPL' },
            { ticker: 'GOOGL' },
        ];

        mockConnection.query.mockResolvedValue([mockWatchlist]);

        const watchlist = await db.getUserWatchlist(userId);

        expect(mockConnection.query).toHaveBeenCalledWith(
            'SELECT ticker FROM watchlist WHERE userId = ?',
            [userId]
        );
        expect(watchlist).toEqual(mockWatchlist);
    });
*/