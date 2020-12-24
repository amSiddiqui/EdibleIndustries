var express = require('express');
const middleware = require('../modules/middleware');
const NepaliDate = require('nepali-date-converter');
var router = express.Router();

const {
  inventory
} = require('../modules/utility');
const fs = require('fs');
const utility = require('../modules/utility');
const { invertBy } = require('lodash');


router.post('/batch/:id', middleware.auth.loggedIn(), function (req, res, next) {
  let id = parseInt(req.params.id);
  utility.inventory.addBatch(id, {
    name: req.body['batch-name'],
    quantity: utility.misc.toNumber(req.body['batch-quantity'])
  }).then(function() {
    res.redirect('/inventory/'+id);
  }).catch(err => {
    console.log(err);
    req.flash('flash_message', 'Error adding batch, try agina later');
    req.flash('flash_color', 'danger');
    res.redirect('/inventory/'+id);
  });
});

router.delete('/batch/:id', middleware.auth.loggedIn(), function (req, res, next) {
  let id = parseInt(req.params.id);  
  var batch_id = utility.misc.toNumber(req.body['batch-id']);
  utility.inventory.deleteBatch(batch_id).then(() => {
    res.redirect('/inventory/'+id);
  }).catch(err => {
    console.log(err);
    req.flash('flash_message', 'Error deleting batch, try agina later');
    req.flash('flash_color', 'danger');
    res.redirect('/inventory/'+id);
  });
});

router.put('/batch/:id', middleware.auth.loggedIn(), function (req, res, next) {
  var data = {
    name: req.body['batch-name'],
    quantity: utility.misc.toNumber(req.body['batch-quantity'])
  };
  let id = parseInt(req.params.id);  
  var batch_id = utility.misc.toNumber(req.body['batch-id']);
  utility.inventory.editBatch(batch_id, data).then(() => {
    res.redirect('/inventory/'+id);
  }).catch(err => {
    console.log(err);
    req.flash('flash_message', 'Error editing batch, try agina later');
    req.flash('flash_color', 'danger');
    res.redirect('/inventory/'+id);
  });
});

router.delete('/record/:id', middleware.auth.loggedIn(), function (req, res, next) {
  var record_id = req.body.record_id.trim();
  record_id = utility.misc.toNumber(record_id);
  let id = parseInt(req.params.id);
  console.log("Deleting record with record id: ", record_id);
  utility.inventory.deleteRecord(record_id).then(function() {
    req.flash('flash_message', 'Successfully deleted record');
    req.flash('flash_color', 'success');
    res.redirect('/inventory/'+id);
  }).catch(err => {
    console.log(err);
    req.flash('flash_message', 'Error deleting record, try agina later');
    req.flash('flash_color', 'danger');
    res.redirect('/inventory/'+id);
  });
});

router.put('/edit/:id', middleware.auth.loggedIn(), function (req, res, next) {
  let id = parseInt(req.params.id);
  var data = {
    value: req.body.quantity,
    batch_id: req.body.batch,
  };

  var record_date = req.body.record_date.trim();
  data.created = new Date();
  if (typeof record_date !== 'undefined' && record_date != null && record_date.length !== 0) {
    record_date = utility.misc.toEnglishDate(record_date);
    data.created = new NepaliDate(record_date).toJsDate();
  }
  data.value = utility.misc.toNumber(data.value);
  data.batch_id = utility.misc.toNumber(data.batch_id);
  data.cost = utility.misc.toNumberFloat(req.body.inventory_cost.trim());
  utility.inventory.editRecord(id, data).then(()=>{
    req.flash('flash_message', 'Record Added');
    req.flash('flash_color', 'success');
    res.redirect('/inventory/' + id);
  }).catch(err => {
    console.log(err);
    req.flash('flash_message', 'Error Adding Record. Check your inputs.');
    req.flash('flash_color', 'danger');
    console.log("Data name is empty: ", data);
    res.redirect('/inventory/' + id);
  });
});

router.get('/', middleware.auth.loggedIn(), function (req, res, next) {
  var breadcrumbs = [{
      link: '/',
      name: 'Home'
    },
    {
      link: '/inventory',
      name: 'Inventory'
    },
  ];

  inventory.fetchAllInventory().then(inventories => {
    for (let index = 0; index < inventories.length; index++) {
      inventories[index].color = 'primary';
      var percent = inventories[index].in_stock / inventories[index].total * 100;
      inventories[index].percent = percent;
      if (percent < 20) {
        inventories[index].color = 'warning';
      }
      if (percent < 10) {
        inventories[index].color = 'danger';
      }

    }
    var flash_message = req.flash('flash_message');
    var flash_color = req.flash('flash_color');
    if (flash_message.length !== 0 && flash_color.length !== 0) {
      res.render('inventory/index', {
        inventories,
        dependency: '/inventory/inventory.js',
        flash_message: flash_message,
        flash_color: flash_color,
        breadcrumbs
      });
    } else {
      res.render('inventory/index', {
        inventories,
        dependency: '/inventory/inventory.js',
        breadcrumbs

      });
    }
  });
});


