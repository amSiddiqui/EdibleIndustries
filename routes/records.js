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
  // var breadcrumbs = [{
  //     link: '/',
  //     name: 'Home'
  //   },
  //   {
  //     link: '/records',
  //     name: 'Records'
  //   }
  // ];
  // var data = {
  //   dependency: '/record/record.js',
  //   breadcrumbs
  // };
  // var flash_message = req.flash('flash_message');
  // var flash_color = req.flash('flash_color');

  // if (flash_message.length !== 0 && flash_color.length !== 0) {
  //   data.flash_message = flash_message;
  //   data.flash_color = flash_color;
  // }

  // utility.records.fetchAll().then(records => {
  //   for (let i = 0; i < records.length; i++) {
  //     const record = records[i];
  //     var total = 0;
  //     record.record_transactions.forEach(tr => {
  //       total += tr.cost;
  //     });

  //     records[i].total = total;
  //     records[i].nepali_date = new NepaliDate(record.createdAt).format("DD/MM/YYYY");
  //     if (!record.paid) {
  //       records[i].nepali_due = new NepaliDate(record.dueDate).format("DD/MM/YYYY");
  //       if (record.dueDate < new Date()) {
  //         records[i].danger = true;
  //       }
  //       records[i].danger = false;
  //     }
  //   }
  //   data.records = records;
  //   res.render('record/index', data);
  // });
});

module.exports = router;