var express = require('express');
const middleware = require('../modules/middleware');
const utility = require('../modules/utility');
const NepaliDate = require('nepali-date-converter');
var router = express.Router();


router.get('/add', middleware.auth.loggedIn(), function (req, res, next) {
  var breadcrumbs = [{
      link: '/',
      name: 'Home'
    },
    {
      link: '/records',
      name: 'Records'
    },
    {
      link: '/records/add',
      name: 'New Record'
    }
  ];
  var data = {
    dependency: '/record/record.js',
    breadcrumbs
  };
  var flash_message = req.flash('flash_message');
  var flash_color = req.flash('flash_color');

  if (flash_message.length !== 0 && flash_color.length !== 0) {
    data.flash_message = flash_message;
    data.flash_color = flash_color;
  }

  res.render('record/add', data);
});

router.get('/', middleware.auth.loggedIn(), function (req, res, next) {
  res.render('under_construction');
  
});

module.exports = router;