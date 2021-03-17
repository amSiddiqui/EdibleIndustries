var express = require('express');
const middleware = require('../modules/middleware');
const utility = require('../modules/utility');
const NepaliDate = require('nepali-date-converter');
const {
  customer
} = require('../modules/utility');
var router = express.Router();

router.put('/customer-type/:id', middleware.auth.loggedIn(), function (req, res, next) {
  if (!utility.misc.checkPermission(req, res))
    return;

  let id = parseInt(req.params.id);
  var data = {
    name: req.body['name'].trim(),
    rates: []
  };
  if (data.name.length === 0) {
    req.flash('flash_message', 'Error editing customer, please check your inputs.');
    req.flash('flash_color', 'danger');
    res.redirect('/customer/customer-type');
  } else {
    utility.inventory.fetchAllInventoryID().then((inventories) => {
      inventories.forEach(inventory => {
        for (let i = 0; i < inventory.inventory_batches.length; i++) {
          const b = inventory.inventory_batches[i];
          data.rates.push({
            id: b.id,
            rate: utility.misc.toNumberFloat(req.body['batch-' + b.id])
          });
        }
      });
      utility.customer_type.editWithRates(id, data).then(() => {
        req.flash('flash_message', 'Customer type successfully edited');
        req.flash('flash_color', 'success');
        res.redirect('/customer/customer-type');
      }).catch(err => {
        console.log(err);
        req.flash('flash_message', 'Error editing customer, please check your inputs');
        req.flash('flash_color', 'danger');
        res.redirect('/customer/customer-type');
      });
    });
  }
});


router.delete('/customer-type/:id', middleware.auth.loggedIn(), function (req, res, next) {
  if (!utility.misc.checkPermission(req, res))
    return;

  let id = parseInt(req.params.id);
  utility.customer_type.delete(id).then(() => {
    req.flash('flash_message', 'Customer type successfully deleted');
    req.flash('flash_color', 'success');
    res.redirect('/customer/customer-type');
  }).catch((err) => {
    console.log(err);
    req.flash('flash_message', 'Error deleting customer, please check your inputs');
    req.flash('flash_color', 'danger');
    res.redirect('/customer/customer-type');
  });
});


router.get('/customer-type/:id', middleware.auth.loggedIn(), function (req, res, next) {
  let id = parseInt(req.params.id);
  utility.customer_type.fetchCustomerType(id).then((customer_type) => {
    console.log(customer_type);
    customer_data = {
      name: customer_type.name,
      inventorie_batches: []
    }
    customer_type.inventory_batches.forEach(batch => {
      customer_data.inventorie_batches.push({
        id: batch.id,
        customer_type_rate: {
          rate: batch.customer_type_rate.rate
        }
      });
    });
    res.json({
      status: "success",
      customer_type: customer_data
    });
  }).catch(err => {
    console.log(err);
    res.json({
      status: 'fail',
      message: 'DB Error'
    })
  });
});


router.post('/customer-type-exists', middleware.auth.loggedIn(), function (req, res, next) {
  var name = req.body.name.trim();
  if (name.length == 0) {
    res.json({
      status: "fail",
      message: "Customer type name should not be empty"
    });
  } else {
    utility.customer_type.exists(name).then(result => {
      if (!result) {
        res.json({
          status: "success",
          message: "Name is unique"
        });
      } else {
        res.json({
          status: "fail",
          message: "Customer type already exists"
        });
      }
    }).catch(err => {
      console.log(err);
      res.json({
        status: "fail",
        message: "Database error, try again later"
      });
    });
  }
});

