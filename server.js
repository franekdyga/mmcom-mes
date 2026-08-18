require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');

const app = express();
app.use(express.json()); // Pozwala serwerowi rozumieć dane w formacie JSON

// Konfiguracja połączenia z bazą danych
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

// Test połączenia
pool.connect()
    .then(() => console.log('✅ Połączono z bazą danych PostgreSQL!'))
    .catch(err => console.error('❌ Błąd połączenia z bazą', err.stack));

// Główna ścieżka (Test w przeglądarce)
app.get('/', (req, res) => {
    res.send('Serwer MES Fabryka działa poprawnie!');
});

// Uruchomienie serwera
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Serwer nasłuchuje na porcie http://localhost:${PORT}`);
});