router.get('/edit/:id', middleware.auth.loggedIn(), function (req, res, next) {
  let id = parseInt(req.params.id);
  var breadcrumbs = [{
      link: '/',
      name: 'Home'
    },
    {
      link: '/inventory',
      name: 'Inventory'
    },
    {
      link: '/inventory/' + id,
      name: 'Item'
    },
    {
      link: '/inventory/edit/' + id,
      name: 'Edit'
    },
  ];
  inventory.fetchInventory(id).then(inv => {
    var flash_message = req.flash('flash_message');
    var flash_color = req.flash('flash_color');
    var data = {
      inventory: inv,
      dependency: '/inventory/inventory-edit.js',
      breadcrumbs
    };
    if (flash_message.length !== 0 && flash_color.length !== 0) {
      data.flash_message = flash_message;
      data.flash_color = flash_color;
    }
    res.render('inventory/edit', data);
  }).catch(err => {
    req.flash('flash_message', 'Error editing inventory, try agina later');
    req.flash('flash_color', 'danger');
    res.redirect('/inventory');
  });
});

router.get('/:id', middleware.auth.loggedIn(), function (req, res, next) {
  let id = parseInt(req.params.id);
  var breadcrumbs = [{
      link: '/',
      name: 'Home'
    },
    {
      link: '/inventory',
      name: 'Inventory'
    },
    {
      link: '/inventory/' + id,
      name: 'Item'
    },
  ];
  var data = {};
  inventory.fetchInventory(id).
  then(inv => {
    var flash_message = req.flash('flash_message');
    var flash_color = req.flash('flash_color');

    data = {
      inventory: inv,
      dependency: '/inventory/inventory-item.js',
      recordsExists: inv.inventory_records.length !== 0,
      in_stock: inv.in_stock,
      total: inv.total,
      color: 'success',
      breadcrumbs
    };
    data.toNepaliDate = (d) => {
      return new NepaliDate(d).format("DD/MM/YYYY", 'np');
    };
    data.toNepaliDateFull = (d) => {
      return new NepaliDate(d).format("ddd, DD MMMM YYYY", 'np');
    };
    var percent = data.in_stock / data.total;
    percent = percent * 100;
    if (percent < 20) {
      data.color = 'warning'
    }
    if (percent < 10) {
      data.color = 'danger'
    }
    data.percent = percent;
    if (flash_message.length !== 0 && flash_color.length !== 0) {
      data.flash_message = flash_message;
      data.flash_color = flash_color;
    }
    return utility.inventory.fetchBills(id);
  }).
  then(bills => {
    for (let i = 0; i < bills.length; i++) {
      const bill = bills[i];
      var total_items = 0;
      const transactions = bill.bill_transactions;
      for(let j = 0; j < transactions.length; j++)
      {
        const tr = transactions[j];
        if (tr.inventory_record.inventory.id == id && tr.type != 'returned') {
          total_items += tr.quantity;
        }
      }
      bills[i].total_items = total_items;
      

      bills[i].nepali_date = new NepaliDate(bill.createdAt).format("DD/MM/YYYY");
      if (!bill.paid) {
        bills[i].nepali_due = new NepaliDate(bill.dueDate).format("DD/MM/YYYY");
        if (bill.dueDate < bill.createdAt) {
          bills[i].danger = true;
        }else{
          bills[i].danger = false;
        }
      }
    }
    data.bills = bills;
    return utility.inventory.fetchBatches(id);
  }).
  then(batches => {
    data.batches = batches;
    res.render('inventory/item', data);
  }).
  catch(err => {
    console.log(err);
    req.flash('flash_message', 'Error opening inventory, try agina later');
    req.flash('flash_color', 'danger');
    res.redirect('/inventory');
  });
});


router.post('/:id', middleware.auth.loggedIn(), function (req, res, next) {
  let id = parseInt(req.params.id);
  var data = {
    type: req.body.type,
    value: req.body.quantity,
    batch_id: req.body.batch,
  };


  var record_date = req.body.record_date.trim();
  data.created = new Date();
  if (typeof record_date !== 'undefined' && record_date != null && record_date.length !== 0) {
    record_date = utility.misc.toEnglishDate(record_date);
    data.created = new NepaliDate(record_date).toJsDate();
  }

  data.value = utility.misc.toNumber(data.value);
  data.batch_id = utility.misc.toNumber(data.batch_id);
  data.cost = utility.misc.toNumberFloat(req.body.inventory_cost.trim());
  var user_email = req.session.email;
  if (typeof user_email === 'undefined') user_email = 'gt_ams@yahoo.in';
  utility.inventory.addRecord(id, data, user_email).then(()=>{
    req.flash('flash_message', 'Record Added');
    req.flash('flash_color', 'success');
    res.redirect('/inventory/' + id);
  }).catch(err => {
    console.log(err);
    req.flash('flash_message', 'Error Adding Record. Check your inputs.');
    req.flash('flash_color', 'danger');
    console.log("Data name is empty: ", data);
    res.redirect('/inventory/' + id);
  });

});