router.get('/customer-type', middleware.auth.loggedIn(), function (req, res, next) {
  var breadcrumbs = [{
      link: '/',
      name: 'Home'
    },
    {
      link: '/customer',
      name: 'Customers'
    },
    {
      link: '/customer-type',
      name: 'Customer Type'
    },
  ];
  // Fetch all customer types with customer type rates
  utility.customer_type.fetchAllTypes().then(types => {
    utility.inventory.fetchAllInventoryID().then(inventories => {
      var data = {
        dependency: 'customer/customer-type.js',
        breadcrumbs,
        customer_types: types,
        inventories,
      };

      var flash_message = req.flash('flash_message');
      var flash_color = req.flash('flash_color');

      if (flash_message.length !== 0 && flash_color.length !== 0) {
        data.flash_message = flash_message;
        data.flash_color = flash_color;
      }
      res.render('customer/types', data);
    }).catch(err => {
      console.log(err);
      req.flash('flash_message', 'Error opening customer-type, try agina later');
      req.flash('flash_color', 'danger');
      res.redirect('/customer');
    });
  }).catch(err => {
    console.log(err);
    req.flash('flash_message', 'Error opening customer-type, try agina later');
    req.flash('flash_color', 'danger');
    res.redirect('/customer');
  });

});

router.post('/customer-type', middleware.auth.loggedIn(), function (req, res, next) {
  if (!utility.misc.checkPermission(req, res))
    return;

  var data = {
    name: req.body['name'].trim(),
    rates: []
  };
  if (data.name.length === 0) {
    req.flash('flash_message', 'Error creating customer, please check your inputs.');
    req.flash('flash_color', 'danger');
    res.redirect('/customer/customer-type');
  } else {
    utility.inventory.fetchAllInventoryID().then((inventories) => {

      inventories.forEach(inventory => {
        for (let i = 0; i < inventory.inventory_batches.length; i++) {
          const b = inventory.inventory_batches[i];

          data.rates.push({
            id: b.id,
            rate: utility.misc.toNumberFloat(req.body['batch-' + b.id])
          });
        }
      });

      utility.customer_type.createWithRate(data).then(() => {
        req.flash('flash_message', 'Customer type successfully added');
        req.flash('flash_color', 'success');
        res.redirect('/customer/customer-type');
      }).catch(err => {
        console.log(err);
        req.flash('flash_message', 'Error creating customer, please check your inputs');
        req.flash('flash_color', 'danger');
        res.redirect('/customer/customer-type');
      });
    });
  }
});



router.get('/add', middleware.auth.loggedIn(), function (req, res, next) {
  var breadcrumbs = [{
      link: '/',
      name: 'Home'
    },
    {
      link: '/customer',
      name: 'Customers'
    },
    {
      link: '/customer/add',
      name: 'Add'
    },
  ];
  var data = {
    dependency: 'customer/customer-add.js',
    breadcrumbs
  };
  var flash_message = req.flash('flash_message');
  var flash_color = req.flash('flash_color');

  if (flash_message.length !== 0 && flash_color.length !== 0) {
    data.flash_message = flash_message;
    data.flash_color = flash_color;
  }

  var last_5_dates = [];
  var dt = new Date();
  for (let i = 0; i < 5; i++) {
    var np = new NepaliDate(dt);
    last_5_dates.push(np)
    dt.setDate(dt.getDate() - 1);
  }

  data.last_5_dates = last_5_dates;

  utility.customer_type.fetchAllTypes().then(types => {
    data.types = types;
    utility.misc.fetchAllZones().then(zones => {
      data.zones = zones;
      res.render('customer/add', data);
    }).catch(err => {
      console.log(err);
      req.flash('flash_message', 'Database Error. Please try again later.');
      req.flash('flash_color', 'danger');
      res.redirect('/customer');
    });
  }).catch(err => {
    console.log(err);
    req.flash('flash_message', 'Database Error. Please try again later.');
    req.flash('flash_color', 'danger');
    res.redirect('/customer');
  });
});



