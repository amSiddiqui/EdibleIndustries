var express = require('express');
const middleware = require('../modules/middleware');
const utility = require('../modules/utility');
const NepaliDate = require('nepali-date-converter');
var router = express.Router();


router.get('/customer-type/:id', middleware.auth.loggedIn(), function (req, res, next) {
  let id = parseInt(req.params.id);
  utility.customer_type.fetchCustomerType(id).then((customer_type) => {
    customer_data = {
      name: customer_type.name,
      inventories: []
    }
    customer_type.inventories.forEach(inventory => {
      customer_data.inventories.push({
        id: inventory.id,
        customer_type_rate: {
          rate: inventory.customer_type_rate.rate
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


router.delete('/customer-type/:id', middleware.auth.loggedIn(), function (req, res, next) {
  let id = parseInt(req.params.id);
  utility.customer_type.delete(id).then(() => {
    req.flash('flash_message', 'Customer type successfully deleted');
    req.flash('flash_color', 'success');
    res.redirect('/customer/customer-type');
    res.end();
  }).catch((err) => {
    console.log(err);
    req.flash('flash_message', 'Error deleting customer, please check your inputs');
    req.flash('flash_color', 'danger');
    res.redirect('/customer/customer-type');
    res.end();
  });
});

router.put('/customer-type/:id', middleware.auth.loggedIn(), function (req, res, next) {
  let id = parseInt(req.params.id);
  var data = {
    name: req.body['name'].trim(),
    rates: []
  };
  if (data.name.length === 0) {
    req.flash('flash_message', 'Error editing customer, please check your inputs.');
    req.flash('flash_color', 'danger');
    res.redirect('/customer/customer-type');
    res.end();
  } else {
    utility.inventory.fetchAllInventoryID().then((inventories) => {
      inventories.forEach(inventory => {
        data.rates.push({
          id: inventory.id,
          rate: req.body['inv-' + inventory.id].trim()
        });
        utility.customer_type.editWithRates(id, data).then(() => {
          req.flash('flash_message', 'Customer type successfully edited');
          req.flash('flash_color', 'success');
          res.redirect('/customer/customer-type');
          res.end();
        }).catch(err => {
          req.flash('flash_message', 'Error editing customer, please check your inputs');
          req.flash('flash_color', 'danger');
          res.redirect('/customer/customer-type');
          res.end();
        });
      });
    });
  }
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
        dependency: '/customer/customer-type.js',
        breadcrumbs,
        customer_types: types,
        inventories,
        get_customer_rate: (customer_type, inventory_id) => {
          let rate = -1;
          for (let i = 0; i < customer_type.inventories.length; i++) {
            const inventory = customer_type.inventories[i];
            if (inventory.id == inventory_id) {
              return inventory.customer_type_rate.rate;
            }
          }
          return rate;
        }
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
      res.end();
    });
  }).catch(err => {
    console.log(err);
    req.flash('flash_message', 'Error opening customer-type, try agina later');
    req.flash('flash_color', 'danger');
    res.redirect('/customer');
    res.end();
  });

});

router.post('/customer-type', middleware.auth.loggedIn(), function (req, res, next) {
  var data = {
    name: req.body['name'].trim(),
    rates: []
  };
  if (data.name.length === 0) {
    req.flash('flash_message', 'Error creating customer, please check your inputs.');
    req.flash('flash_color', 'danger');
    res.redirect('/customer/customer-type');
    res.end();
  } else {
    utility.inventory.fetchAllInventoryID().then((inventories) => {
      inventories.forEach(inventory => {
        data.rates.push({
          id: inventory.id,
          rate: req.body['inv-' + inventory.id].trim()
        });
        utility.customer_type.createWithRate(data).then(() => {
          req.flash('flash_message', 'Customer type successfully added');
          req.flash('flash_color', 'success');
          res.redirect('/customer/customer-type');
          res.end();
        }).catch(err => {
          req.flash('flash_message', 'Error creating customer, please check your inputs');
          req.flash('flash_color', 'danger');
          res.redirect('/customer/customer-type');
          res.end();
        });
      });
    });
  }
});


/* GET home page. */
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
    dependency: '/customer/customers.js',
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
    dependency: '/customer/customer-add.js',
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
      res.render('customer/add', data);
    }).catch(err => {
      console.log(err);
      req.flash('flash_message', 'Database Error. Please try again later.');
      req.flash('flash_color', 'danger');
      res.redirect('/customer');
      res.end();
    });    
  }).catch(err => {
    console.log(err);
    req.flash('flash_message', 'Database Error. Please try again later.');
    req.flash('flash_color', 'danger');
    res.redirect('/customer');
    res.end();
  });

});



router.get('/edit/:id', middleware.auth.loggedIn(), function (req, res, next) {
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
      link: '/customer/'+id,
      name: 'Customer'
    },
    {
      link: '/customer/edit/'+id,
      name: 'Edit'
    },
  ];
  var data = {
    dependency: '/customer/customer-add.js',
    breadcrumbs
  };
  var flash_message = req.flash('flash_message');
  var flash_color = req.flash('flash_color');

  if (flash_message.length !== 0 && flash_color.length !== 0) {
    data.flash_message = flash_message;
    data.flash_color = flash_color;
  }

  res.render('customer/edit', data);
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
      link: '/customer/'+id,
      name: 'Customer'
    },
  ];
  var data = {
    dependency: '/customer/customer.js',
    breadcrumbs
  };
  var flash_message = req.flash('flash_message');
  var flash_color = req.flash('flash_color');

  if (flash_message.length !== 0 && flash_color.length !== 0) {
    data.flash_message = flash_message;
    data.flash_color = flash_color;
  }

  res.render('customer/customer', data);
});

module.exports = router;