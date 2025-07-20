// Mock the `finnhub` module before requiring the script

jest.mock('finnhub', () => {
    const quoteMock = jest.fn();
    const DefaultApi = jest.fn(() => ({
        quote: quoteMock,
        // add other methods you want to mock, e.g. companyBasicFinancials, etc.
    }));
    const ApiClient = {
        instance: {
            authentications: {
                api_key: {}
            }
        }
    };
    return { DefaultApi, ApiClient, __mocks__: { quoteMock } };
});

const stock_script = require('./finnhubApiScript.js');
const { __mocks__ } = require('finnhub');
const quoteMock = __mocks__.quoteMock;

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

    beforeEach(() => {
        quoteMock.mockReset();
    });

    test('resolves with correct stock data', async () => {
        quoteMock.mockImplementation((ticker, cb) => {
            if (ticker === 'AAPL') {
                return cb(null, { c: 200, o: 198, h: 205, l: 195 });
            }
            else {
                return cb(null, { c: null, o: null, h: null, l: null });
            }
        });
        const result = await stock_script.getStockPrice('AAPL');
        expect(result).toEqual([200, 198, 205, 195]);
    });

    test('rejects and returns null on API error', async () => {
        quoteMock.mockImplementation((ticker, cb) => {
            return cb(new Error('API error'), null);
        });
        const result = await stock_script.getStockPrice('invalidTicker');
        expect(result).toBeNull();
    });
});
/*

test('resolves with correct stock data', async () => {
    const stockPrice = { c: 200, o: 198, h: 205, l: 195 };
    mockQuote.mockImplementation((ticker, cb) => {
        cb(null, stockPrice);
    });
    const result = await stock_script.getStockPrice('AAPL');
    expect(result).toEqual([200, 198, 205, 195]);
    expect(mockQuote).toHaveBeenCalled();
});

test('rejects and returns null on API error', async () => {
    mockQuote.mockImplementation((ticker, cb) => {
        cb(new Error('API error'), null);
    });
    const result = await stock_script.getStockPrice('AAPL');
    expect(result).toBeNull();
    expect(mockQuote).toHaveBeenCalled();
});

test('rejects and returns null on data formatting error', async () => {
    // Simulate data that will cause an error in formatting
    const stockPrice = undefined;
    mockQuote.mockImplementation((ticker, cb) => {
        cb(null, stockPrice);
    });
    const result = await stock_script.getStockPrice('AAPL');
    expect(result).toEqual([undefined, undefined, undefined, undefined]);
    expect(mockQuote).toHaveBeenCalled();
}); */

/***********************************
 * Tests for getCurrentDate() function
 *************************************/
describe('Tests for getCurrentDate() function', () => {
    test('returns a string in the format YYYY-MM-DD', () => {
        const result = stock_script.getCurrentDate();
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;  // Regex to match YYYY-MM-DD format
        expect(result).toMatch(dateRegex);
    });
})
