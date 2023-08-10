const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const bodyParser = require('body-parser');

const session = require('express-session');
const crypto = require('crypto');

const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

const path = require('path');
const multer = require('multer');
const upload = multer({dest: 'uploads/'});


//Creamos una BaseDatos SQLite para testear
//let db = new sqlite3.Database("database.db");
let db = new sqlite3.Database(':memory:');


//Leemos el secret.txt y manejamos cualquier exepcion.
try {
    process.env["salt"] = fs.readFileSync("secret.txt", "utf-8").trim();
    console.log(process.env.salt);
} catch (err) {
    console.log('Error: ', err);
}

//INICIALIZAMOS BASE DE DATOS CON DATOS DE EJEMPLO -- RUN ONCE ONLY

db.serialize(function() {
    db.run("CREATE TABLE usuarios (email TXT PRIMARY KEY, nombre TEXT, password TEXT)");
    db.run("CREATE TABLE objetos (id_objeto TXT PRIMARY KEY, desc_item TEXT, cantidad INTEGER)");

    //Creamos Usuarios de Ejemplo
    //PASSWORDS: SHA256(PASSWORD + SALT)
    
    db.run("INSERT INTO usuarios VALUES ('admin@admin.cl','Admin Admin','f78ddd9b2cc49c49cc4696552fbc9f422bec0e56a71ea70bb2599b10107a4b5b')");
    db.run("INSERT INTO usuarios VALUES ('user@user.cl','User Usuario','61f5f2fa2e80f96b959b1688d6d3b0b242190daad54226629dc337aaf6ca1ba8')");
})


//Consultamos la DB para probar que existan los registros.
db.all("SELECT * FROM usuarios", (err, rows ) => {
    console.log(rows); 
});

//inicializamos la app con Express
let app = express(); 

//Usaremos el bodyParser.json() para recepcionar/enviar datos en formato JSON
app.use(bodyParser.json());
//Usaremos el bodyParser.json() para recepcionar/enviar datos en formato JSON
app.use(bodyParser.urlencoded({ extended: true }));

//Definimos un directorio con contenido estático; para archivos.
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

//Como usaremos arquetipo MVC, usaremos ejs para renderizar las vistas.
app.set('view engine','ejs');

//Usaremos cookieParser() para poder leer y modificar cookies (de sesión y/o personalizadas)
app.use(cookieParser());

app.use(session({
    secret: process.env.salt,
    resave: false,
    cookie: {secure: false}
}));

//Vista de Login
app.get('/login', (req,res) => {
    res.render("login");
});

//Servicio que se hace cargo del login del usuario
app.post('/login', (req, res) => {

    if (req.session.email) {
        req.session.destroy(err => {
            if(err) {
                console.error("Error destroying session:", err);
                res.status(500).send("Failed to log out");
                return;
            }
            res.redirect('/');
        });
    }

    let email = req.body.email;
    let password = req.body.password;

    let passwordConSalt = password+process.env.salt;
    let hash = crypto.createHash('sha256');
    hash.update(passwordConSalt);
    let hashContrasena = hash.digest('hex');

    // First, check if the email exists
    let sqlCheckEmail = "SELECT * FROM usuarios WHERE email = '" + email +"' AND password = '"+ hashContrasena +"'";

    db.get(sqlCheckEmail, [], (err, row) => {
        if (err) {
            res.send(err.message);
            return;
        }
        if (row) { 
            req.session.email = email;
            res.redirect('/');
        } else {
            res.send("Credenciales Invalidas");
        }
    });
});


app.get('/', (req, res) => {
    res.render('index');
});

app.get('/inventario', asegurarIdentidad, (req, res) => {
    let sql = "SELECT * FROM objetos";
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.send(err,err.message, err.stack)
            return;
        }
        res.render("inventario/index", { objetos: rows });
    });
});

app.get('/inventario/create', asegurarIdentidad, (req, res) => {
    res.render('inventario/create');
});

app.get('/inventario/update', asegurarIdentidad, (req, res) => {
    let sql = "SELECT id_objeto FROM objetos";
    db.all(sql, [], (err, rows) => {
        if (err) {
            throw err;
        }
        res.render('inventario/update', { ids: rows });
    });
});

app.get('/inventario/delete', asegurarIdentidad, (req, res) => {
    let sql = "SELECT id_objeto FROM objetos";
    db.all(sql, [], (err, rows) => {
        if (err) {
            throw err;
        }
        res.render('inventario/delete', { ids: rows });
    });
});

// Handling item creation
app.post('/inventario/create', asegurarIdentidad, (req, res) => {
    let sql = `INSERT INTO objetos (id_objeto, desc_item, cantidad) VALUES ('${req.body.id_objeto}', '${req.body.desc_item}', ${req.body.cantidad})`;
    db.run(sql, function(err) {
        if (err) {
            return res.send(err,err.message, err.stack);
        }
        res.redirect('/inventario');
    });
});

// Handling item update
app.post('/inventario/update', asegurarIdentidad, (req, res) => {
    let sql = `UPDATE objetos SET desc_item = '${req.body.desc_item}', cantidad = ${req.body.cantidad} WHERE id_objeto = '${req.body.id_objeto}'`;
    db.run(sql, function(err) {
        if (err) {
            return res.send(err,err.message, err.stack);
        }
        res.redirect('/inventario');
    });
});

// Handling item deletion
app.post('/inventario/delete', asegurarIdentidad, (req, res) => {
    let sql = `DELETE FROM objetos WHERE id_objeto = '${req.body.id_objeto}'`;
    db.run(sql, function(err) {
        if (err) {
            return res.send(err,err.message, err.stack);
        }
        res.redirect('/inventario');
    });
});

app.get('/logout', asegurarIdentidad, (req, res) => {
    req.session.destroy(err => {
        if(err) {
            console.error("Error destroying session:", err);
            res.status(500).send("Failed to log out");
            return;
        }
        res.redirect('/');
    });
});

//Funcion que permite injectarse para comprobar que un usuario tenga una sesión válida
function asegurarIdentidad(req, res, next) {
    if (req.session.email) {
        return next();
    } else {
        res.redirect('/login');
    }
}

app.listen(9000);



