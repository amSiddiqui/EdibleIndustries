var express = require('express');
const middleware = require('../modules/middleware');
const utility = require('../modules/utility');
const NepaliDate = require('nepali-date-converter');
const _ = require('lodash');
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
    return utility.inventory.fetchAllInventoryIdWithRecord(new Date());
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

router.get('/edit/:id', middleware.auth.loggedIn(), function (req, res, next) {
  if (!utility.misc.checkPermission(req, res, 'Only Admin user allowed to edit bills'))
        return;
  
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
      link: '/billing/edit/' + id,
      name: 'Edit Bill'
    }
  ];
  var data = {
    dependency: '/billing/billing-edit.js',
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
    return utility.inventory.fetchAllInventoryIdWithRecord(new Date());
  }).
  then(inventories => {
    data.inventories = inventories;
    return utility.billing.fetch(id);
  }).
  then(bill => {
    bill.nepali_date = new NepaliDate(bill.createdAt).format("DD/MM/YYYY", 'np');
    var today = new Date();
    if (!bill.paid) {
      bill.nepali_due = new NepaliDate(bill.dueDate).format("DD/MM/YYYY", 'np');
      bill.danger = false;
      if (bill.dueDate < today) {
        bill.danger = true;
      }
    }

    for (let i = 0; i < bill.bill_transactions.length; i++) {
      const tr = bill.bill_transactions[i];
      if (tr.type == 'rented') {
        var returns = tr.return;
        var returns_total = _.sumBy(returns, (o) => o.quantity);
        if (tr.quantity > returns_total) {
          bill.bill_transactions[i].status = false;
          bill.bill_transactions[i].remaining = tr.quantity - returns_total;
        } else {
          bill.bill_transactions[i].status = true;
        }
      }
    }
    data.bill = bill;
    res.render('billing/edit', data);
  }).
  catch(err => {
    console.log(err);
    req.flash('flash_message', 'Error Opening Bill. Try again Later');
    req.flash('flash_color', 'danger');
    res.redirect('/billing/' + id);
  });

});


router.post('/return/:id', middleware.auth.loggedIn(), function (req, res, next) {
  let id = parseInt(req.params.id);
  let inv_id = req.body.inventory_id;
  let quant = req.body.quantity;
  let return_date = req.body.return_date;
  var bd = new Date();
  if (return_date.length !== 0) {
    return_date = utility.misc.toEnglishDate(return_date);
    bd = new NepaliDate(return_date).toJsDate();
  }

  let bill_id = req.body.bill_id;
  let user_email = req.session.email;
  if (typeof user_email == 'undefined' || user_email === null) {
    user_email = 'gt_ams@yahoo.in';
  }
  utility.billing.addReturn(id, inv_id, quant, bill_id, user_email, bd).then(() => {
    req.flash('flash_message', 'Add return to the items');
    req.flash('flash_color', 'success');
    res.redirect('/billing/' + bill_id);
  }).catch(err => {
    console.log(err);
    req.flash('flash_message', 'Something went wrong while adding return. Try again later');
    req.flash('flash_color', 'danger');
    res.redirect('/billing/' + bill_id);
  });
});