router.get('/edit/:id', middleware.auth.loggedIn(), function (req, res, next) {
  if (!utility.misc.checkPermission(req, res))
    return;

  let id = parseInt(req.params.id);
  var breadcrumbs = [{
      link: '/',
      name: 'Home'
    },
    {
      link: '/customer',
      name: 'Customers'
    },
    {
      link: '/customer/' + id,
      name: 'Customer'
    },
    {
      link: '/customer/edit/' + id,
      name: 'Edit'
    },
  ];
  var data = {
    dependency: 'customer/customer-add.js',
    breadcrumbs
  };
  var flash_message = req.flash('flash_message');
  var flash_color = req.flash('flash_color');

  if (flash_message.length !== 0 && flash_color.length !== 0) {
    data.flash_message = flash_message;
    data.flash_color = flash_color;
  }
  utility.customer_type.fetchAllTypes().then(types => {
    data.types = types;
    utility.misc.fetchAllZones().then(zones => {
      data.zones = zones;
      utility.customer.fetchCustomer(id).then(customer => {
        utility.inventory.fetchAllInventoryID().then(inventories => {
          data.inventories = inventories;
          data.getInventoryRate = function (batch_id) {
            let rate = 0;
            for (let i = 0; i < customer.inventories.length; i++) {
              const inventory = customer.inventories[i];
              for (let j = 0; j < inventory.inventorie_batches.length; j++) {
                const batch = inventory.inventorie_batches[j];
                if (batch.id == batch_id) {
                  return batch.customer_rate.rate;
                }
              }
            }
            return rate;
          };
          var phone = customer.phone;
          if (phone.split(' ').length == 1) {
            customer.phone = '';
            customer.phone_code = '+977';
          } else {
            var temp = phone.split(' ');
            customer.phone_code = temp[0];
            temp.shift();
            customer.phone = temp.join(' ');
          }
          data.customer = customer;
          res.render('customer/edit', data);
        }).catch(err => {
          console.log(err);
          req.flash('flash_message', 'Database Error. Please try again later.');
          req.flash('flash_color', 'danger');
          res.redirect('/customer');
        });
      }).catch(err => {
        console.log(err);
        req.flash('flash_message', 'Database Error. Please try again later.');
        req.flash('flash_color', 'danger');
        res.redirect('/customer');
      });
    }).catch(err => {
      console.log(err);
      req.flash('flash_message', 'Database Error. Please try again later.');
      req.flash('flash_color', 'danger');
      res.redirect('/customer');
    });
  }).catch(err => {
    console.log(err);
    req.flash('flash_message', 'Database Error. Please try again later.');
    req.flash('flash_color', 'danger');
    res.redirect('/customer');
  });

});

router.post('/:id/deposit',middleware.auth.loggedIn(), function(req, res, next) {
  let id = parseInt(req.params.id);
  var date = req.body.date;
  var amount = req.body.amount;
  if (date === undefined || amount === undefined) {
    req.flash('flash_message', 'Wrong inputs, try again');
    req.flash('flash_color', 'danger');
    res.redirect('/customer/'+id+'#ledger');
    return;
  }
  var bd = new Date();
  if (date.length !== 0) {
    date = utility.misc.toEnglishDate(date);
    bd = new NepaliDate(date).toJsDate();
  }
  date = bd;
  amount = parseFloat(amount);
  if (isNaN(amount)) {
    req.flash('flash_message', 'Wrong inputs, try again');
    req.flash('flash_color', 'danger');
    res.redirect('/customer/'+id+'#ledger');
  }
  var deposit_data = {
    type: 'Deposit',
    credit: amount,
    debit: null,
    date: date
  };
  utility.ledger.addEntry(id, deposit_data).then(() => {
    req.flash('flash_message', 'Successfully deposited amount');
    req.flash('flash_color', 'success');
    res.redirect('/customer/'+id+'#ledger');
  }).catch(err => {
    console.log(err);
    req.flash('flash_message', 'Server error, try again later');
    req.flash('flash_color', 'danger');
    res.redirect('/customer/'+id+'#ledger');
  });
  
});

