// 1. hasła i porty z pliku .env
require('dotenv').config();

// 2. importy bibliotek
const express = require('express');
const cors = require('cors');
const { getRecipe } = require('./recipes.js');

// 3. tworzenie serwera express
const app = express();

// 4. konfiguracja serwera: CORS i JSON
app.use(cors());
app.use(express.json());

// 4.1 import modułu pg do obsługi bazy danych PostgreSQL
const { Pool } = require('pg');
// 4.2 konfiguracja połączenia z bazą danych (pobierana z .env)
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});
// 4.3 test połączenia z bazą danych
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('Błąd połączenia z bazą danych:', err);
    } else {
        console.log('Połączono z bazą danych. Czas serwera:', res.rows[0].now);
    }
});

// 4.4 inicjalizacja struktury bazy danych
// --- ETAP 3: INICJALIZACJA STRUKTURY BAZY DANYCH (Wersja z 2 magazynami) ---
const initDB = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS orders (
                id SERIAL PRIMARY KEY,
                cabinet_name VARCHAR(255) NOT NULL,
                quantity INTEGER NOT NULL,
                status VARCHAR(50) DEFAULT 'w_trakcie',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // MAGAZYN 1: Surowe formatki (tylko ucięte i oklejone, uniwersalne)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS inventory_formats (
                id SERIAL PRIMARY KEY,
                dimension VARCHAR(50) NOT NULL,
                type VARCHAR(100) NOT NULL,
                color VARCHAR(100) DEFAULT 'DOMYŚLNY',
                quantity INTEGER DEFAULT 0
            );
        `);

        // MAGAZYN 2: Gotowe elementy (nawiercone, dedykowane pod konkretną szafkę)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS inventory_components (
                id SERIAL PRIMARY KEY,
                cabinet_name VARCHAR(255) NOT NULL,
                part_name VARCHAR(255) NOT NULL,
                quantity INTEGER DEFAULT 0
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS elements (
                id SERIAL PRIMARY KEY,
                order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,
                dimension VARCHAR(50),
                is_cut BOOLEAN DEFAULT false,
                is_banded BOOLEAN DEFAULT false,
                is_drilled BOOLEAN DEFAULT false,
                is_washed BOOLEAN DEFAULT false
            );
        `);
        
        console.log('🏗️ Baza gotowa: System dwóch magazynów został wdrożony!');
    } catch (err) {
        console.error('❌ Błąd podczas budowania tabel:', err.message);
    }
};
initDB();


// ENDPOINT do przyjmowania zleceń
// --- ETAP 4: MÓZG BIURA (Zaktualizowany o 2 magazyny) ---
app.post('/api/orders', async (req, res) => {
    const { cabinetName, quantity } = req.body;

    try {
        const orderResult = await pool.query(
            "INSERT INTO orders (cabinet_name, quantity) VALUES ($1, $2) RETURNING id",
            [cabinetName, quantity]
        );
        const orderId = orderResult.rows[0].id;
        console.log(`📦 Zapisano zlecenie nr ${orderId}: ${quantity}x ${cabinetName}`);

        const recipe = getRecipe(cabinetName);

        for (let item of recipe) {
            // 1. Omijanie maszyn dla akcesoriów
            if (item.isHardware) {
                for (let i = 0; i < quantity; i++) {
                    await pool.query(
                        "INSERT INTO elements (order_id, name, dimension, is_cut, is_banded, is_drilled, is_washed) VALUES ($1, $2, $3, true, true, true, true)",
                        [orderId, item.name, item.dimension]
                    );
                }
                continue;
            }

            let needed = quantity; // Ile łącznie potrzebujemy (np. 20)

            // 2. SZUKAMY W MAGAZYNIE GOTOWYCH ELEMENTÓW (Nawiercone, omijają Wiertarkę)
            const compCheck = await pool.query(
                "SELECT id, quantity FROM inventory_components WHERE cabinet_name = $1 AND part_name = $2 AND quantity > 0",
                [cabinetName, item.name]
            );

            if (compCheck.rows.length > 0 && needed > 0) {
                const stock = compCheck.rows[0].quantity;
                const compId = compCheck.rows[0].id;
                let take = Math.min(needed, stock);
                
                await pool.query("UPDATE inventory_components SET quantity = quantity - $1 WHERE id = $2", [take, compId]);
                
                // Generujemy z flagą is_drilled = true (idą prosto na myjnię)
                for (let i = 0; i < take; i++) {
                    await pool.query(
                        "INSERT INTO elements (order_id, name, dimension, is_cut, is_banded, is_drilled, is_washed) VALUES ($1, $2, $3, true, true, true, false)",
                        [orderId, item.name, item.dimension]
                    );
                }
                needed -= take; // Zmniejszamy zapotrzebowanie
            }

            // 3. SZUKAMY W MAGAZYNIE FORMATEK (Uniwersalne 300x230, omijają Piłę, idą na Wiertarkę)
            // Szukamy tylko wtedy, gdy wymiar nie jest "zmienny" i wciąż nam czegoś brakuje
            if (item.dimension !== 'zmienny' && needed > 0) {
                const formCheck = await pool.query(
                    "SELECT id, quantity FROM inventory_formats WHERE dimension = $1 AND type = $2 AND quantity > 0",
                    [item.dimension, item.type]
                );

                if (formCheck.rows.length > 0) {
                    const stock = formCheck.rows[0].quantity;
                    const formId = formCheck.rows[0].id;
                    let take = Math.min(needed, stock);

                    await pool.query("UPDATE inventory_formats SET quantity = quantity - $1 WHERE id = $2", [take, formId]);

                    // Generujemy z flagą is_drilled = false (idą na wiertarkę)
                    for (let i = 0; i < take; i++) {
                        await pool.query(
                            "INSERT INTO elements (order_id, name, dimension, is_cut, is_banded, is_drilled, is_washed) VALUES ($1, $2, $3, true, true, false, false)",
                            [orderId, item.name, item.dimension]
                        );
                    }
                    needed -= take; // Zmniejszamy zapotrzebowanie
                }
            }

            // 4. RESZTA DO PRODUKCJI OD ZERA (Idą na Piłę)
            if (needed > 0) {
                for (let i = 0; i < needed; i++) {
                    await pool.query(
                        "INSERT INTO elements (order_id, name, dimension, is_cut, is_banded, is_drilled, is_washed) VALUES ($1, $2, $3, false, false, false, false)",
                        [orderId, item.name, item.dimension]
                    );
                }
            }
        }

        res.json({ message: "Zlecenie rozdzielone między dwa magazyny i produkcję!", orderId: orderId });
        
    } catch (err) {
        console.error("❌ Błąd podczas tworzenia zlecenia:", err);
        res.status(500).json({ error: "Wystąpił błąd serwera" });
    }
});

