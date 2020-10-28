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
      link: '/billing',
      name: 'Billing'
    },
    {
      link: '/billing/add',
      name: 'New Bill'
    }
  ];
  var data = {
    dependency: '/billing/billing-add.js',
    breadcrumbs
  };
  var flash_message = req.flash('flash_message');
  var flash_color = req.flash('flash_color');
  if (flash_message.length !== 0 && flash_color.length !== 0) {
    data.flash_message = flash_message;
    data.flash_color = flash_color;
  }

  utility.customer.fetchAllCustomerID().
  then(customers => {
    data.customers = customers;
    return utility.inventory.fetchAllInventoryID();
  }).
  then(inventories => {
    data.inventories = inventories;
    res.render('billing/add', data);
  }).
  catch(err => {
    console.log(err);
    req.flash('flash_message', 'Error Opening Bill. Try again Later');
    req.flash('flash_color', 'danger');
    res.redirect('/billing');
  });

});

router.get('/', middleware.auth.loggedIn(), function (req, res, next) {
  var breadcrumbs = [{
      link: '/',
      name: 'Home'
    },
    {
      link: '/billing',
      name: 'Billing'
    }
  ];
  var data = {
    dependency: '/billing/billing.js',
    breadcrumbs
  };
  var flash_message = req.flash('flash_message');
  var flash_color = req.flash('flash_color');

  if (flash_message.length !== 0 && flash_color.length !== 0) {
    data.flash_message = flash_message;
    data.flash_color = flash_color;
  }

  utility.billing.fetchAll().then(bills => {
    for (let i = 0; i < bills.length; i++) {
      const bill = bills[i];
      var total = 0;
      bill.bill_transactions.forEach(tr => {
        total += tr.cost;
      });

      bills[i].total = total;
      bills[i].nepali_date = new NepaliDate(bill.createdAt).format("DD/MM/YYYY");
      if (!bill.paid) {
        bills[i].nepali_due = new NepaliDate(bill.dueDate).format("DD/MM/YYYY");
        if (record.dueDate < new Date()) {
          bills[i].danger = true;
        }
        bills[i].danger = false;
      }
    }
    data.bills = bills;
    res.render('billing/index', data);
  });
});

module.exports = router;