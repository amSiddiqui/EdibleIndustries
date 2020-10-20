var express = require('express');
const middleware = require('../modules/middleware');
var router = express.Router();

const {
  inventory
} = require('../modules/utility');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const helpers = require('../modules/helpers');


/* GET home page. */
router.get('/', middleware.auth.loggedIn(), function (req, res, next) {
  inventory.fetchAllInventory().then(inventories => {
    for (let index = 0; index < inventories.length; index++) {
      const inventory = inventories[index];
      inventories[index].color = 'primary';
      inventories[index].in_stock = 0;
      inventories[index].total = 0;
      inventories[index].percent = 0;
      if (inventory.inventory_records.length > 0) {
        var inventory_record = inventory.inventory_records[0];
        var percent = inventory_record.in_stock / inventory_record.total;
        percent = percent * 100;
        if (percent < 20) {
          inventories[index].color = 'warning';
        }
        if (percent < 10) {
          inventories[index].color = 'danger';
        }
        inventories[index].in_stock = inventory_record.in_stock;
        inventories[index].total = inventory_record.total;
        inventories[index].percent = percent;
      }
    }
    var flash_message = req.flash('flash_message');
    var flash_color = req.flash('flash_color');
    if (flash_message.length !== 0 && flash_color.length !== 0) {
      res.render('inventory/index', {
        inventories,
        dependency: 'inventory.js',
        flash_message: flash_message,
        flash_color: flash_color
      });
    } else {
      res.render('inventory/index', {
        inventories,
        dependency: 'inventory.js'
      });
    }
    res.end();
  });
});

router.post('/', middleware.auth.loggedIn(), function (req, res, next) {
  let data = {
    name: req.body.name.trim(),
    description: req.body.description.trim(),
    type: req.body.type.trim(),
    cost: req.body.cost.trim()
  };
  data.cost = data.cost === '' ? 0 : data.cost;

  if (data.name.length === 0) {
    req.flash('flash_message', 'Error Creating Inventory Item. Make sure the data entered is correct');
    req.flash('flash_color', 'danger');
    console.log("Data name is empty", data);
    res.redirect('/inventory');
    res.end();
    return;
  }
  if (data.type !== 'purchased' && data.type !== 'manufactured') {
    console.log("Data type is empty", data);
    req.flash('flash_message', 'Error Creating Inventory Item. Make sure the data entered is correct');
    req.flash('flash_color', 'danger');
    res.redirect('/inventory');
    res.end();
    return;
  }
  if (isNaN(data.cost)) {
    console.log("Cost is nan", data);
    req.flash('flash_message', 'Error Creating Inventory Item. Make sure the data entered is correct');
    req.flash('flash_color', 'danger');
    res.redirect('/inventory');
    res.end();
    return;
  } else {
    data.cost = data.cost === 0 ? 0 : parseFloat(data.cost);
  }

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
    res.end();
  });
});


router.get('/edit/:id', middleware.auth.loggedIn(), function (req, res, next) {
  let id = parseInt(req.params.id);
  inventory.getInventory(id).then(inv => {
    var flash_message = req.flash('flash_message');
    var flash_color = req.flash('flash_color');
    var data = {
      inventory: inv,
      dependency: 'inventory-edit.js'
    };
    if (flash_message.length !== 0 && flash_color.length !== 0) {
      data.flash_message = flash_message;
      data.flash_color = flash_color;
    }
    res.render('inventory/edit', data);
    res.end();
  }).catch(err => {
    req.flash('flash_message', 'Error editing inventory, try agina later');
    req.flash('flash_color', 'danger');
    res.redirect('/inventory');
    res.end();
  });
});

router.get('/:id', middleware.auth.loggedIn(), function (req, res, next) {
  res.render('under_construction');
});


router.put('/:id', middleware.auth.loggedIn(), function (req, res, next) {
  let id = parseInt(req.params.id);
  console.log(req.body);
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
    res.redirect('/inventory/edit/'+id);
    res.end();
    return;
  }
  if (data.type !== 'purchased' && data.type !== 'manufactured') {
    console.log("Data type is empty", data);
    req.flash('flash_message', 'Error Updating Inventory Item. Make sure the data entered is correct');
    req.flash('flash_color', 'danger');
    res.redirect('/inventory/edit/'+id);
    res.end();
    return;
  }
  if (isNaN(data.cost)) {
    console.log("Cost is nan", data);
    req.flash('flash_message', 'Error Updating Inventory Item. Make sure the data entered is correct');
    req.flash('flash_color', 'danger');
    res.redirect('/inventory/edit/'+id);
    res.end();
    return;
  } else {
    data.cost = data.cost === 0 ? 0 : parseFloat(data.cost);
  }
  
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
    res.redirect('/inventory/'+id);
    res.end();  
  }).catch(err => {
    console.log(err);
    req.flash('flash_message', 'Error Updating Inventory Item. Database error');
    req.flash('flash_color', 'danger');
    res.redirect('/inventory/'+id);
    res.end();
  });
  
});

router.delete('/:id', middleware.auth.loggedIn(), function (req, res, next) {
  console.log("This delete page is called");
  let id = parseInt(req.params.id);
  res.send("DELETE");
});

router.get('/image/', middleware.auth.loggedIn(), function (req, res, next) {
  var load = req.query.load;
  if (load === '/images/warehouse.svg') {
    res.setHeader('content-disposition', 'inline');
    res.setHeader('filename', path.basename('public'+load));
    res.sendFile(path.resolve('public'+load));
  }else {
    res.setHeader('content-disposition', 'inline');
    res.setHeader('filename', path.basename(load));
    res.sendFile(path.resolve(load));
  }
});

router.post('/image/process', middleware.auth.loggedIn(), function (req, res, next) {
  var tempFolder = Math.floor(10000 + Math.random() * 90000).toString();
  var tempLocation = 'uploads/tmp/' + tempFolder;

  if (!fs.existsSync(tempLocation)) {
    try {
      fs.mkdirSync(tempLocation);
    } catch (error) {
      console.log(error);
    }
  }

  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, tempLocation);
    },

    // By default, multer removes file extensions so let's add them back
    filename: function (req, file, cb) {
      cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
  });

  let upload = multer({
    storage: storage,
    fileFilter: helpers.imageFilter
  }).single('inventory');
  upload(req, res, function (err) {
    if (req.fileValidationError) {
      console.log(req.fileValidationError);
    } else if (!req.file) {
      console.log('Please select an image to upload');
    } else if (err instanceof multer.MulterError) {
      console.log(err);
    } else if (err) {
      console.log(err);
    }
    res.setHeader('content-type', 'text/plain');
    req.session.image_id = tempFolder;
    setTimeout(() => {
      if (fs.existsSync(tempLocation)) {
        fs.rmdir(tempLocation, {
          recursive: true
        });
      }
    }, 15 * 60 * 1000);
    res.send(tempFolder);
    res.end();
  });

});

router.delete('/image/revert', middleware.auth.loggedIn(), function (req, res, next) {
  var image_id = req.session.image_id;
  req.session.image_id = null;
  if (typeof image_id !== 'undefined' && image_id !== null) {
    if (fs.existsSync('uploads/tmp/' + image_id)) {
      fs.rmdir('uploads/tmp/' + image_id, {
        recursive: true
      }, (err) => {
        if (err) {
          console.log(err);
        }
        res.send('Success');
        res.end();
      });
    }
  }
});

module.exports = router;