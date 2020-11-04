var express = require('express');
const middleware = require('../modules/middleware');
var router = express.Router();
const utility = require('../modules/utility');
const NepaliDate = require('nepali-date-converter');

/* GET home page. */
router.get('/', middleware.auth.loggedIn(), function(req, res, next) {  
  var data = {
    dependency: 'dashboard.js',
  };
  var flash_message = req.flash('flash_message');
  var flash_color = req.flash('flash_color');  
  if (flash_message.length !== 0 && flash_color.length !== 0) {
    data.flash_message = flash_message;
    data.flash_color = flash_color;
  }

  data.toNepaliDate = (d) => {
    return new NepaliDate(d).format("DD/MM/YYYY", 'np');
  };
  data.toNepaliDateFull = (d) => {
    return new NepaliDate(d).format("ddd, DD MMMM YYYY", 'np');
  };

  
  utility.misc.getStats().then(result => {
    data = {
      ...data,
      ...result
    }
    res.render('dashboard', data);
  }).catch(err => {
    console.log(err);
    req.flash('flash_message', 'Some error occurred while loading the main page. Please try again later');
    req.flash('flash_color', 'danger');
    res.redirect('/billing');
  });
});

module.exports = router;
