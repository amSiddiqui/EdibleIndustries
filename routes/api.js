var express = require('express');
const middleware = require('../modules/middleware');
var router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const helpers = require('../modules/helpers');
const utility = require('../modules/utility');
const NepaliDate = require('nepali-date-converter');


router.get('/image', middleware.auth.loggedIn(), function (req, res, next) {
    var load = req.query.load;
    console.log(load);
    if (load === '/images/warehouse.svg') {
        res.setHeader('content-disposition', 'inline');
        res.setHeader('filename', path.basename('public' + load));
        res.sendFile(path.resolve('public' + load));
    } else if (load === '/images/placeholder-vertical.jpg') {
        res.setHeader('content-disposition', 'inline');
        res.setHeader('filename', path.basename('public' + load));
        res.sendFile(path.resolve('public' + load));
    } else {
        res.setHeader('content-disposition', 'inline');
        res.setHeader('filename', path.basename(load));
        if (load[0] == '/') {
            load = load.substring(1);
        }
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

router.get('/district/:id', middleware.auth.loggedIn(), function (req, res, next) {
    let id = parseInt(req.params.id);
    utility.misc.fetchAllDistrict(id).then(districts => {
        res.json({
            status: 'success',
            districts
        });
    }).catch(err => {
        console.log(err);
        res.json({
            status: 'fail',
            message: 'DB error'
        });
    });
});

router.get('/post-office/:id', middleware.auth.loggedIn(), function (req, res, next) {
    let id = parseInt(req.params.id);
    utility.misc.fetchAllPostOffice(id).then(post_offices => {
        res.json({
            status: 'success',
            post_offices
        });
    }).catch(err => {
        console.log(err);
        res.json({
            status: 'fail',
            message: 'DB error'
        });
    });
});

router.get('/customer-type/:id', middleware.auth.loggedIn(), function (req, res, next) {
    let id = parseInt(req.params.id);
    utility.customer_type.fetchCustomerType(id).then(customer_type => {
        utility.inventory.fetchAllInventoryID().then(inventories => {
            res.json({
                status: 'success',
                customer_type,
                inventories
            });
        });
    }).catch(err => {
        console.log(err);
        res.json({
            status: 'fail',
            message: 'DB error'
        });
    });
});

router.get('/customer/:id', middleware.auth.loggedIn(), function (req, res, next) {
    let id = parseInt(req.params.id);
    utility.customer.fetchCustomer(id).then(customer => {
        utility.inventory.fetchAllInventoryID().then(inventories => {
            utility.customer_type.fetchCustomerType(customer.customer_type.id).then(customer_type => {
                res.json({
                    status: 'success',
                    customer_type,
                    inventories,
                    customer
                });
            }).catch(err => {
                console.log(err);
                res.json({
                    status: 'fail',
                    message: 'DB error'
                });
            });;
        }).catch(err => {
            console.log(err);
            res.json({
                status: 'fail',
                message: 'DB error'
            });
        });;
    }).catch(err => {
        console.log(err);
        res.json({
            status: 'fail',
            message: 'DB error'
        });
    });
});

router.get('/inventories', middleware.auth.loggedIn(), function (req, res, next) {
    var bill_date = req.query.date;
    var d = new Date();
    if (typeof bill_date !== 'undefined') {
        bill_date = utility.misc.toEnglishDate(bill_date);
        d = new NepaliDate(bill_date).toJsDate();
    }
    utility.inventory.fetchAllInventoryIdWithRecord(d).then(inventories => {

        for (let i = 0; i < inventories.length; i++) {
            const inv = inventories[i];
            inventories[i].dataValues.in_stock = inv.in_stock;
            inventories[i].dataValues.total = inv.total;
        }

        res.json({
            status: 'success',
            inventories
        });
    }).catch(err => {
        console.log(err);
        res.json({
            status: 'fail',
            message: 'DB error'
        });
    });
});

router.get('/check-item-rented/:id', middleware.auth.loggedIn(), function (req, res, next) {
    let id = parseInt(req.params.id);
    utility.billing.areItemsRented(id).then(function (result) {
        res.json({
            status: 'success',
            result
        });
    }).catch(function (err) {
        console.log(err);
        req.json({
            status: 'fail',
            message: 'DB error'
        });
    });
});

router.get('/all-bills', middleware.auth.loggedIn(), function (req, res, next) {
    var user_email = req.session.email;
    utility.billing.fetchAll(user_email).then(function (bills) {
        var bill_query = [];
        bills.forEach(bill => {
            if (bill.customer.organization.length == 0) {
                var detail = bill.track_id + ' - ' + bill.customer.first_name + ' ' + bill.customer.last_name + ' - ' + (new NepaliDate(bill.createdAt).format('DD/MM/YYYY'));
                detail = detail.toLowerCase();
                bill_query.push({
                    id: bill.id,
                    detail
                });
            } else {
                var detail = bill.track_id + ' - ' + bill.customer.organization + ' - ' + (new NepaliDate(bill.createdAt).format('DD/MM/YYYY'));
                detail = detail.toLowerCase();
                bill_query.push({
                    id: bill.id,
                    detail
                });
            }
        });
        res.json({
            status: 'success',
            bills: bill_query
        });
    }).catch(err => {
        console.log(err);
        req.json({
            status: 'fail',
            message: 'DB error'
        });
    })
});


router.get('/all-customers', middleware.auth.loggedIn(), function (req, res, next) {
    utility.customer.fetchAllCustomerID().then(function (customers) {
        var customer_query = [];
        customers.forEach(customer => {
            if (customer.organization.length == 0) {
                var detail = customer.first_name + ' ' + customer.last_name;
                detail = detail.toLowerCase();
                customer_query.push({
                    id: customer.id,
                    detail
                });
            } else {
                var detail = customer.organization + ' - ' + customer.first_name + ' ' + customer.last_name;
                detail = detail.toLowerCase();
                customer_query.push({
                    id: customer.id,
                    detail
                });
            }
        });
        res.json({
            status: 'success',
            customers: customer_query
        });
    }).catch(err => {
        console.log(err);
        req.json({
            status: 'fail',
            message: 'DB error'
        });
    })
});

router.post('/bill-no', middleware.auth.loggedIn(), function (req, res, next) {
    var bill_date = req.body.bill_date.trim();
    var bd = null;
    bill_date = utility.misc.toEnglishDate(bill_date);
    bd = new NepaliDate(bill_date).toJsDate();
    utility.billing.getBillNo(bd).then(bill_no => {
        res.json({
            status: 'success',
            bill_no: bill_no
        });
    }).catch(err => {
        req.json({
            status: 'fail',
            message: 'DB error'
        });
    });
});

router.get('/bills', middleware.auth.loggedIn, function (req, res, next) {
    var today = new Date();
    var user_email = req.session.email;
    var data = {};
    
    utility.billing.fetchAll(user_email).then(bills => {
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
    });
});

router.post('/inventory/report/:id', middleware.auth.loggedIn(), function (req, res, next) {
    let id = parseInt(req.params.id);
    var start = req.body.from;
    var end = req.body.to;
    var temp = utility.misc.toEnglishDate(start);
    start = new NepaliDate(temp).toJsDate();
    temp = utility.misc.toEnglishDate(end);
    end = new NepaliDate(temp).toJsDate();
    if (start > end) {
        res.json({
            status: 'error',
            message: 'From cannot be larger than To.'
        });
    } else {
        utility.inventory.fetchReport(id, start, end).then(function (data) {
            if (data == null) {
                res.json({
                    status: 'error',
                    message: 'Error Generating Report, please check the dates.'
                });
            } else {

                res.json({
                    status: 'success',
                    message: 'Report Generated'
                });
            }
        }).catch(error => {
            console.log(error);
            res.json({
                status: 'error',
                message: 'Error Generating Report try again later.'
            });
        });
    }
});

router.get('/customer/rented/:id', middleware.auth.loggedIn(), function (req, res, next) {
    let id = parseInt(req.params.id);
    utility.customer.fetchTotalRented(id).then(data => {
        res.json({
            status: 'success',
            message: 'Report Generated',
            rented: data
        });
    }).catch(err => {
        console.log(err);
        res.json({
            status: 'error',
            message: 'Error Generating Report try again later.'
        });
    });
});

module.exports = router;