const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

const session = require('express-session');
const crypto = require('crypto');

let db = new sqlite3.Database("database.db");

process.env["salt"] = fs.readFileSync("secret.txt", "utf-8").trim();
console.log(process.env.salt);


db.serialize(function() {
    db.run("CREATE TABLE usuarios (email TXT PRIMARY KEY, nombre TEXT, password TEXT)");
    db.run("CREATE TABLE objetos (id_objeto TXT PRIMARY KEY, desc_item TEXT, cantidad INTEGER)");
})


//PASSWORDS:
//PASSWORD + SALT

db.serialize(function() {
    db.run("INSERT INTO usuarios VALUES ('admin@admin.cl','Admin Admin','f78ddd9b2cc49c49cc4696552fbc9f422bec0e56a71ea70bb2599b10107a4b5b')");
    db.run("INSERT INTO usuarios VALUES ('user@user.cl','User Usuario','61f5f2fa2e80f96b959b1688d6d3b0b242190daad54226629dc337aaf6ca1ba8')");
})

db.all("SELECT * FROM usuarios", (err, rows ) => {
    console.log(rows); 
});





