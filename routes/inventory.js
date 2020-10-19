var express = require('express');
const middleware = require('../modules/middleware');
var router = express.Router();
const {
  Inventory
} = require('../models/Models');
const utility = require('../modules/utility');
const { inventory } = require('../modules/utility');

/* GET home page. */
router.get('/', middleware.auth.loggedIn(), function (req, res, next) {
  utility.inventory.fetchAllInventory().then(inventories => {
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
    res.render('inventory/index', {inventories});
  });
});

module.exports = router;