router.get('/:id', middleware.auth.loggedIn(), function (req, res, next) {
  let id = parseInt(req.params.id);
  var breadcrumbs = [{
      link: '/',
      name: 'Home'
    },
    {
      link: '/customer',
      name: 'Customers'
    },
    {
      link: '/customer/' + id,
      name: 'Customer'
    },
  ];
  var data = {
    dependency: 'customer/customer.js',
    breadcrumbs
  };
  var flash_message = req.flash('flash_message');
  var flash_color = req.flash('flash_color');

  if (flash_message.length !== 0 && flash_color.length !== 0) {
    data.flash_message = flash_message;
    data.flash_color = flash_color;
  }

  var last_5_dates = [];
  var dt = new Date();
  for (let i = 0; i < 5; i++) {
    var np = new NepaliDate(dt);
    last_5_dates.push(np)
    dt.setDate(dt.getDate() - 1);
  }
  
  data.last_5_dates = last_5_dates;


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
  data.month_data = month_data;
  utility.customer.fetchCustomer(id).then(customer => {
    utility.inventory.fetchAllInventoryID().then(inventories => {
      var phone = customer.phone;
      data.inventories = inventories;
      data.getInventoryRate = function (b_id) {
        for (let i = 0; i < customer.inventory_batches.length; i++) {
          const b = customer.inventory_batches[i];
          if (b.id == b_id) {
            return 'Re. ' + b.customer_rate.rate;
          }
        }

        return 'Not Set';
      };
      var temp_phone = phone.split(' ');
      var total_phone = 0;
      for (let i = 0; i < temp_phone.length; i++) {
        const tp = temp_phone[i];
        if (tp.length > 0) {
          total_phone++;
        }
      }
      if (total_phone == 1) {
        customer.new_phone = '';
      } else {
        customer.new_phone = customer.phone;
      }
      customer.nepali_date = new NepaliDate(customer.createdAt).format('ddd, DD MMMM YYYY', 'np');
      data.customer = customer;
      utility.customer.fetchBills(id).then(function (bills) {
        for (let i = 0; i < bills.length; i++) {
          const bill = bills[i];
          bills[i].nepali_date = new NepaliDate(bill.createdAt).format("DD/MM/YYYY");
          if (!bill.paid) {
            if (bill.dueDate == null) {
              bills[i].nepali_due = '';
            } else {
              bills[i].nepali_due = new NepaliDate(bill.dueDate).format("DD/MM/YYYY");
            }
            if (bill.dueDate < bill.createdAt) {
              bills[i].danger = true;
            } else {
              bills[i].danger = false;
            }
          }
        }
        data.bills = bills;
        return utility.ledger.fetchAllEntry(id);
      }).then(entries => {
        data.ledger_entries = entries;
        res.render('customer/customer', data);
      }).
      catch(err => {
        console.log(err);
        req.flash('flash_message', 'Database Error. Please try again later.');
        req.flash('flash_color', 'danger');
        res.redirect('/customer');
      });
    }).catch(err => {
      console.log(err);
      req.flash('flash_message', 'Database Error. Please try again later.');
      req.flash('flash_color', 'danger');
      res.redirect('/customer');
    });
  }).catch(err => {
    console.log(err);
    req.flash('flash_message', 'Database Error. Please try again later.');
    req.flash('flash_color', 'danger');
    res.redirect('/customer');
  });

});

router.put('/:id', middleware.auth.loggedIn(), function (req, res, next) {
  if (!utility.misc.checkPermission(req, res))
    return;

  let id = parseInt(req.params.id);
  let customer_data = {
    first_name: req.body.first_name.trim(),
    last_name: req.body.last_name.trim(),
    organization: req.body.organization.trim(),
    email: req.body.email.trim(),
    phone: req.body.phone_code.trim() + ' ' + req.body.phone.trim(),
    address1: req.body.address.trim(),
    vat_number: req.body.vat.trim()
  };
  let zone = '';
  let district = '';
  let post_office = '';
  if (typeof req.body.zone !== 'undefined') {
    zone = req.body.zone.trim();
  }
  if (typeof req.body.district !== 'undefined') {
    district = req.body.district.trim();
  }
  if (typeof req.body.post_office !== 'undefined') {
    post_office = req.body.post_office.trim();
  }
  let address = {
    zone,
    district,
    post_office,
  };
  let customer_type = req.body.customer_type.trim();
  if (customer_data.first_name.length === 0 || customer_type === 0) {
    req.flash('flash_message', 'Cannot edit the customer make sure your inputs are correct');
    req.flash('flash_color', 'danger');
    res.redirect('/customer/' + id);
  }
  utility.inventory.fetchAllInventory().then(inventories => {
    let rates = [];
    inventories.forEach(inventory => {
      for (let i = 0; i < inventory.inventory_batches.length; i++) {
        const b = inventory.inventory_batches[i];
        var rate = req.body['rate-' + b.id];
        if (typeof rate != 'undefined') {
          rate = utility.misc.toNumberFloat(rate);
          rates.push({
            inventoryBatchId: b.id,
            rate
          });
        }
      }
    });
    utility.customer.editFull(id, customer_data, address, customer_type, rates).then(() => {
      req.flash('flash_message', 'Customer added successfully');
      req.flash('flash_color', 'success');
      res.redirect('/customer/' + id);
    }).catch(err => {
      console.log(err);
      req.flash('flash_message', 'Cannot editing customer. DB Error');
      req.flash('flash_color', 'danger');
      res.redirect('/customer/' + id);
    });
  }).catch(err => {
    console.log(err);
    req.flash('flash_message', 'Cannot editing customer. DB Error');
    req.flash('flash_color', 'danger');
    res.redirect('/customer/' + id);
  });
});

