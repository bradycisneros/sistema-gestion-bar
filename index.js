const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());

// --- CONFIGURACIÓN DE RUTAS ESTÁTICAS ---
app.use(express.static(path.join(__dirname, 'public'))); 

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'salon.html'));
});

// Conexión a la base de datos
const db = new sqlite3.Database('./taqueria.db', (err) => {
    if (err) console.error("Error al conectar DB:", err.message);
    console.log('✅ Base de datos conectada.');
});

// --- ESTRUCTURA DE TABLAS ---
const crearTablas = () => {
    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS Categorias (IDCategoria INTEGER PRIMARY KEY AUTOINCREMENT, NombreCategoria TEXT)`);
        db.run(`CREATE TABLE IF NOT EXISTS Productos (IDPlatillo INTEGER PRIMARY KEY AUTOINCREMENT, NombrePlatillo TEXT, Precio REAL, CostoInsumo REAL DEFAULT 0, IDCategoria INTEGER, Stock INTEGER DEFAULT 0, FOREIGN KEY (IDCategoria) REFERENCES Categorias(IDCategoria))`);
        db.run(`CREATE TABLE IF NOT EXISTS Insumos (IDInsumo INTEGER PRIMARY KEY AUTOINCREMENT, NombreInsumo TEXT, StockActual NUMERIC, UnidadMedida TEXT)`);
        db.run(`CREATE TABLE IF NOT EXISTS Recetas (IDReceta INTEGER PRIMARY KEY AUTOINCREMENT, IDPlatillo INTEGER, IDInsumo INTEGER, CantidadRequerida NUMERIC, FOREIGN KEY (IDPlatillo) REFERENCES Productos(IDPlatillo), FOREIGN KEY (IDInsumo) REFERENCES Insumos(IDInsumo))`);
        db.run(`CREATE TABLE IF NOT EXISTS Ordenes (IDOrden INTEGER PRIMARY KEY AUTOINCREMENT, IDMesa INTEGER, MetodoPago TEXT, Tiempo DATETIME DEFAULT CURRENT_TIMESTAMP, Estado TEXT)`);
        db.run(`CREATE TABLE IF NOT EXISTS DetallesOrden (IdDetalleO INTEGER PRIMARY KEY AUTOINCREMENT, IDOrden INTEGER, IDPlatillo INTEGER, Cantidad INTEGER, Personalizacion TEXT, PrecioUnitario REAL, FOREIGN KEY (IDOrden) REFERENCES Ordenes(IDOrden), FOREIGN KEY (IDPlatillo) REFERENCES Productos(IDPlatillo))`);
    });
};
crearTablas();

// --- RUTAS DE API ---

app.get('/menu', (req, res) => {
    db.all("SELECT * FROM Categorias", [], (err, cats) => {
        db.all("SELECT * FROM Productos", [], (err2, prods) => {
            res.json({ categorias: cats, platillos: prods });
        });
    });
});

app.post('/crear-orden', (req, res) => {
    const { IDMesa } = req.body;
    db.run('INSERT INTO Ordenes (IDMesa, Estado) VALUES (?, ?)', [IDMesa, 'en fila'], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ idOrden: this.lastID, idMesa: IDMesa });
    });
});

// AGREGAR PLATILLO: Ahora solo inserta en la comanda sin descontar stock inmediatamente
app.post('/orden/agregar-platillo', (req, res) => {
    const { IDOrden, IDPlatillo, Cantidad, Personalizacion, Precio } = req.body;
    const sqlInsert = 'INSERT INTO DetallesOrden (IDOrden, IDPlatillo, Cantidad, Personalizacion, PrecioUnitario) VALUES (?, ?, ?, ?, ?)';
    
    db.run(sqlInsert, [IDOrden, IDPlatillo, Cantidad, Personalizacion, Precio], function(err) {
        if (err) return res.status(500).send(err.message);
        res.status(201).send('Platillo agregado a la comanda');
    });
});

app.get('/ordenes/activas', (req, res) => {
    db.all("SELECT DISTINCT IDMesa FROM Ordenes WHERE Estado != 'Pagado'", (err, rows) => {
        if (err) return res.status(500).send(err.message);
        res.json(rows.map(r => r.IDMesa));
    });
});

// ACTUALIZAR ESTADO: Aquí ocurre el descuento de inventario si el estado es 'Pagado'
app.put('/orden/:id/estado', (req, res) => {
    const idOrden = req.params.id;
    const { estado, metodoPago } = req.body;

    db.serialize(() => {
        db.run("UPDATE Ordenes SET Estado = ?, MetodoPago = ? WHERE IDOrden = ?", [estado, metodoPago, idOrden], function(err) {
            if (err) return res.status(500).json({ error: err.message });

            // Solo descontamos si la orden se marca como Pagado
            if (estado === 'Pagado') {
                const sqlDetalles = `SELECT IDPlatillo, Cantidad FROM DetallesOrden WHERE IDOrden = ?`;
                
                db.all(sqlDetalles, [idOrden], (err, detalles) => {
                    if (err) return console.error("Error al obtener detalles:", err.message);

                    detalles.forEach((det) => {
                        const sqlReceta = `SELECT IDInsumo, CantidadRequerida FROM Recetas WHERE IDPlatillo = ?`;
                        
                        db.all(sqlReceta, [det.IDPlatillo], (err, receta) => {
                            if (err) return console.error("Error al obtener receta:", err.message);

                            receta.forEach((item) => {
                                const totalADescontar = item.CantidadRequerida * det.Cantidad;
                                db.run(
                                    `UPDATE Insumos SET StockActual = StockActual - ? WHERE IDInsumo = ?`,
                                    [totalADescontar, item.IDInsumo]
                                );
                            });
                        });
                    });
                });
            }
            res.json({ ok: true });
        });
    });
});

app.get('/reporte/completo', (req, res) => {
    const { inicio, fin } = req.query;
    const sqlFinanzas = `SELECT SUM(CASE WHEN o.MetodoPago = 'Efectivo' THEN d.Cantidad * d.PrecioUnitario ELSE 0 END) as totalEfectivo, SUM(CASE WHEN o.MetodoPago = 'Tarjeta' THEN d.Cantidad * d.PrecioUnitario ELSE 0 END) as totalTarjeta, SUM(d.Cantidad * d.PrecioUnitario) - SUM(d.Cantidad * IFNULL(p.CostoInsumo, 0)) as utilidadReal FROM Ordenes o JOIN DetallesOrden d ON o.IDOrden = d.IDOrden JOIN Productos p ON d.IDPlatillo = p.IDPlatillo WHERE o.Estado = 'Pagado' AND date(o.Tiempo) BETWEEN ? AND ?`;
    db.get(sqlFinanzas, [inicio, fin], (err, finanzas) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ finanzas: finanzas || { totalEfectivo: 0, totalTarjeta: 0, utilidadReal: 0 } });
    });
});

// --- INICIO DEL SERVIDOR ---
const PORT = 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log('-------------------------------------------');
    console.log(`🚀 BAR JAIR EN LÍNEA`);
    console.log(`Red Local: http://192.168.1.65:${PORT}`);
    console.log(`Localhost: http://localhost:${PORT}`);
    console.log('-------------------------------------------');
});