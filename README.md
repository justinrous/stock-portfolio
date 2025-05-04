# Overview
A financial investment website that can be used to track a portfolio of stock, research financial statistics about individual stocks, current stock news, and more. 

![Statistics Page](https://github.com/justinrous/stock-portfolio/blob/main/public/images/portfolio_manager.JPG)
![Portfolio Page](https://github.com/justinrous/stock-portfolio/blob/main/public/images/portfolio_manager1.JPG)
![Company News](https://github.com/justinrous/stock-portfolio/blob/main/public/images/portfolio_manager2.JPG)


## How it's Made
This is a full-stack web application built with a Node.js and Express backend. It uses a MySQL database accessed via the mysql2 library, with controller logic that securely hashes user passwords and manages sessions using express-session. The server renders dynamic views with Express Handlebars, while the client-side interface is built with vanilla HTML, CSS, and JavaScript.  

The application also integrates with an external financial API to fetch and display real-time data. To improve performance and reduce redundant API calls, it uses node-cache for in-memory caching. The backend is deployed on Google Cloud, with plans to deploy the frontend to App Engine for a fully cloud-hosted architecture.  

## Optimizations
- Integrated the FinnHub.io API to retrieve stock prices, financial statistics, and market news. Implemented in-memory caching with node-cache to store frequently requested API data, significantly improving response times and reducing the number of external requests—enhancing both scalability and performance.


## Lessons Learned 


### To-do List
- Deploy database and backend to a cloud-hosted platform
- 
  