router.post('/pay/:id', middleware.auth.loggedIn(), function (req, res, next) {
  let id = parseInt(req.params.id);
  let pay_date = req.body.pay_date;
  var bd = new Date();
  if (pay_date.length !== 0) {
    pay_date = utility.misc.toEnglishDate(pay_date);
    bd = new NepaliDate(pay_date).toJsDate();
  }
  utility.billing.pay(id, bd).then(() => {
    req.flash('flash_message', 'Paid Successfully');
    req.flash('flash_color', 'success');
    res.redirect('/billing/' + id);
  }).catch(err => {
    console.log(err);
    req.flash('flash_message', 'Something went wrong while adding pay. Try again later');
    req.flash('flash_color', 'danger');
    res.redirect('/billing/' + id);
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

  var today = new Date();
  utility.billing.fetch(id).then(bill => {
      bill.nepali_date = new NepaliDate(bill.createdAt).format("ddd, DD MMMM YYYY", 'np');
      if (!bill.paid) {
        if (bill.dueDate === null)
          bill.nepali_due = '';
        else
          bill.nepali_due = new NepaliDate(bill.dueDate).format("ddd, DD MMMM YYYY", 'np');
        bill.danger = false;
        if (bill.dueDate < today) {
          bill.danger = true;
        }
      }

      for (let i = 0; i < bill.bill_transactions.length; i++) {
        const tr = bill.bill_transactions[i];
        if (tr.type == 'rented') {
          var returns = tr.return;
          var returns_total = _.sumBy(returns, (o) => o.quantity);
          if (tr.quantity > returns_total) {
            bill.bill_transactions[i].status = false;
            bill.bill_transactions[i].remaining = tr.quantity - returns_total;
          } else {
            bill.bill_transactions[i].status = true;
          }
        }
      }
      data.bill = bill;
      return utility.billing.areItemsRented(id);
    }).then(rented => {
      data.bill.rented = rented;
      return utility.billing.wereItemsRented(id);
    }).then(were_rented => {
      data.bill.were_rented = were_rented;
      data.toNepaliDate = (d) => {
        if (d === null) return '';
        return new NepaliDate(d).format("DD/MM/YYYY", 'np');
      };
      data.toNepaliDateFull = (d) => {
        if (d === null) return '';
        return new NepaliDate(d).format("ddd, DD MMMM YYYY", 'np');
      };
      res.render('billing/show', data);
    })
    .catch(err => {
      console.log(err);
      req.flash('flash_message', 'Some error occurred while loading the bill. Please try again later');
      req.flash('flash_color', 'danger');
      res.redirect('/billing');
    });
});

router.delete('/:id', middleware.auth.loggedIn(), function (req, res, next) {
  if (!utility.misc.checkPermission(req, res))
      return;
  
  let id = parseInt(req.params.id);
  utility.billing.deleteBill(id).then(function () {
    console.log(`Bill with id ${id} was deleted`);
    req.flash('flash_message', 'Bill successfully deleted');
    req.flash('flash_color', 'success');
    res.redirect('/billing');
  }).catch(err => {
    console.log(err);
    req.flash('flash_message', 'Some error occurred while deleting the bill. Please try again later');
    req.flash('flash_color', 'danger');
    res.redirect('/billing');
  });
});

router.put('/:id', middleware.auth.loggedIn(), function (req, res, next) {
  if (!utility.misc.checkPermission(req, res))
      return;
  
  let id = parseInt(req.params.id);
  var payment_method = req.body.payment_method;
  var description = req.body.description;
  var discount_percent = req.body.discount_percent;
  var discount_value = req.body.discount_value;
  var tax_percent = req.body.tax_percent;
  var tax_value = req.body.tax_value;
  var due_date = req.body.due_date.trim();
  var customer = req.body.customer;

  var dd = null;
  if (due_date.length !== 0) {
    due_date = utility.misc.toEnglishDate(due_date);
    dd = new NepaliDate(due_date).toJsDate();
  }
  var paid = false;
  var temp = req.body.paid;
  if (typeof temp !== 'undefined') paid = true;
  var image_id = req.session.image_id;
  var image_loc = '/images/placeholder-vertical.jpg';
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
  utility.billing.edit_bill(id, {
    image_loc,
    due_date: dd,
    payment_method,
    description,
    discount_percent,
    discount_value,
    tax_percent,
    tax_value,
    paid,
    customer
  }, req.body).then(function() {
    req.flash('flash_message', 'Bill Updated Successfully');
    req.flash('flash_color', 'success');
    res.redirect('/billing/'+id);
  }).catch(err => {
    console.log(err);
    req.flash('flash_message', 'Some error occurred while updating the bill.');
    req.flash('flash_color', 'danger');
    res.redirect('/billing/'+id);
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
  var today = new Date();

  utility.billing.fetchAll().then(bills => {
    for (let i = 0; i < bills.length; i++) {
      const bill = bills[i];
      var total_sold = 0;
      for (let j = 0; j < bill.bill_transactions.length; j++) {
        var txn = bill.bill_transactions[j];
        if (txn.type == 'sold') {
          total_sold += txn.quantity;
        }
      }

      bills[i].total_sold = total_sold;

      bills[i].nepali_date = new NepaliDate(bill.createdAt).format("DD/MM/YYYY");
      if (!bill.paid && bill.dueDate != null) {
        bills[i].nepali_due = new NepaliDate(bill.dueDate).format("DD/MM/YYYY");

        if (bill.dueDate < today) {
          bills[i].danger = true;
        } else {
          bills[i].danger = false;
        }
      }
    }
    data.bills = bills;
    res.render('billing/index', data);
  }).catch(err => {
    console.log(err);
    req.flash('flash_message', 'Some error occurred while loading the bills. Please try again later');
    req.flash('flash_color', 'danger');
    res.redirect('/');
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
  var bill_date = req.body.bill_date.trim();
  var track_id = req.body.track_id;

  var bd = null;
  if (bill_date.length !== 0) {
    bill_date = utility.misc.toEnglishDate(bill_date);
    bd = new NepaliDate(bill_date).toJsDate();
  }

  var dd = null;
  if (due_date.length !== 0) {
    due_date = utility.misc.toEnglishDate(due_date);
    dd = new NepaliDate(due_date).toJsDate();
  }
  var paid = false;
  var temp = req.body.paid;
  if (typeof temp !== 'undefined') paid = true;
  utility.inventory.fetchAllInventoryID().then(inventories => {
    var transactions = [];
    for (let i = 0; i < inventories.length; i++) {
      const inventory = inventories[i];
      for (let j = 0; j < inventory.inventory_batches.length; j++) {
        const batch = inventory.inventory_batches[j];
        var quant = req.body['quantity_' + batch.id + '[]'];
        if (typeof quant === 'undefined') continue;
        var type = req.body['inv_type_' + batch.id + '[]'];
        var rate = req.body['rate_' + batch.id + '[]'];
        if (typeof quant === 'string') {
          quant = [quant];
          rate = [rate];
          type = [type];
        }
        transactions.push({
          id: batch.id,
          quantity: quant,
          type,
          rate
        });
      }
    }
    var image_id = req.session.image_id;
    var image_loc = '/images/placeholder-vertical.jpg';
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
      dd,
      bd,
      track_id
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