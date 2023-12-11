// This file should set up the express server as shown in the lecture code
import express from 'express';
const app = express();
import session from 'express-session';
import configRoutes from './routes/index.js';
import {fileURLToPath} from 'url';
import {dirname} from 'path';
import exphbs from 'express-handlebars';
import {dbConnection} from "./config/mongoConnection.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const staticDir = express.static(__dirname + '/public');

const db = await dbConnection();

const rewriteUnsupportedBrowserMethods = (req, res, next) => {
    // If the user posts to the server with a property called _method, rewrite the request's method
    // To be that method; so if they post _method=PUT you can now allow browsers to POST to a route that gets
    // rewritten in this middleware to a PUT route
    if (req.body && req.body._method) {
        req.method = req.body._method;
        delete req.body._method;
    }

    // let the next middleware run:
    next();
};

app.use('/public', staticDir);
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(rewriteUnsupportedBrowserMethods);

app.use(
    session({
        name: 'Jukeboxd',
        secret: 'some secret string!',
        saveUninitialized: false,
        resave: false,
        // TODO: REMOVE THIS
        user: true
    })
)


// MIDDLEWARE FOR USER AUTH
// app.get('/', (req, res, next) => {
//     const user = req.session.user;
//     // const ts = new Date().toUTCString();
//     // const usertype = user === undefined ? "Non-Authenticated User" : "Authenticated User";
//     // console.log(`[${ts}]: ${req.method} ${req.originalUrl} (${usertype})`)
//
//     const authenticated = user !== undefined;
//
//     if (authenticated)
//         return res.redirect('/posts');
//
//     if (req.originalUrl === '/login' || req.originalUrl === '/register')
//         return next();
//     else
//         return res.redirect('/login');
//
// });

// app.get('/login', (req, res, next) => {
//     // if (req.method !== 'GET') return next();
//     const user = req.session.user;
//     const authenticated = user !== undefined;
//     if (authenticated)
//         return res.redirect('/posts');
//     next();
// });


// app.get('/register', (req, res, next) => {
//     // if (req.method !== 'GET') return next();
//     const user = req.session.user;
//     const authenticated = user !== undefined;
//     if (authenticated)
//         return res.redirect('/posts');
//     next();
// });


// app.get('/logout', (req, res, next) => {
//     // if (req.method !== 'GET') return next();
//     const user = req.session.user;
//     const authenticated = user !== undefined;
//
//     if (!authenticated)
//         return res.redirect('/login');
//
//     next();
// });


app.engine('handlebars', exphbs.engine({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');

configRoutes(app);
app.listen(3000, () => {
    console.log("Jukeboxd is up and running!");
    console.log('Your routes will be running on http://localhost:3000');
});
