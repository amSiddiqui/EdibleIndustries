var express = require('express');
const middleware = require('../modules/middleware');
var router = express.Router();
const utility = require('../modules/utility');
const NepaliDate = require('nepali-date-converter');

/* GET home page. */
router.get('/', middleware.auth.loggedIn(), function(req, res, next) {  
  var data = {
    dependency: 'dashboard.js',
    autocomplete: true
  };
  var flash_message = req.flash('flash_message');
  var flash_color = req.flash('flash_color');  
  if (flash_message.length !== 0 && flash_color.length !== 0) {
    data.flash_message = flash_message;
    data.flash_color = flash_color;
  }

  var month_data = [];
  var today_np = new NepaliDate(new Date());
  var today_np_year = today_np.getYear();
  var today_np_month = today_np.getMonth();
  for (let i = 0; i < 12; i++) {
    var np_dt = new NepaliDate(today_np_year, today_np_month, 1);
    month_data.push({
      'text': np_dt.format('MMMM, YYYY', 'np'),
      'value': np_dt.format('DD/MM/YYYY')
    });
    if (today_np_month === 0) {
      today_np_month = 11;
      today_np_year--;
    }else {
      today_np_month--;
    }
  }


  data.toNepaliDate = (d) => {
    if (d == null)return '';
    return new NepaliDate(d).format("DD/MM/YYYY");
  };
  data.toNepaliDateFull = (d) => {
    if (d == null)return '';
    return new NepaliDate(d).format("ddd, DD MMMM YYYY");
  };

  
  utility.misc.getStats().then(result => {
    data = {
      ...data,
      ...result,
      'month_data': month_data
    }

    return utility.misc.getUserName(req.session.email);
  }).then(name => {
    data.name = name;
    res.render('dashboard', data);
  }).catch(err => {
    console.log(err);
    req.flash('flash_message', 'Some error occurred while loading the main page. Please try again later');
    req.flash('flash_color', 'danger');
    res.redirect('/billing');
  });
});

module.exports = router;
