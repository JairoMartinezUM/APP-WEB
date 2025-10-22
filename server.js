// backend/server.js
const express = require('express');
const sql = require('mssql');
const cors = require('cors');
const path = require('path');
const MultipleLinearRegression = require('ml-regression-multivariate-linear');

const app = express();
const PORT = 3000;

// === Configuración de SQL Server ===
const config = {
    user: 'Pagina',
    password: '987654321',
    server: 'JAIRO_PC\\JAIRO_MARTINEZ',
    database: 'APP WEB PRUEBAS',
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

// Crear un pool de conexiones para reutilizar
const pool = new sql.ConnectionPool(config);
const poolConnect = pool.connect();

pool.on('error', err => {
    console.error('Error en el pool de SQL Server:', err);
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'frontend'))); // Sirve los archivos desde la carpeta 'frontend'

// === Rutas ===

// Probar conexión
app.get('/api/test', async (req, res) => {
    try {
        await poolConnect; // Asegura que el pool esté conectado
        res.json({ message: 'Conexión a SQL Server exitosa' });
    } catch (err) {
        console.error('Error de conexión:', err);
        res.status(500).json({ error: err.message });
    }
});

// Obtener todos los registros
app.get('/api/registros', async (req, res) => {
    try {
        await poolConnect;
        const result = await pool.request().query`
            SELECT
                c.CarreraID,
                c.NombreCarrera AS Carrera,
                EA.Year AS Año,
                EA.NumeroIngresos AS Ingresos,
                EA.NumeroEgresados AS Egresos
            FROM dbo.EstadisticasAcademicas AS EA
            INNER JOIN dbo.Carreras AS C ON EA.CarreraID = C.CarreraID`;
        res.json(result.recordset);
    } catch (err) {
        console.error('Error al obtener registros:', err);
        res.status(500).json({ error: err.message });
    }
});

// Registrar nuevo dato
app.post('/api/registros', async (req, res) => {
    const { carreraId, año, ingresos, egresos } = req.body;

    if (!carreraId || !año || ingresos == null || egresos == null) {
        return res.status(400).json({ error: 'Todos los campos son requeridos.' });
    }

    try {
        await poolConnect;
        const request = pool.request();
        await request
            .input('carreraId', sql.Int, carreraId)
            .input('año', sql.Int, año)
            .input('ingresos', sql.Int, ingresos)
            .input('egresos', sql.Int, egresos)
            .query`INSERT INTO EstadisticasAcademicas (CarreraID, Year, NumeroIngresos, NumeroEgresados)
                    VALUES (@carreraId, @año, @ingresos, @egresos)`;
        res.status(201).json({ message: 'Registro guardado exitosamente.' });
    } catch (err) {
        console.error('Error al guardar registro:', err);
        if (err.message.includes('UNIQUE constraint')) {
            return res.status(400).json({ error: 'Ya existe un registro para esa carrera y año.' });
        }
        res.status(500).json({ error: err.message });
    }
});

// === Endpoint de Regresión Lineal Múltiple ===
app.post('/api/regresion', (req, res) => {
    try {
        const { x_values, y_values } = req.body;

        // Validaciones
        if (!Array.isArray(x_values) || !Array.isArray(y_values)) {
            return res.status(400).json({ error: 'x_values y y_values deben ser arrays.' });
        }
        if (x_values.length === 0 || y_values.length === 0) {
            return res.status(400).json({ error: 'Los arrays no pueden estar vacíos.' });
        }
        if (x_values.length !== y_values.length) {
            return res.status(400).json({ error: 'x_values y y_values deben tener la misma longitud.' });
        }
        for (let x of x_values) {
            if (!Array.isArray(x) || x.some(val => typeof val !== 'number' || isNaN(val))) {
                return res.status(400).json({ error: 'Cada elemento de x_values debe ser un array de números válidos.' });
            }
        }
        if (y_values.some(val => typeof val !== 'number' || isNaN(val))) {
            return res.status(400).json({ error: 'y_values debe ser un array de números válidos.' });
        }

        // Crear modelo
        const regression = new MultipleLinearRegression(x_values, y_values);

        // Responder
        res.json({
            coefficients: regression.weights,
            rSquared: regression.score(x_values, y_values),
            equation: regression.toString()
        });

    } catch (err) {
        console.error('Error en regresión:', err);
        res.status(500).json({ error: 'Error interno al calcular la regresión: ' + (err.message || err) });
    }
});

// Manejar rutas no encontradas (evita que devuelva HTML)
app.use((req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
});

// Iniciar servidor
app.listen(PORT, async () => {
    try {
        await poolConnect;
        console.log('✅ Pool de conexiones a SQL Server establecido.');
    } catch (err) {
        console.error('❌ No se pudo conectar a la base de datos:', err);
        process.exit(1); // Detiene la aplicación si no se puede conectar a la BD
    }
    console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
    console.log(`📁 Sirviendo archivos desde: ${path.join(__dirname, '..', 'frontend')}`);
});
