var express = require('express');
const middleware = require('../modules/middleware');
const utility = require('../modules/utility');
const NepaliDate = require('nepali-date-converter');
var router = express.Router();
const fs = require('fs');


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
    return utility.inventory.fetchAllInventoryIdWithRecord();
  }).
  then(inventories => {
    data.inventories = inventories;
    return utility.billing.getBillNo();
  }).
  then(billno => {
    data.billno = billno;
    res.render('billing/add', data);
  }).
  catch(err => {
    console.log(err);
    req.flash('flash_message', 'Error Opening Bill. Try again Later');
    req.flash('flash_color', 'danger');
    res.redirect('/billing');
  });

});


router.get('/:id', middleware.auth.loggedIn(), function (req, res, next) {
  let id = parseInt(req.params.id);
  var breadcrumbs = [{
      link: '/',
      name: 'Home'
    },
    {
      link: '/billing',
      name: 'Billing'
    },
    {
      link: '/billing/' + id,
      name: 'Bill'
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

  utility.billing.fetch(id).then(bill => {
    bill.nepali_date = new NepaliDate(bill.createdAt).format("DD/MM/YYYY");
    if (!bill.paid) {
      bill.nepali_due = new NepaliDate(bill.dueDate).format("DD/MM/YYYY");
      if (bill.dueDate < new Date()) {
        bill.danger = true;
      }
      bill.danger = false;
    }
    data.bill = bill;
    res.render('billing/show', data);
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
      bills[i].nepali_date = new NepaliDate(bill.createdAt).format("DD/MM/YYYY");
      if (!bill.paid) {
        bills[i].nepali_due = new NepaliDate(bill.dueDate).format("DD/MM/YYYY");
        if (bill.dueDate < new Date()) {
          bills[i].danger = true;
        }else{
          bills[i].danger = false;
        }
      }
    }
    data.bills = bills;
    res.render('billing/index', data);
  });
});

router.post('/', middleware.auth.loggedIn(), function (req, res, next) {
  var customer = req.body.customer;
  var payment_method = req.body.payment_method;
  var description = req.body.description;
  var discount_percent = req.body.discount_percent;
  var discount_value = req.body.discount_value;
  var tax_percent = req.body.tax_percent;
  var tax_value = req.body.tax_value;
  var due_date = req.body.due_date.trim();
  var dd = null;
  if (due_date.length !== 0) {
    due_date = utility.misc.toEnglishDate(due_date);
    dd = new NepaliDate(due_date).toJsDate();
    console.log(dd);
  }
  var paid = false;
  var temp = req.body.paid;
  if (typeof temp !== 'undefined') paid = true;
  utility.inventory.fetchAllInventoryID().then(inventories => {
    var transactions = [];
    for (let i = 0; i < inventories.length; i++) {
      const inventory = inventories[i];
      var quant = req.body['quantity_' + inventory.id + '[]'];
      if (typeof quant === 'undefined') continue;
      var type = req.body['inv_type_' + inventory.id + '[]'];
      var rate = req.body['rate_' + inventory.id + '[]'];
      if (typeof quant === 'string') {
        quant = [quant];
        rate = [rate];
        type = [type];
      }
      transactions.push({
        id: inventory.id,
        quantity: quant,
        type,
        rate
      });
      var image_id = req.session.image_id;
      var image_loc = '';
      req.session.image_id = null;
      if (typeof image_id !== 'undefined' && image_id !== null) {
        if (fs.existsSync('uploads/tmp/' + image_id)) {
          var folder = 'uploads/tmp/' + image_id;
          var files = fs.readdirSync(folder);
          if (files.length > 0) {
            var image = files[0];
            fs.copyFileSync(folder + '/' + image, 'uploads/' + image);
            image_loc = '/uploads/' + image;
          }
          fs.rmdirSync(folder, {
            recursive: true
          });
        }
      }
    }
    var user_email = req.session.email;
    if (typeof user_email === 'undefined') {
      user_email = 'gt_ams@yahoo.in';
    }
    utility.billing.createFull(customer, {
      payment_method,
      description,
      discount_percent,
      tax_percent,
      tax_value,
      image_loc,
      discount_value,
      paid,
      discount_percent,
      dd
    }, transactions, user_email).then((id) => {
      req.flash('flash_message', 'Bill Added Successfully');
      req.flash('flash_color', 'success');
      res.redirect('/billing/' + id);
    }).catch(err => {
      console.log(err);
      req.flash('flash_message', 'Some error occurred while adding the bill. Please try again later');
      req.flash('flash_color', 'danger');
      res.redirect('/billing');
    });
  }).catch(err => {
    console.log(err);
    req.flash('flash_message', 'Some error occurred while adding the bill. Please try again later');
    req.flash('flash_color', 'danger');
    res.redirect('/billing');
  });
});

module.exports = router;