require('dotenv').config();
const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const session = require('express-session');
const flash = require('connect-flash');
const methodOverride = require('method-override');
const errors = require('./modules/errors');
const compression = require('compression');
const helmet = require('helmet');
const fs = require('fs');
const environment = process.env.NODE_ENV || 'development';


const indexRouter = require('./routes/index');
const authRouter = require('./routes/auth');
const customerRouter = require('./routes/customer');
const inventoryRouter = require('./routes/inventory');
const billingRouter = require('./routes/billing');
const recordsRouter = require('./routes/records');
const apiRouter = require('./routes/api');


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
app.use(express.urlencoded({
  extended: false
}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, '/uploads')));
app.use(flash());

// Enforce HTTPS
app.enable('trust proxy');
app.use(function(request, response, next) {
  if (process.env.NODE_ENV != 'development' && !request.secure) {
    return response.redirect("https://" + request.headers.host + request.url);
  }
  next();
});


if (environment === 'production') {  
  app.use(compression());
}
//for PUT and DELETE requests
app.use(methodOverride("_method"));

const db = require('./modules/database');

// Authentication Connection to database;
db.sequelize.authenticate()
  .then(() => {
    console.log("Connected to database successfully");
  })
  .catch(err => {
    console.error("An error occured while connecting ", err);
    process.exit(1);
  });


console.log("Current Environment: ", process.env.ENV);

// Initializing models
const models = require('./models/Models');

// Sync DB
// db.sequelize.sync({
//   force: true
// }).then(() => {
//   require('./modules/seed')(true, false);
//   console.log("Database synchronized");
// }).catch(err => {
//   console.log("Error while synchronizing data: ", err);
// });

global.dbErrorMsg = "Database not responding try again later";
global.cookieOpt = {
  maxAge: 24 * 60 * 60 * 1000,
  httpOnly: true,
};

app.use((req, res, next) => {
  res.locals.first_name = req.session.first_name;
  next();
});

// Delete temp directory and create new one
if (fs.existsSync('uploads/tmp')) {
  fs.rmdirSync('uploads/tmp', {
    recursive: true
  });
}

if (fs.existsSync('uploads')) {
  fs.mkdirSync('uploads/tmp');
} else {
  fs.mkdirSync('uploads');
  fs.mkdirSync('uploads/tmp');
}



app.use('/', indexRouter);
app.use('/auth', authRouter);
app.use('/inventory', inventoryRouter);
app.use('/billing', billingRouter);
app.use('/customer', customerRouter);
app.use('/records', recordsRouter);
app.use('/api', apiRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;