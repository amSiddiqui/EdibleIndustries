require('dotenv').config();
const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const session = require('express-session');
const flash = require('connect-flash');
const methodOverride = require('method-override');


const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');
const authRouter = require('./routes/auth');


const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');


// Create Session
app.use(session({
	secret: 'Exmn3dsaf23S122qfsan58bEXF7Jupke',
	resave: true,
	saveUninitialized: true
}));


app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(flash());

//for PUT and DELETE requests
app.use(methodOverride("_method"));

const db = require('./modules/database');

// Authentication Connection to database;
db.sequelize.authenticate()
    .then(()=>{
        console.log("Connected to database successfully");
    })
    .catch(err => {
        console.error("An error occured while connecting ", err);
});


// Initializing models
const models = require('./models/Models');

// Sync DB
db.sequelize.sync({force: true}).then(() => {
  console.log("Database synchronized");
}).catch(err => {
  console.log("Error while synchronizing data: ", err);
});

global.dbErrorMsg = "Database not responding try again later";
global.cookieOpt = {
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true,
};

app.use((req, res, next) => {
  res.locals.user = req.cookies.user;
  next();
});



app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/auth', authRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
