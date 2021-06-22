var express = require('express');
const middleware = require('../modules/middleware');
var router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const helpers = require('../modules/helpers');
const utility = require('../modules/utility');
const NepaliDate = require('nepali-date-converter');
const numeral = require('numeral');
const _ = require('lodash');

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
            });
        }).catch(err => {
            console.log(err);
            res.json({
                status: 'fail',
                message: 'DB error'
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

router.get('/stats/month-sale', middleware.auth.loggedIn(), function(req, res, next) {
    var date = req.query.date;
    if (date === undefined) {
        res.status(400).send('Provide date');
    } else {
        utility.misc.month_sale(date).then(total => {
            res.json({total});
        }).catch(err => {
            console.log(err);
            res.status(500).send('Server error');
        });
    }
});

router.get('/inventories', middleware.auth.loggedIn(), function (req, res, next) {
    var bill_date = req.query.date;
    var w_id = req.query.warehouse;
    if (w_id === undefined) {
        w_id = -1;
    } else {
        w_id = parseInt(w_id);
        w_id = isNaN(w_id) ? -1 : w_id;
    }
    var d = new Date();
    if (typeof bill_date !== 'undefined') {
        bill_date = utility.misc.toEnglishDate(bill_date);
        d = new NepaliDate(bill_date).toJsDate();
    }
    utility.inventory.fetchAllInventoryIdWithRecord(d, w_id).then(inventories => {

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
        res.json({
            status: 'fail',
            message: 'DB error'
        });
    });
});

// TODO: Function broken as dates not provided
router.get('/all-bills', middleware.auth.loggedIn(), function (req, res, next) {
    var user_email = req.session.email;
    utility.billing.fetchAll(user_email, new Date(), new Date()).then(function (bills) {
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
        res.json({
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
        res.json({
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
        res.json({
            status: 'fail',
            message: 'DB error'
        });
    });
});

router.get('/billing/last_bill_date', middleware.auth.loggedIn(), function(req, res, next) {
    utility.billing.lastBillDate().then(date => {
        res.json({date: date.toISOString(), np: new NepaliDate(date).format('DD/MM/YYYY')});
    }).catch(err => {
        res.status(500);
        res.json({status: 'error', message: 'database error'});
        console.log(err);
    });
});

router.post('/warehouse/exists', middleware.auth.loggedIn(), function(req, res, next) {
    // Check if warehousename is provided
    if (typeof req.body.name === 'undefined') {
        res.status(400).json({'message': 'Provide warehouse name'});
    } else {
        let name = req.body.name.trim();
        var id = -1;
        if (typeof req.body.id !== 'undefined') {
            try {
                id = parseInt(req.body.id);
            }catch{
                id = -1;
            }
        }
        utility.warehouse.warehouseExist(name, id).then(exists => {
            if (exists) {
                console.log("Warehouse exists");
                res.json({'exists': true});
            }else{
                console.log("Warehouse does not exists");
                res.json({'exists': false});
            }
        }).catch(err => {
            console.log(err);
            res.status(500).json({'message': 'Server error try again later'});
        });
    }
});

router.get('/warehouse/all', middleware.auth.loggedIn(), function(req, res, next) {
    utility.warehouse.fetchWarehouses().then(warehouses => {
        let w_id = req.session.warehouse;
        if (w_id) {
            for (let i = 0; i < warehouses.length; i++) {
                warehouses[i].isPrimary = false;
                if (warehouses[i].id === w_id) {
                    warehouses[i].isPrimary = true;
                }
            }
        }
        res.json({
            warehouses
        });
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

router.get('/stats/customer/sale/:id', middleware.auth.loggedIn(), function (req, res, next) {
    let id = parseInt(req.params.id);
    var date = req.query.date;
    var total = false;
    if (req.query.total !== undefined) {
        total = true;
    }
    if (date === undefined && !total) {
        res.status(400).send('Provide date');
    } else {
        date = date === undefined ? '' : date;
        var total = false;
        if (req.query.total !== undefined) {
            total = true;
        }
        utility.customer.month_sale(id, date, total).then(total => {
            res.json({total});
        }).catch(err => {
            console.log(err);
            res.status(500).send('Server error');
        });
    }
});

router.get('/stats/customer/outstanding/:id', middleware.auth.loggedIn(), function (req, res, next) {
    let id = parseInt(req.params.id);
    utility.customer.fetchOutstanding(id).then(outstanding => {
        res.json({outstanding});
    }).catch(err => {
        console.log(err);
        res.status(500).send("Server error");
    });
});

router.get('/stats/customer/balance/:id', middleware.auth.loggedIn(), function (req, res, next) {
    let id = parseInt(req.params.id);
    utility.ledger.getBalance(id).then(balance => {
        let unsigned_bal = (balance > 0) ? balance : -balance;
        formatted = numeral(unsigned_bal).format('0,0.00');
        if (balance > 0) {
            formatted = formatted + " Dr";
        } else if (balance < 0) {
            formatted = formatted + " Cr";
        }
        res.json({balance, formatted});
    }).catch(err => {
        console.log(err);
        res.status(500).send("Server error");
    })
});


router.get('/analytics/inflow/chart', middleware.auth.loggedIn(), function (req, res, next) {
    let today_np = new NepaliDate(new Date());
    let warehouse = req.query.warehouse;
    if (typeof warehouse === 'undefined') {
        warehouse = 0;
    }
    let np = today_np;
    let promises = [];
    let dates = [];
    for (let i = 0; i < 12; i++) {
        let current_month = np.getMonth();
        // This month last date
        let next_month_start = new NepaliDate(np.getYear(), np.getMonth() + 1, 1).toJsDate();
        if (current_month === 11) {
            next_month_start = new NepaliDate(np.getYear()+1, 0, 1).toJsDate();
        }
        next_month_start.setDate(next_month_start.getDate() - 1);
        let np_last_date = new NepaliDate(next_month_start);

        // This month first date
        let np_first_date = new NepaliDate(np.getYear(), np.getMonth(), 1);

        dates.push({id: i, name: np.format("MMMM", "np")});

        // Set current np as 1 Year back
        promises.push(utility.analytics.fetchCashInflow(np_first_date.toJsDate(), np_last_date.toJsDate(), warehouse).then(val => {
            return {id: i, value: val};
        }));

        let new_np = new NepaliDate(np.getYear(), np.getMonth() - 1, np.getDate());
        if (np.getMonth() === 0) {
            new_np = new NepaliDate(np.getYear() - 1, 11, np.getDate());
        }
        np = new_np;
    }
    Promise.all(promises).then(values => {
        _.sortedIndexBy(values, (obj) => obj.id);
        for (let i = 0; i < values.length; i++) {
            values[i]['name'] = dates[i]['name'];
        }
        res.json({status: "success", data: values});
    }).catch(err => {
        console.log(err);
        res.json({status: "failed"});
    });
});

router.get('/analytics/inflow/table', middleware.auth.loggedIn(), function(req, res, next) {
    if (!req.query.start || !req.query.end) {
        res.status(403).json({status: "error", message: "Please provide start and end date"});
        return;
    }
    
    let start = new Date(req.query.start);
    let end = new Date(req.query.end);
    let warehouse = req.query.warehouse;

    utility.ledger.fetchEntries(start, end, warehouse).then(entries => {
        let response = {data: []};
        for (let entry of entries) {
            entry_data = {
                'id': {id: entry.id, customer_id: entry.customer.id},
                'customer': {name: entry.customer.first_name + ' ' + entry.customer.last_name, id: entry.customer.id},
                'type': entry.type,
                'date': new NepaliDate(entry.date).format('DD/MM/YYYY'),
                'debit': entry.credit,
                'credit': entry.debit,
                'bill': {id: entry.bill?.id, track_id: entry.bill?.track_id},
                'warehouse': entry.user.warehouse.name,
                'user': entry.user.first_name + ' ' + entry.user.last_name
            }
            response.data.push(entry_data);
        }
        res.json(response);
    }).catch(err => {
        console.log(err);
        res.status(500).json({'status': 'error', 'message': 'Something went wrong please try again later'});
    });
});

router.get('/analytics/inflow', middleware.auth.loggedIn(), function(req, res, next) {
    if (!req.query.start || !req.query.end) {
        res.status(403).json({status: "error", message: "Please provide start and end date"});
        return;
    }

    let start = new Date(req.query.start);
    let end = new Date(req.query.end);
    let warehouse = req.query.warehouse;

    utility.analytics.fetchCashInflow(start, end, warehouse).then(data => {
        res.json({status: "success", data});
    }).catch(err => {
        console.log(err);
        res.status(500).json({status: "error", message: "Something went wrong, try again later", err: err});
    });
});

router.get('/users/all', middleware.auth.loggedIn(), function(req, res, next) {
    utility.user.fetchAll().then(users => {
        res.json(users);
    }).catch(err => {
        res.status(500).json(err);
    });
});


module.exports = router;