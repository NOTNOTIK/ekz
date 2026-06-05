const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'app.db'), (err) => {
    if (err) {
        console.error('Ошибка подключения:', err.message);
    } else {
        console.log('Подключено к БД');
    }
});

module.exports = db;
