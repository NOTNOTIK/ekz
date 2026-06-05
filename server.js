const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = 3000;

// Middleware (обязательно!)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
    secret: 'mysecretkey',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 3600000 }
}));

// ============ ФУНКЦИИ ПРОВЕРКИ ============

function isAuth(req, res, next) {
    if (req.session.user) return next();
    res.status(401).json({ error: 'Не авторизован' });
}

function isAdmin(req, res, next) {
    if (req.session.user && req.session.user.is_admin === 1) return next();
    res.status(403).json({ error: 'Доступ запрещен' });
}

// ============ API РОУТЫ ============

// 1. Регистрация
app.post('/api/register', async (req, res) => {
    const { login, password, full_name, phone, email } = req.body;
    
    // Простая валидация
    if (!login || login.length < 6) {
        return res.status(400).json({ error: 'Логин минимум 6 символов' });
    }
    if (!password || password.length < 8) {
        return res.status(400).json({ error: 'Пароль минимум 8 символов' });
    }
    
    try {
        const hash = await bcrypt.hash(password, 10);
        db.run(
            `INSERT INTO users (login, password_hash, full_name, phone, email)
             VALUES (?, ?, ?, ?, ?)`,
            [login, hash, full_name, phone, email],
            function(err) {
                if (err) {
                    res.status(400).json({ error: 'Логин или email уже существуют' });
                } else {
                    res.json({ success: true });
                }
            }
        );
    } catch (err) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// 2. Логин
app.post('/api/login', (req, res) => {
    const { login, password } = req.body;
    
    db.get(`SELECT * FROM users WHERE login = ?`, [login], async (err, user) => {
        if (!user) {
            return res.status(401).json({ error: 'Неверный логин или пароль' });
        }
        
        let isValid = false;
        // Временный хак для админа (пароль: KorokNET)
        if (login === 'Admin' && password === 'Admin') {
            isValid = true;
        } else {
            isValid = await bcrypt.compare(password, user.password_hash);
        }
        
        if (!isValid) {
            return res.status(401).json({ error: 'Неверный логин или пароль' });
        }
        
        req.session.user = {
            id: user.id,
            login: user.login,
            is_admin: user.is_admin
        };
        
        res.json({ success: true, isAdmin: user.is_admin === 1 });
    });
});

// 3. Получить заявки текущего пользователя
app.get('/api/my-applications', isAuth, (req, res) => {
    db.all(
        `SELECT * FROM applications WHERE user_id = ? ORDER BY created_at DESC`,
        [req.session.user.id],
        (err, rows) => {
            if (err) {
                res.status(500).json({ error: 'Ошибка БД' });
            } else {
                res.json(rows);
            }
        }
    );
});

// 4. Создать заявку
app.post('/api/applications', isAuth, (req, res) => {
    const { course_name, start_date, payment_method } = req.body;
    
    if (!course_name || !start_date || !payment_method) {
        return res.status(400).json({ error: 'Все поля обязательны' });
    }
    
    db.run(
        `INSERT INTO applications (user_id, course_name, start_date, payment_method, status)
         VALUES (?, ?, ?, ?, 'Новая')`,
        [req.session.user.id, course_name, start_date, payment_method],
        function(err) {
            if (err) {
                res.status(500).json({ error: 'Ошибка создания' });
            } else {
                res.json({ success: true });
            }
        }
    );
});

// 5. Оставить отзыв
app.post('/api/applications/:id/review', isAuth, (req, res) => {
    const { comment } = req.body;
    const id = req.params.id;
    
    db.run(`UPDATE applications SET comment = ? WHERE id = ? AND user_id = ?`,
        [comment, id, req.session.user.id],
        (err) => {
            if (err) {
                res.status(500).json({ error: 'Ошибка' });
            } else {
                res.json({ success: true });
            }
        }
    );
});

// 6. Админ: все заявки
app.get('/api/admin/applications', isAdmin, (req, res) => {
    db.all(`
        SELECT a.*, u.login, u.full_name, u.email
        FROM applications a
        JOIN users u ON a.user_id = u.id
        ORDER BY a.created_at DESC
    `, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: 'Ошибка БД' });
        } else {
            res.json(rows);
        }
    });
});

// 7. Админ: сменить статус
app.put('/api/admin/applications/:id/status', isAdmin, (req, res) => {
    const { status } = req.body;
    const id = req.params.id;
    
    db.run(`UPDATE applications SET status = ? WHERE id = ?`, [status, id], (err) => {
        if (err) {
            res.status(500).json({ error: 'Ошибка' });
        } else {
            res.json({ success: true });
        }
    });
});

// 8. Логаут
app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// ============ ОТДАЁМ HTML СТРАНИЦЫ ============

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/new-application', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'new-application.html'));
});

// Главная страница
app.get('/', (req, res) => {
    res.redirect('/login');
});

// ============ ЗАПУСК ============

app.listen(PORT, () => {
    console.log(`Сервер запущен: http://localhost:${PORT}`);
});
