// Mock the `finnhub` module first
jest.mock('finnhub', () => {
    return {
        DefaultApi: jest.fn(() => ({
            quote: jest.fn()
        })),
        ApiClient: {
            instance: {
                authentications: {
                    api_key: {
                        apiKey: 'mocked-api-key'
                    }
                }
            }
        }
    };
});

// const index = require('../index.js');
const stock_script = require('../stock_scripts/finnhubApiScript.js');
const finnhub = require('finnhub');

// FormatNumber() function tests
describe('Tests various functions in formatNumber() function', () => {
    test('formatNumber() with null and undefined input', () => {
        let result = stock_script.formatNumber(null);
        expect(result).toBeNull();
        result = stock_script.formatNumber(undefined);
        expect(result).toBeNull();
    });
    test('formatNumber() with input that is NaN', () => {
        result = stock_script.formatNumber('Zebra');
        expect(result).toBeNull();
    });
    test('formatNumber() with input that is a string with no decimal places', () => {
        result = stock_script.formatNumber('2');
        expect(result).toBe('2');
        result = stock_script.formatNumber('-130005000');
        expect(result).toBe('-130,005,000');
        result = stock_script.formatNumber('1234567890');
        expect(result).toBe('1,234,567,890');
    });

    test('formatNumber() with input that is a string with 1 decimal place', () => {
        result = stock_script.formatNumber('2.5');
        expect(result).toBe('2.50');
        result = stock_script.formatNumber('-2.1');
        expect(result).toBe('-2.10');
        result = stock_script.formatNumber(12.3);
        expect(result).toBe('12.30');
    });
    test('formatNumber() with input that is a string or number with 2 decimal places', () => {
        result = stock_script.formatNumber('2.50');
        expect(result).toBe('2.50');
        result = stock_script.formatNumber('2.00');
        expect(result).toBe('2');
        result = stock_script.formatNumber(1000.50);
        expect(result).toBe('1,000.50');
    });
    test('formatNumber() with input that is a string or number with more than 2 decimal places', () => {
        result = stock_script.formatNumber('123454513.123456789');
        expect(result).toBe('123,454,513.12');
        result = stock_script.formatNumber('123454513.123456789', 4);
        expect(result).toBe('123,454,513.12');
        result = stock_script.formatNumber(123);
        expect(result).toBe('123');
    });
});

// Tests various functions in getStockPrice() function
describe('Tests various functions in getStockPrice() function', () => {
    const stockPrice = { c: 200, o: 198, h: 205, l: 195 };

    test('resolves with correct stock data', async () => {
        // Mock the `quote` method on the DefaultApi instance
        const mockQuote = jest.fn((ticker, cb) => {
            cb(null, stockPrice);  // Simulate success callback with mock data
        });

        // Mock the behavior of the `quote` method on the `finnhub.DefaultApi` instance
        finnhub.DefaultApi.mockImplementation(() => ({
            quote: mockQuote
        }));

        // Call the function under test
        const result = await stock_script.getStockPrice('AAPL');

        // Verify that the function returns the correct data
        expect(result).toEqual([200, 198, 205, 195]);
        expect(mockQuote).toHaveBeenCalled();  // Verify that `quote` was called
    });
});

/***********************************
 * Tests for getCurrentDate() function
 *************************************/
describe('Tests for getCurrentDate() function', () => {
    test('returns a string in the format YYYY-MM-DD', () => {
        const result = stock_script.getCurrentDate();
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;  // Regex to match YYYY-MM-DD format
        expect(result).toMatch(dateRegex);
    });


/***********************************
 * Tests for GetPreviousDate() function
 * ***********************************/