// 5. przykładowa trasa API
// app.get('/api/tasks/wiertarka', (req, res) => {
//     res.send('Dziala');
// });

// --- ETAP 5: API DLA TABLETÓW MASZYNOWYCH (Poprawione grupowanie) ---

// 1. POBIERANIE ZADAŃ
app.get('/api/tasks/:machine', async (req, res) => {
    const machine = req.params.machine;

    try {
        let query = '';

        // Teraz KAŻDA maszyna ma dostęp do JOIN, więc widzi nazwę szafki i nazwę części!
        if (machine === 'pila') {
            query = `
                SELECT e.order_id, o.cabinet_name, e.name as part_name, e.dimension, COUNT(*) as quantity 
                FROM elements e
                JOIN orders o ON e.order_id = o.id
                WHERE e.is_cut = false 
                GROUP BY e.order_id, o.cabinet_name, e.name, e.dimension
            `;
        } else if (machine === 'oklejarka') {
            query = `
                SELECT e.order_id, o.cabinet_name, e.name as part_name, e.dimension, COUNT(*) as quantity 
                FROM elements e
                JOIN orders o ON e.order_id = o.id
                WHERE e.is_cut = true AND e.is_banded = false 
                GROUP BY e.order_id, o.cabinet_name, e.name, e.dimension
            `;
        } else if (machine === 'wiertarka') {
            query = `
                SELECT e.order_id, o.cabinet_name, e.name as part_name, e.dimension, COUNT(*) as quantity 
                FROM elements e
                JOIN orders o ON e.order_id = o.id
                WHERE e.is_banded = true AND e.is_drilled = false
                GROUP BY e.order_id, o.cabinet_name, e.name, e.dimension
            `;
        } else if (machine === 'myjnia') {
            query = `
                SELECT e.order_id, o.cabinet_name, e.name as part_name, e.dimension, COUNT(*) as quantity 
                FROM elements e
                JOIN orders o ON e.order_id = o.id
                WHERE e.is_drilled = true AND e.is_washed = false
                GROUP BY e.order_id, o.cabinet_name, e.name, e.dimension
            `;
        } else {
            return res.status(400).json({ error: "Nieznana maszyna" });
        }

        const result = await pool.query(query);
        res.json(result.rows);

    } catch (err) {
        console.error(`❌ Błąd pobierania zadań dla ${machine}:`, err);
        res.status(500).json({ error: "Błąd serwera przy pobieraniu zadań" });
    }
});

// 2. ODKLIKIWANIE ZADAŃ
app.post('/api/tasks/complete', async (req, res) => {
    // Od teraz każdy tablet wysyła komplet danych, abyśmy precyzyjnie oznaczyli deskę
    const { machine, dimension, part_name, order_id } = req.body;

    try {
        let updateQuery = '';
        const params = [dimension, part_name, order_id];

        // Ujednolicone komendy bezpieczeństwa - aktualizujemy TYLKO części z danej partii
        if (machine === 'pila') {
            updateQuery = "UPDATE elements SET is_cut = true WHERE is_cut = false AND dimension = $1 AND name = $2 AND order_id = $3";
        } else if (machine === 'oklejarka') {
            updateQuery = "UPDATE elements SET is_banded = true WHERE is_cut = true AND is_banded = false AND dimension = $1 AND name = $2 AND order_id = $3";
        } else if (machine === 'wiertarka') {
            updateQuery = "UPDATE elements SET is_drilled = true WHERE is_banded = true AND is_drilled = false AND dimension = $1 AND name = $2 AND order_id = $3";
        } else if (machine === 'myjnia') {
            updateQuery = "UPDATE elements SET is_washed = true WHERE is_drilled = true AND is_washed = false AND dimension = $1 AND name = $2 AND order_id = $3";
        }

        const result = await pool.query(updateQuery, params);
        res.json({ message: `✅ Sukces: Zaktualizowano ${result.rowCount} formatek!` });

    } catch (err) {
        console.error("❌ Błąd aktualizacji zadań:", err);
        res.status(500).json({ error: "Błąd serwera przy aktualizacji" });
    }
});

// 6. uruchomienie serwera na porcie z .env lub 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