router.get('/', middleware.auth.loggedIn(), function (req, res, next) {
  var breadcrumbs = [{
      link: '/',
      name: 'Home'
    },
    {
      link: '/customer',
      name: 'Customers'
    },
  ];
  var data = {
    dependency: 'customer/customers.js',
    breadcrumbs
  };
  var flash_message = req.flash('flash_message');
  var flash_color = req.flash('flash_color');

  if (flash_message.length !== 0 && flash_color.length !== 0) {
    data.flash_message = flash_message;
    data.flash_color = flash_color;
  }

  utility.customer.fetchAllCustomer().then(customers => {
    for (let i = 0; i < customers.length; i++) {
      customers[i].nepali_date = new NepaliDate(customers[i].createdAt).format("DD/MM/YYYY");
    }
    data.customers = customers;
    res.render('customer/index', data);
  });

});

router.post('/', middleware.auth.loggedIn(), function (req, res, next) {
  let customer_data = {
    first_name: req.body.first_name.trim(),
    last_name: req.body.last_name.trim(),
    organization: req.body.organization.trim(),
    email: req.body.email.trim(),
    phone: req.body.phone_code.trim() + ' ' + req.body.phone.trim(),
    address1: req.body.address.trim(),
    vat_number: req.body.vat.trim()
  };

  var date_added = req.body.date || '';
  var bd = null;
  if (date_added.length !== 0) {
    date_added = utility.misc.toEnglishDate(date_added);
    bd = new NepaliDate(date_added).toJsDate();
  }

  if (bd == null) {
    customer_data.createdAt = new Date();
  } else {
    customer_data.createdAt = bd;
  }

  let zone = '';
  let district = '';
  let post_office = '';
  if (typeof req.body.zone !== 'undefined') {
    zone = req.body.zone.trim();
  }
  if (typeof req.body.district !== 'undefined') {
    district = req.body.district.trim();
  }
  if (typeof req.body.post_office !== 'undefined') {
    post_office = req.body.post_office.trim();
  }
  let address = {
    zone,
    district,
    post_office,
  };
  let customer_type = req.body.customer_type.trim();
  if (customer_data.first_name.length === 0 || customer_type === 0) {
    req.flash('flash_message', 'Cannot create new customer make sure your inputs are correct');
    req.flash('flash_color', 'danger');
    res.redirect('/customer');
  }
  utility.inventory.fetchAllInventory().then(inventories => {
    let rates = [];
    inventories.forEach(inventory => {
      for (let i = 0; i < inventory.inventory_batches.length; i++) {
        const b = inventory.inventory_batches[i];
        var rate = req.body['rate-' + b.id];
        if (typeof rate != 'undefined') {
          rate = utility.misc.toNumberFloat(rate);
          rates.push({
            inventoryBatchId: b.id,
            rate
          });
        }
      }
    });
    utility.customer.createFull(customer_data, address, customer_type, rates).then((new_id) => {
      req.flash('flash_message', 'Customer added successfully');
      req.flash('flash_color', 'success');
      res.redirect('/customer/' + new_id);
    }).catch(err => {
      console.log(err);
      req.flash('flash_message', 'Cannot create new customer. DB Error');
      req.flash('flash_color', 'danger');
      res.redirect('/customer');
    });
  }).catch(err => {
    console.log(err);
    req.flash('flash_message', 'Cannot create new customer. DB Error');
    req.flash('flash_color', 'danger');
    res.redirect('/customer');
  });

});

module.exports = router;