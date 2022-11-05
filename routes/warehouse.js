var express = require('express');
const middleware = require('../modules/middleware');
const utility = require('../modules/utility');
const NepaliDate = require('nepali-date-converter');

var router = express.Router();

router.get('/add', middleware.auth.loggedIn(), function (req, res, next) {
    if (!utility.misc.checkPermission(req, res))
        return;

    var breadcrumbs = [{
            link: '/',
            name: 'Home'
        },
        {
            link: '/warehouse',
            name: 'Warehouse'
        },
        {
            link: '/warehouse/add',
            name: 'New warehouse'
        }
    ];
    var data = {
        dependency: 'warehouse/warehouse-add.js',
        breadcrumbs
    };
    var flash_message = req.flash('flash_message');
    var flash_color = req.flash('flash_color');

    if (flash_message.length !== 0 && flash_color.length !== 0) {
        data.flash_message = flash_message;
        data.flash_color = flash_color;
    }
    utility.misc.fetchAllZones().then(zones => {
        data.zones = zones;
        res.render('warehouse/add', data);
    });
});

router.get('/:id', middleware.auth.loggedIn(), function (req, res, next) {
    if (!utility.misc.checkPermission(req, res))
        return;

    let id = parseInt(req.params.id);
    var breadcrumbs = [{
            link: '/',
            name: 'Home'
        },
        {
            link: '/warehouse',
            name: 'Warehouse'
        },
        {
            link: '/warehouse/' + id,
            name: 'Warehouse Edit'
        },
    ];
    var data = {
        dependency: 'warehouse/warehouse-add.js',
        breadcrumbs
    };
    var flash_message = req.flash('flash_message');
    var flash_color = req.flash('flash_color');

    if (flash_message.length !== 0 && flash_color.length !== 0) {
        data.flash_message = flash_message;
        data.flash_color = flash_color;
    }
    utility.misc.fetchAllZones().then(zones => {
        data.zones = zones;
        return utility.warehouse.fetchWarehouse(id);
    }).then(warehouse => {
        data.warehouse = warehouse;
        res.render('warehouse/edit', data);
    }).catch(err => {
        console.log(err);
        req.flash('flash_message', 'Server error. Please try again later.');
        req.flash('flash_color', 'danger');
        res.redirect('/warehouse');
    });
});

router.put('/:id', middleware.auth.loggedIn(), function (req, res, next) {
    if (!utility.misc.checkPermission(req, res))
        return;

    let id = parseInt(req.params.id);
    let warehouseName = req.body.name.trim();
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
        address1: req.body.address.trim()
    };
    utility.warehouse.editWarehouse(id, warehouseName, address).then(() => {
        req.flash('flash_message', 'Warehouse saved successfully');
        req.flash('flash_color', 'success');
        res.redirect('/warehouse');
    }).catch(err => {
        console.log(err);
        req.flash('flash_message', 'Server error try again later.');
        req.flash('flash_color', 'danger');
        res.redirect('/warehouse');
    });
});

router.post('/', middleware.auth.loggedIn(), function (req, res, next) {
    if (!utility.misc.checkPermission(req, res))
        return;

    let warehouseName = req.body.name.trim();
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
        address1: req.body.address.trim()
    };

    utility.warehouse.addWarehouse(warehouseName, address, false).then(() => {
        req.flash('flash_message', 'Warehouse added successfully');
        req.flash('flash_color', 'success');
        res.redirect('/warehouse');
    }).catch(err => {
        console.log(err);
        req.flash('flash_message', 'Server error try again later.');
        req.flash('flash_color', 'danger');
        res.redirect('/warehouse/add');
    });

});

router.get('/', middleware.auth.loggedIn(), function (req, res, next) {
    if (!utility.misc.checkPermission(req, res))
        return;

    var breadcrumbs = [{
            link: '/',
            name: 'Home'
        },
        {
            link: '/warehouse',
            name: 'Warehouse'
        },
    ];
    var data = {
        dependency: 'warehouse/warehouse.js',
        breadcrumbs
    };
    var flash_message = req.flash('flash_message');
    var flash_color = req.flash('flash_color');

    if (flash_message.length !== 0 && flash_color.length !== 0) {
        data.flash_message = flash_message;
        data.flash_color = flash_color;
    }

    utility.warehouse.fetchWarehouses().then(warehouses => {
        data.warehouses = warehouses;
        res.render('warehouse/index', data);
    });
});

module.exports = router;