router.put('/:id', middleware.auth.loggedIn(), function (req, res, next) {
  let id = parseInt(req.params.id);
  let data = {
    name: req.body.name.trim(),
    description: req.body.description.trim(),
    type: req.body.type.trim(),
    cost: req.body.cost.trim(),
    inventory: req.body.inventory
  };
  data.cost = data.cost === '' ? 0 : data.cost;

  if (data.name.length === 0) {
    req.flash('flash_message', 'Error Updating Inventory Item. Make sure the data entered is correct');
    req.flash('flash_color', 'danger');
    console.log("Data name is empty", data);
    res.redirect('/inventory/edit/' + id);
    return;
  }
  if (data.type !== 'purchased' && data.type !== 'manufactured') {
    console.log("Data type is empty", data);
    req.flash('flash_message', 'Error Updating Inventory Item. Make sure the data entered is correct');
    req.flash('flash_color', 'danger');
    res.redirect('/inventory/edit/' + id);
    return;
  }
  
  data.cost = utility.misc.toNumberFloat(data.cost);
  

  var image_id = req.session.image_id;
  req.session.image_id = null;
  if (typeof image_id !== 'undefined' && image_id !== null && data.inventory.length !== 0) {
    if (fs.existsSync('uploads/tmp/' + image_id)) {
      var folder = 'uploads/tmp/' + image_id;
      var files = fs.readdirSync(folder);
      if (files.length > 0) {
        var image = files[0];
        fs.copyFileSync(folder + '/' + image, 'uploads/' + image);
        data.inventory = '/uploads/' + image;
      }
      fs.rmdirSync(folder, {
        recursive: true
      });
    }
  }

  inventory.updateInventory(id, data).then(() => {
    req.flash('flash_message', 'Inventory Item Successfully Updated');
    req.flash('flash_color', 'success');
    res.redirect('/inventory/' + id);
  }).catch(err => {
    console.log(err);
    req.flash('flash_message', 'Error Updating Inventory Item. Database error');
    req.flash('flash_color', 'danger');
    res.redirect('/inventory/' + id);
  });

});

router.delete('/:id', middleware.auth.loggedIn(), function (req, res, next) {
  console.log("This delete page is called");
  let id = parseInt(req.params.id);
  inventory.deleteInventory(id).then(() => {
    req.flash('flash_message', 'Inventory Item Successfully Deleted');
    req.flash('flash_color', 'success');
    res.redirect('/inventory');
  });
});


router.post('/', middleware.auth.loggedIn(), function (req, res, next) {
  let data = {
    name: req.body.name.trim(),
    description: req.body.description.trim(),
    type: req.body.type.trim(),
    cost: req.body.cost.trim(),
    batch_names: req.body['batch_name[]'],
    batch_quantity: req.body['batch_quantity[]']
  };

  if (typeof data.batch_names == 'string') {
    data.batch_names = [data.batch_names];
  }

  if (typeof data.batch_quantity == 'string') {
    data.batch_quantity = [data.batch_quantity];
  }  
  
  for (let index = 0; index < data.batch_quantity.length; index++) {
    data.batch_quantity[index] = utility.misc.toNumber(data.batch_quantity[index]);
  }
  
  data.cost = utility.misc.toNumberFloat(data.cost);
  
  if (data.name.length === 0) {
    req.flash('flash_message', 'Error Creating Inventory Item. Make sure the data entered is correct');
    req.flash('flash_color', 'danger');
    console.log("Data name is empty", data);
    res.redirect('/inventory');
    return;
  }
  if (data.type !== 'purchased' && data.type !== 'manufactured') {
    console.log("Data type is empty", data);
    req.flash('flash_message', 'Error Creating Inventory Item. Make sure the data entered is correct');
    req.flash('flash_color', 'danger');
    res.redirect('/inventory');
    return;
  }
  data.cost = utility.misc.toNumberFloat(data.cost);

  var image_id = req.session.image_id;
  req.session.image_id = null;
  if (typeof image_id !== 'undefined' && image_id !== null) {
    if (fs.existsSync('uploads/tmp/' + image_id)) {
      var folder = 'uploads/tmp/' + image_id;
      var files = fs.readdirSync(folder);
      if (files.length > 0) {
        var image = files[0];
        fs.copyFileSync(folder + '/' + image, 'uploads/' + image);
        data.image = '/uploads/' + image;
      }
      fs.rmdirSync(folder, {
        recursive: true
      });
    }
  }
  inventory.createInventory(data).then(inv => {
    console.log("Inventory Created: ");
    req.flash('flash_message', 'Inventory ' + data.name + ' Successfully Added');
    req.flash('flash_color', 'success');
    res.redirect('/inventory');
  });
});


module.exports = router;