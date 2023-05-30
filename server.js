const express = require("express");
const session = require("express-session");
const path = require("path");
const bodyParser = require("body-parser");
const app = express();
const http = require("http").Server(app);
const io = require("socket.io")(http);
const mysql = require("mysql2");
const crypto = require("crypto-js");
const { request } = require("http");
const { response } = require("express");

let connection = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "Kalleanka.se1+",
    database: "schema",
})

app.use(express.static(path.join(__dirname,"public")));
app.use(bodyParser.urlencoded({extended: false}));
const sessionMiddleware = session({
    secret: "chatapp",
    resave: false,
    saveUninitialized: true,
    cookie: {
      maxAge: 60 * 1000 * 30,
    },
});
app.use(sessionMiddleware);

io.use((socket, next) => {
    sessionMiddleware(socket.request, socket.request.res, next);
});

app.post('/auth', function (request, response) {
    let username = request.body.username;
    let password = request.body.password;

    if (username && password) {
        connection.query('SELECT * FROM accounts WHERE username = ?', [username], function (error, results, fields) {
            if (error) throw error;

            if (results.length > 0) {
                let storedPassword = results[0].password;
                let salt = results[0].salt;

                let saltedPassword = password + salt;
                let hashedPassword = crypto.SHA256(saltedPassword).toString();

                if (hashedPassword === storedPassword) {
                    request.session.loggedin = true;
                    request.session.username = username;
                    response.redirect('/chat.html');
                } else {
                    response.send('Fel användarnamn eller lösenord!');
                }
                response.end();
            } else {
                response.send('Fel användarnamn eller lösenord!');
                response.end();
            }
        });
    } else {
        response.send('Ange både användarnamn och lösenord!');
        response.end();
    }
});


app.post('/reg', function (request, response) {
    let username = request.body.username;
    let password = request.body.password;

    if (username && password) {
        connection.query('SELECT * FROM accounts WHERE username = ?', username, function (error, results, fields) {
            if (error) throw error;

            if (results.length > 0) {
                response.send('Anvädarnamnet används redan');
                response.end();

            } else {
                let salt = crypto.lib.WordArray.random(16).toString();
                let saltedPassword = password + salt;
                let hashedPassword = crypto.SHA256(saltedPassword).toString();

                connection.query(
                    "INSERT INTO accounts (username, password, salt) VALUES (?, ?, ?)",
                    [username, hashedPassword, salt],
                    function (err, result) {
                        if (err) throw err;
                        console.log("Konto skapat");
                    }
                );
                request.session.loggedin = true;
                request.session.username = username;
                response.redirect('/chat.html');
            }
        });
    } else {
        response.send('Ange både användarnamn och lösenord!');
        response.end();
    }
});

app.post('/byt', function (request, response) {
    let username = request.body.username;
    let password = request.body.password;
    let newpassword = request.body.repassword;

    if (username && password) {
        connection.query('SELECT * FROM accounts WHERE username = ?', [username], function (error, results, fields) {
            if (error) throw error;

            if (results.length > 0) {
                let storedPassword = results[0].password;
                let salt = results[0].salt;
                let saltedPassword = password + salt;
                let hashedPassword = crypto.SHA256(saltedPassword).toString();

                if (hashedPassword === storedPassword) {
                    let newSalt = crypto.lib.WordArray.random(16).toString();
                    let saltedNewPassword = newpassword + newSalt;
                    let hashedNewPassword = crypto.SHA256(saltedNewPassword).toString();

                    connection.query('UPDATE accounts SET password = ?, salt = ? WHERE username = ?', [hashedNewPassword, newSalt, username], function (error, results, fields) {
                        if (error) throw error;
                        response.redirect('index.html');
                        response.end();
                    });
                } else {
                    response.send('Fel användarnamn eller lösenord!');
                    response.end();
                }
            } else {
                response.send('Hittade inte användare');
                response.end();
            }
        });
    } else {
        response.send('Ange både användarnamn och lösenord!');
        response.end();
    }
});

app.get("/message-history/:username", (req, res) => {
    const username = req.params.username;
  
    connection.query(
      "SELECT * FROM meddelandelista WHERE name = ?",
      [username],
      (error, results, fields) => {
        if (error) throw error;
        res.send(results);
      }
    );
  });
  

let messages = [
    
]

app.get("/meddelanden", (req, res) => {
    res.send(messages);
})

app.post("/meddelanden", (req, res) => {
    const message = {
        name: req.session.username,
        message: req.body.message
    };
    io.emit("eventmessage", message);

    if (req.session.username !== undefined && message.message !== ""){
        connection.query(
            "INSERT INTO meddelandelista (name, message) VALUES (?, ?)",
            [message.name, message.message],
            function (err, result) {
                if (err) throw err;
                console.log("Message inserted into the database");
            }
        );
        messages.push(message);
    } else {
        console.log("fel")
    }
    res.sendStatus(200);
});

io.on("connection", (socket) => {
    console.log("en använder anslöt");
})

connection.connect(function(err){
    if (err) throw err;
    connection.query("SELECT * FROM meddelandelista", function(err, result, fields){
        if (err) throw err;
        result.forEach(element => {
            messages.push(element)
        },this);
    })
    console.log("Mysql är ansluten")
})

http.listen(3000,() => {
    console.log("servern körs, besök http://localhost:3000");
})