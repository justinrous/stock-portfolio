# Overview
A financial investment website that can be used to track a portfolio of stock, research financial statistics about individual stocks, current stock news, and more. 

![Statistics Page](https://github.com/justinrous/stock-portfolio/blob/main/public/images/portfolio_manager.JPG)
![Portfolio Page](https://github.com/justinrous/stock-portfolio/blob/main/public/images/portfolio_manager1.JPG)
![Company News](https://github.com/justinrous/stock-portfolio/blob/main/public/images/portfolio_manager2.JPG)


## How it's Made
Full-stack application with the backend built using MySQL database and Node Express server. Mysql2 library used as model logic to interact with the MySQL database. 
Controller logic securely hashes passwords before storing in the database and manages session data using express-session. Renders a front-end using Express Handlebars
and implements a user-friendly frontend using vanilla HTML, CSS, and client-side JavaScript files. 

## Optimizations
Used FinnHub.io API to query stock prices, financial statistics, and news. Cached external API data using in-memory node cache 
which allowed for scalability and quicker response times. 


## Lessons Learned 

### To-do List
- Deploy database and backend to a cloud-hosted platform
- 
  

