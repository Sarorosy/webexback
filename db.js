var mysql = require('mysql');
var connection = mysql.createPool({
    connectionLimit: 10,
    host: '50.87.148.156',
    user: 'rapidcol_webex',
    password: 'e5_^ki&qOlC3',
    database: 'rapidcol_webex',
    timezone: 'Asia/Kolkata',
});

// Helper to get a connection and execute a query
connection.getConnection((err, connection) => {
    if (err) {
        console.error('Error connecting to the database:', err);
        process.exit(1);
    }
    console.log('Connected to MySQL database');
    connection.release(); // release the connection back to the pool
});

module.exports = connection; 