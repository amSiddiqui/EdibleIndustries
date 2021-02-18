const models = require('../models/Models');
const NepaliDate = require('nepali-date-converter');
var _ = require('lodash');
var numeral = require('numeral');

function getMethods(obj) {
    var result = [];
    for (var id in obj) {
        try {
            if (typeof (obj[id]) == "function") {
                result.push(id + ": " + obj[id].toString());
            }
        } catch (err) {
            result.push(id + ": inaccessible");
        }
    }
    return result;
}


const {
    Op
} = require('sequelize');
const {
    sequelize
} = require('./database');
const e = require('express');


function toNumberFloat(num) {
    if (typeof num == 'number') return num;
    if (num.trim().length == 0 || isNaN(num)) {
        return 0;
    }
    return parseFloat(num);
}

function toNumber(num) {
    if (typeof num == 'number') return num;
    if (num.trim().length == 0 || isNaN(num)) {
        return 0;
    }
    return parseInt(num);
}

function getThisMonthStart() {
    var dt = new Date();
    while (true) {
        dt.setDate(dt.getDate() - 1);
        var np = new NepaliDate(dt);
        if (np.getDate() == 1) break;
    }
    return dt;
}

async function insertInventoryRecord(rec, batch_id='') {
    var batch = null;
    var batch_value = rec.value;
    if (batch_id !== '') {
        batch = await models.InventoryBatch.findByPk(batch_id);
        rec.value = batch_value * batch.quantity;
    }
    var inventory_record = await models.InventoryRecord.create(rec);
    if (batch_id !== '') {
        var inventory_batch_record = await batch.createInventory_batch_record({
            type: rec.type,
            value: batch_value,
            createdAt: rec.recordDate
        });
        await inventory_record.setInventory_batch_record(inventory_batch_record);
    }
    return inventory_record;
}

async function calculateTotalInventory(inv_id, end_date) {
    var inventory = await models.Inventory.findByPk(inv_id);
    var records = await inventory.getInventory_records({
        where: {
            recordDate: {
                [Op.lte]: end_date
            }
        },
        order: [
            ['recordDate']
        ]
    });
    var total = 0;
    var in_stock = 0;
    records.forEach(rec => {
        if (rec.type == 'purchased' || rec.type == 'manufactured' || rec.type == 'returned') {
            in_stock = in_stock + rec.value;
        } else if (rec.type == 'rented' || rec.type == 'discarded' || rec.type == 'sold') {
            in_stock = in_stock - rec.value;
        }


        if (rec.type == 'purchased' || rec.type == 'manufactured') {
            total = total + rec.value;
        } else if (rec.type == 'discarded' || rec.type == 'sold') {
            total = total - rec.value;
        }
    });

    return {
        total, in_stock
    };
} 


module.exports = {
    user: {
        fetchAll: async () => {
            return await models.User.findAll();
        },
        fetch: async (id) => {
            return await models.User.findByPk(id);
        },
        createUser: (data) => {
            return models.User.create({
                ...data
            });
        },
        editUser: async (id, data) => {
            var user = await models.User.findByPk(id);
            user.first_name = data.first_name;
            user.last_name = data.last_name;
            user.email = data.email;
            user.user_type = data.user_type;

            if (data.change_password === 1) {
                user.password = data.password;
            }
            await user.save();
        },
        userExists: (email, password) => {
            return new Promise((resolve, reject) => {
                models.User.findOne({
                    where: {
                        email: email
                    }
                }).then(function (user) {
                    if (user == null) {
                        resolve({
                            exists: false
                        });
                    }
                    if (user.correctPassword(password)) {
                        resolve({
                            exists: true,
                            first_name: user.first_name,
                            user_type: user.user_type
                        });
                    } else {
                        resolve({
                            exists: false
                        });
                    }
                }).catch(err => {
                    console.log(err);
                    reject('DB ERROR');
                });
            });
        }
    },

    inventory: {
        createInventory: async (data) => {
            var inventory = await models.Inventory.create({
                name: data.name,
                description: data.description,
                type: data.type,
                cost: data.cost
            });

            for (let index = 0; index < data.batch_names.length; index++) {
                const name = data.batch_names[index];
                const q = data.batch_quantity[index];

                await inventory.createInventory_batch({
                    name: name,
                    quantity: q
                });
            }
            return inventory;
        },
        fetchInventory: async (id) => {
            var inv = await models.Inventory.findOne({
                where: {
                    id
                },
                include: [{
                    model: models.InventoryRecord,
                    order: [
                        [sequelize.col('recordDate')]
                    ],
                    include: [{
                        model: models.User
                    },{
                        model: models.InventoryBatchRecord,
                        include: [{
                            model: models.InventoryBatch
                        }]
                    }]
                },{
                    model: models.InventoryBatch
                }]
            });
            var res = await calculateTotalInventory(inv.id, new Date());
            inv.total = res.total;
            inv.in_stock = res.in_stock;

            for (let i = 0; i < inv.inventory_records.length; i++) { var record = inv.inventory_records[i];
                if (record.type == 'sold') {
                    var txn = await record.getBill_transaction({
                        include: [{
                            model: models.Bill
                        }]
                    });
                    inv.inventory_records[i].bill_id = txn.bill.track_id;
                }
            }
            
            return inv;
        },
        updateInventory: async (id, data) => {
            var inv = await models.Inventory.findByPk(id);
            if (data.inventory === '') {
                inv.image = '/images/warehouse.svg';
            } else {
                inv.image = data.inventory;
            }
            inv.name = data.name;
            inv.description = data.description;
            inv.type = data.type;
            inv.cost = data.cost;
            await inv.save();
            return true;
        },
        deleteInventory: async (id) => {
            var inv = await models.Inventory.findByPk(id);
            await inv.destroy();
            return true;
        },
        fetchAllInventory: async () => {
            var inventorries = await models.Inventory.findAll({
                include: [
                    {
                        model: models.InventoryRecord,
                        order: [
                            [models.InventoryRecord, 'id', 'DESC']
                        ]
                    }, {
                        model: models.InventoryBatch
                    }]
            });

            for (let i = 0; i < inventorries.length; i++) {
                const inv = inventorries[i];
                var res = await calculateTotalInventory(inv.id, new Date());
                inv.in_stock = res.in_stock;
                inv.total = res.total;
            }

            return inventorries;
        
        },
        fetchAllInventoryID: () => {
            return models.Inventory.findAll({
                include: [
                    {
                        model: models.InventoryBatch
                    }
                ]
            });
        },
        fetchAllInventoryIdWithRecord: async (limit_date) => {
            var inventories = await models.Inventory.findAll({
                include: [{
                    model: models.InventoryRecord,
                    order: [
                        [sequelize.col('id'), 'DESC']
                    ],
                    limit: 1
                }, {
                    model: models.InventoryBatch
                }]
            });

            for (let i = 0; i < inventories.length; i++) {
                const inv = inventories[i];
                var res = await calculateTotalInventory(inv.id, limit_date);
                inventories[i].in_stock = res.in_stock;
                inventories[i].total = res.total;
            }
            return inventories;
        },
        fetchBatches: (id) => {
            return models.InventoryBatch.findAll({
                where: {
                    inventory_id: id
                }
            });
        },
        addBatch: async (id, data) => {
            var inventory = await models.Inventory.findByPk(id);
            return inventory.createInventory_batch({
                name: data.name,
                quantity: data.quantity
            });
        },
        editBatch: async (id, data) => {
            var batch = await models.InventoryBatch.findByPk(id);
            batch.name= data.name;
            batch.quantity = data.quantity;
            await batch.save();
            return true;
        },
        deleteBatch: async (id) => {
            var batch = await models.InventoryBatch.findByPk(id);
            await batch.destroy();
            return true;
        },
        addRecord: async (id, data, user_email) => {
            var user = await models.User.findOne({
                where: {
                    email: user_email
                }
            });

            var inventory = await models.Inventory.findByPk(id);
            var inventory_record = await insertInventoryRecord({
                type: data.type,
                value: data.value,
                recordDate: data.created,
                cost: data.cost
            }, data.batch_id);
            inventory_record.setInventory(inventory);
            inventory_record.setUser(user);
            await inventory_record.save();
        },
        editRecord: async (id, data) => {
            var inventory_record = await models.InventoryRecord.findByPk(id);
            var batch = await models.InventoryBatch.findByPk(data.batch_id);
            var batch_value = data.value;
            inventory_record.value = batch_value * batch.quantity;
            inventory_record.recordDate = data.created;
            inventory_record.cost = data.cost;
            await inventory_record.save();
            var inventory_batch_record = await batch.createInventory_batch_record({
                type: inventory_record.type,
                value: batch_value,
                createdAt: data.created
            });
            var old_inv_batch_record = await inventory_record.getInventory_batch_record();
            await old_inv_batch_record.destroy();
            await inventory_record.setInventory_batch_record(inventory_batch_record);
            await inventory_batch_record.save();

            var inventory_id = await inventory_record.getInventory();
            return inventory_id.id;
        },
        deleteRecord: async (id) => {
            var record = await models.InventoryRecord.findByPk(id);
            var batch_record = await record.getInventory_batch_record();
            await batch_record.destroy();
            await record.destroy();
            return true;
        },
        fetchBills: async (id, user_email) => {
            var user = await models.User.findOne({
                where: {
                    email: user_email
                }
            });
            var bills = [];
            if (user.user_type === 'Admin') {
                bills = await models.Bill.findAll({
                    include: [{
                            model: models.BillTransaction,
                            include: [{
                                model: models.InventoryRecord,
                                include: [{
                                    model: models.Inventory
                                }]
                            }]
                        },
                        {
                            model: models.Customer,
                            include: [{
                                model: models.CustomerType
                            }]
                        },{
                            model: models.User
                        }
                    ]
                });
            }else{
                bills = await models.Bill.findAll({
                    include: [{
                            model: models.BillTransaction,
                            include: [{
                                model: models.InventoryRecord,
                                include: [{
                                    model: models.Inventory
                                }]
                            }]
                        },
                        {
                            model: models.Customer,
                            include: [{
                                model: models.CustomerType
                            }]
                        },{
                            model: models.User,
                            where: {
                                id: user.id
                            }
                        }
                    ]
                });
            }
            
            var inv_bills = [];
            for (let i = 0; i < bills.length; i++) {
                const bill = bills[i];
                const transactions = bill.bill_transactions;
                for (let j = 0; j < transactions.length; j++) {
                    const tr = transactions[j];
                    if (tr.inventory_record.inventory.id == id) {
                        bill.inv_total = tr.quantity * tr.rate;
                        inv_bills.push(bill);
                        break;
                    }
                }
            }
            
            for (let j = 0; j < inv_bills.length; j++) {
                var rented = false;
                var bill = inv_bills[j];
                for (let i = 0; i < bill.bill_transactions.length; i++) {
                    const tr = bill.bill_transactions[i];
                    if (tr.type == 'rented') {
                        const returns = await tr.getReturn();
                        var total_return = _.sumBy(returns, (o) => o.quantity);
                        if (total_return < tr.quantity) {
                            rented = true;
                            break;
                        }
                    }
                }
                inv_bills[j].rented = rented;
            }

            return inv_bills;
        },
        fetchReport: async (id, start, end) => {
            if (!start instanceof Date || !end instanceof Date) {
                return null;
            }

            if (start > end) {
                return null;
            }

            // var bills = await models.Bill.findAll({
            //     where: {
            //         [Op.between]: [start, end]
            //     },
            //     include: [{
            //             model: models.BillTransaction,
            //             include: [{
            //                 model: models.InventoryRecord,
            //                 include: [{
            //                     model: models.Inventory
            //                 }]
            //             }]
            //         },
            //         {
            //             model: models.Customer,
            //             include: [{
            //                 model: models.CustomerType
            //             }]
            //         }
            //     ]
            // });
            // var inv_bills = [];
            // for (let i = 0; i < bills.length; i++) {
            //     const bill = bills[i];
            //     const transactions = bill.bill_transactions;
            //     for (let j = 0; j < transactions.length; j++) {
            //         const tr = transactions[j];
            //         if (tr.inventory_record.inventory.id == id) {
            //             inv_bills.push(bill);
            //             break;
            //         }
            //     }
            // }

            return null;

        }
    },
    customer_type: {
        create: (data) => {
            return models.CustomerType.create({
                ...data
            });
        },
        createWithRate: async (data) => {
            var customer_type = await models.CustomerType.create({
                name: data.name
            });
            var rates_data = [];
            data.rates.forEach(rate => {
                rates_data.push({
                    inventoryBatchId: rate.id,
                    customerTypeId: customer_type.id,
                    rate: rate.rate
                });
            });
            var temp = await models.CustomerTypeRate.bulkCreate(rates_data);
            return true;
        },
        editWithRates: async (id, data) => {
            var customer_type = await models.CustomerType.findByPk(id);
            customer_type.name = data.name;
            for (let i = 0; i < data.rates.length; i++) {
                const rate = data.rates[i];

                var existingRate = await models.CustomerTypeRate.findOne({
                    where: {
                        inventoryBatchId: rate.id,
                        customerTypeId: customer_type.id
                    }
                });
                if (existingRate != null) {
                    existingRate.rate = toNumberFloat(rate.rate);
                    await existingRate.save();
                } else {
                    await models.CustomerTypeRate.create({
                        inventoryBatchId: rate.id,
                        customerTypeId: customer_type.id,
                        rate: toNumberFloat(rate.rate)
                    });
                }
            }
            await customer_type.save();
        },
        addInventoryRate: (customer_type_id, inventory_batch_id, rate) => {
            return models.CustomerTypeRate.create({
                inventoryBatchId: inventory_batch_id,
                customerTypeId: customer_type_id,
                rate
            });

        },
        fetchAllTypes: () => {
            return models.CustomerType.findAll({
                include: [
                    {
                        model: models.InventoryBatch,
                        include: [
                            {
                                model: models.Inventory
                            }
                        ]
                    }
                ]
            });
        },
        fetchCustomerType: (id) => {
            return models.CustomerType.findByPk(id, {
                include: [
                    {
                        model: models.InventoryBatch,
                        include: [
                            {
                                model: models.Inventory
                            }
                        ]
                    }
                ]
            });
        },
        exists: async (name) => {
            var element = await models.CustomerType.findAll({
                where: {
                    name
                }
            });
            return element.length > 0;
        },
        delete: async (id) => {
            var type = await models.CustomerType.findByPk(id);
            await type.destroy();
            return true;
        }
    },
    customer: {
        create: (data) => {
            return models.Customer.create({
                ...data
            });
        },
        createFull: async (customerData, addressData, customerType, rates) => {
            var customer = await models.Customer.create({
                ...customerData
            });
            if (addressData.zone.trim().length > 0 && !isNaN(addressData.zone)) {
                var zone = await models.Zone.findByPk(addressData.zone);
                customer.setZone(zone);
            }
            if (addressData.zone.trim().length > 0 && !isNaN(addressData.district)) {
                var district = await models.District.findByPk(addressData.district);
                customer.setDistrict(district);
            }
            if (addressData.post_office.trim().length > 0 && !isNaN(addressData.post_office)) {
                var post_office = await models.PostOffice.findByPk(addressData.post_office);
                customer.setPost_office(post_office);
            }
            var customer_type = await models.CustomerType.findByPk(customerType);
            customer.setCustomer_type(customer_type);
            await customer.save();
            for (let i = 0; i < rates.length; i++) {
                rates[i].customerId = customer.id;
            }
            var created = await models.CustomerRate.bulkCreate(rates);
            return customer.id;
        },
        editFull: async (id, customerData, addressData, customerType, rates) => {
            var customer = await models.Customer.findByPk(id);
            customer.first_name = customerData.first_name;
            customer.last_name = customerData.last_name;
            customer.organization = customerData.organization;
            customer.email = customerData.email;
            customer.phone = customerData.phone;
            customer.address1 = customerData.address1;
            customer.vat_number = customerData.vat_number;

            if (addressData.zone.trim().length > 0 && !isNaN(addressData.zone)) {
                var zone = await models.Zone.findByPk(addressData.zone);
                customer.setZone(zone);
            }
            if (addressData.district.trim().length > 0 && !isNaN(addressData.district)) {
                var district = await models.District.findByPk(addressData.district);
                customer.setDistrict(district);
            }
            if (addressData.post_office.trim().length > 0 && !isNaN(addressData.post_office)) {
                var post_office = await models.PostOffice.findByPk(addressData.post_office);
                customer.setPost_office(post_office);
            }
            var customer_type = await models.CustomerType.findByPk(customerType);
            customer.setCustomer_type(customer_type);
            await customer.save();
            await models.CustomerRate.destroy({
                where: {
                    customerId: customer.id
                }
            })
            for (let i = 0; i < rates.length; i++) {
                rates[i].customerId = customer.id;
            }
            await models.CustomerRate.bulkCreate(rates);
            return customer.id;
        },
        addInventoryRate: (cutomer_id, inventory_id, rate) => {
            return models.CustomerRate.create({
                inventoryId: inventory_id,
                cutomerId: cutomer_id,
                rate
            });
        },
        fetchAllCustomer: () => {
            return models.Customer.findAll({
                include: [{
                        model: models.Zone
                    },
                    {
                        model: models.District,
                    },
                    {
                        model: models.PostOffice
                    },
                    {
                        model: models.CustomerType
                    }
                ]
            });
        },
        fetchAllCustomerID: () => {
            return models.Customer.findAll();
        },
        fetchCustomer: (id) => {
            return models.Customer.findByPk(id, {
                include: [{
                        model: models.Zone
                    },
                    {
                        model: models.District,
                    },
                    {
                        model: models.PostOffice
                    },
                    {
                        model: models.CustomerType
                    },
                    {
                        model: models.InventoryBatch,
                        include: {
                            model: models.Inventory
                        }
                    }
                ]
            });
        },
        fetchBills: async (id) => {
            var customer = await models.Customer.findByPk(id);
            var bills = await customer.getBills({
                include: [{
                    model: models.BillTransaction,
                    include: [{
                        model: models.InventoryRecord,
                        include: [{
                            model: models.Inventory
                        }]
                    }]
                },{
                    model: models.User
                }]
            });
            for (let j = 0; j < bills.length; j++) {
                var rented = false;
                var bill = bills[j];
                for (let i = 0; i < bill.bill_transactions.length; i++) {
                    const tr = bill.bill_transactions[i];
                    if (tr.type == 'rented') {
                        const returns = await tr.getReturn();
                        var total_return = _.sumBy(returns, (o) => o.quantity);
                        if (total_return < tr.quantity) {
                            rented = true;
                            break;
                        }
                    }
                }
                bills[j].rented = rented;
            }
            return bills;

        },
        fetchTotalRented: async (id) => {
            var customer = await models.Customer.findByPk(id);
            var bills = await customer.getBills({
                include: [{
                    model: models.BillTransaction,
                }]
            });
            var rented = 0;
            for (let i = 0; i < bills.length; i++) {
                var bill = bills[i];
                var txns = bill.bill_transactions;
                for (let j = 0; j < txns.length; j++) {
                    var txn = txns[j];
                    if (txn.type == 'rented') {
                        rented += txn.quantity;
                        var returns = await txn.getReturn(); 
                        var total_return = _.sumBy(returns, (o) => o.quantity);
                        rented -= total_return;
                    }
                }
            }
            return rented;
        }
    },
    billing: {
        fetchAll: async (user_email) => {
            if (typeof user_email === 'undefined') {
                console.log("User email not provided");
            }
            var user = await models.User.findOne({
                where: {
                    email: user_email
                }
            });
            var bills = [];
            if (user.user_type === 'Admin') {
                bills = await models.Bill.findAll({
                    include: [
                        {
                            model: models.BillTransaction
                        },
                        {
                            model: models.Customer,
                            include: models.CustomerType
                        },
                        {
                            model: models.User
                        }
                    ],
                    order: [
                        ['id', 'DESC']
                    ]
                });
            }else{
                bills = await models.Bill.findAll({
                    include: [
                        {
                            model: models.BillTransaction
                        },
                        {
                            model: models.Customer,
                            include: models.CustomerType
                        },
                        {
                            model: models.User,
                            where: {
                                id: user.id
                            }
                        }
                    ],
                    order: [
                        ['id', 'DESC']
                    ]
                });
            }
            
            for (let j = 0; j < bills.length; j++) {
                var rented = false;
                var bill = bills[j];
                for (let i = 0; i < bill.bill_transactions.length; i++) {
                    const tr = bill.bill_transactions[i];
                    if (tr.type == 'rented') {
                        const returns = await tr.getReturn();
                        var total_return = _.sumBy(returns, (o) => o.quantity);
                        if (total_return < tr.quantity) {
                            rented = true;
                            break;
                        }
                    }
                }
                bills[j].rented = rented;
            }
            return bills;
        },
        fetch: (id) => {
            return models.Bill.findByPk(id, {
                include: [{
                        model: models.BillTransaction,
                        include: [
                            {
                                model: models.InventoryRecord,
                                include: [
                                {
                                    model: models.Inventory,
                                    include: [
                                    {
                                        model: models.InventoryBatch,
                                    }]
                                }, {
                                    model: models.InventoryBatchRecord,
                                    include: [
                                    {
                                        model: models.InventoryBatch,
                                    }]
                                }]
                            },
                            {
                                model: models.BillTransaction,
                                as: 'return'
                            }
                        ]
                    },
                    {
                        model: models.Customer,
                        include: [{
                                model: models.Zone
                            },
                            {
                                model: models.District,
                            },
                            {
                                model: models.PostOffice
                            },
                            {
                                model: models.CustomerType
                            }
                        ]
                    },
                    {
                        model: models.User
                    }
                ]
            });
        },
        getBillNo: async (date = new Date()) => {
            // if current month == 3 then bill no in category 2077/78/0001
            // if current month == 2 then bill no in category 2076/77/0001
            var nepali_today = new NepaliDate(date);
            var month = nepali_today.getMonth();
            var year = nepali_today.getYear();
            var bill_no = "";
            if (month <= 2) {
                bill_no = (year-1)+"/"+(year%100)+"/";
            }
            else{
                bill_no = (year)+"/"+((year+1)%100)+"/";
            }

            var last_bill_no = await models.Bill.findOne({
                where: {
                    track_id: {
                        [Op.like]: bill_no+"%"
                    }
                },
                order: [
                    ['id', 'DESC']
                ]
            });

            if (last_bill_no == null) {
                bill_no = bill_no+'00001';
            }
            else{
                var bn = last_bill_no.track_id;
                var parts = bn.split('/');
                var last_no = parts[parts.length - 1];
                last_no = parseInt(last_no);
                last_no++;
                last_no = last_no + '';
                last_no = last_no.padStart(5, 0);
                bill_no = bill_no + last_no;
            }
            return bill_no;
        },
        createFull: async (customer_id, data, transactions, userEmail) => {
            var customer = await models.Customer.findByPk(customer_id);
            var user = await models.User.findOne({
                where: {
                    email: userEmail
                }
            });
            var grand_total = 0.0;
            for (let k = 0; k < transactions.length; k++) {
                const transaction = transactions[k];
                var btch = await models.InventoryBatch.findByPk(transaction.id);
                for (let i = 0; i < transaction.rate.length; i++) {
                    transactions[k].rate[i] = toNumberFloat(transactions[k].rate[i]);
                    transactions[k].quantity[i] = toNumberFloat(transactions[k].quantity[i]);

                    grand_total += transactions[k].rate[i] * transactions[k].quantity[i];
                }
            }
            data.discount_value = toNumberFloat(data.discount_value);

            data.tax_value = toNumberFloat(data.tax_value);

            data.discount_percent = toNumberFloat(data.discount_percent);

            data.tax_percent = toNumberFloat(data.tax_percent);

            var cost = grand_total - data.discount_value + data.tax_value;
            var bill = null;
            var bill_date = new Date();
            if (data.bd != null)  {
                bill_date = data.bd;
            }
            bill = await models.Bill.create({
                discount: data.discount_value,
                discountPercent: data.discount_percent,
                taxRate: data.tax_percent,
                tax: data.tax_value,
                description: data.description,
                paid: data.paid,
                paidOn: data.paid ? bill_date : null,
                payment_method: data.payment_method,
                image: data.image_loc,
                total: cost + '',
                dueDate: data.dd == null ? new Date() : data.dd,
                createdAt: bill_date,
                track_id: data.track_id
            });
        
            for (let i = 0; i < transactions.length; i++) {
                const transaction = transactions[i];
                const batch = await models.InventoryBatch.findByPk(transaction.id);
                const inventory = await batch.getInventory();
                for (let j = 0; j < transaction.rate.length; j++) {
                    var type = 'sold';
                    if (transaction.type[j] == 'rented') type = 'rented';
                    const inv_record = await insertInventoryRecord({
                        type,
                        value: transaction.quantity[j],
                        recordDate: bill_date
                    },  transaction.id);
                    inv_record.setInventory(inventory);
                    if (user != null) {
                        inv_record.setUser(user);
                    }
                    await inv_record.save();
                    const bill_transac = await models.BillTransaction.create({
                        quantity: transaction.quantity[j],
                        rate: transaction.rate[j],
                        type: type
                    });
                    bill_transac.setInventory_record(inv_record);
                    bill_transac.setBill(bill);
                    await bill_transac.save();
                }
            }
            bill.setCustomer(customer);

            if (user != null) {
                bill.setUser(user);
            }
            await bill.save();
            return bill.id;
        },
        edit_bill: async (id, data, body) => {
            var bill = await models.Bill.findByPk(id);
            var customer = await models.Customer.findByPk(data.customer);
            await bill.setCustomer(customer);
            bill.image = data.image_loc;
            bill.description = data.description;
            if (!data.paid) {
                bill.dueDate = data.due_date;
            }
            bill.paid = data.paid;
            bill.payment_method = data.payment_method;
            data.discount_value = toNumberFloat(data.discount_value);
            bill.discount = data.discount_value;
            data.discount_percent = toNumberFloat(data.discount_percent);
            bill.discountPercent = data.discount_percent;
            data.tax_value = toNumberFloat(data.tax_value);
            bill.tax = data.tax_value;
            data.tax_percent = toNumberFloat(data.tax_percent);
            bill.taxRate = data.tax_percent;
            var total = 0;
            var txns = await bill.getBill_transactions();
            for (let i = 0; i < txns.length; i++) {
                if (txn.type === 'returned')
                    continue;
                var txn = txns[i];
                var quant =  toNumber(body['quantity-'+txn.id]);
                var rate = toNumberFloat(body['rate-'+txn.id]);
                var batch_id = toNumber(body['packing-'+txn.id]);
                var inv_record = await txn.getInventory_record();
                var batch_record = await inv_record.getInventory_batch_record();
                await batch_record.destroy();
                var batch = await models.InventoryBatch.findByPk(batch_id);
                var new_batch_record = await models.InventoryBatchRecord.create({
                    type: inv_record.type,
                    value: quant
                });
                await inv_record.setInventory_batch_record(new_batch_record);
                await new_batch_record.setInventory_batch(batch);

                total += quant * rate;

                txn.quantity = quant;
                txn.rate = rate;
                await txn.save();
                var total_quant = quant * batch.quantity;
                inv_record.value = total_quant;
                await inv_record.save();
            }
            total = total + data.tax_value - data.discount_value;
            bill.total = total;
            await bill.save();
        },
        areItemsRented: async (id) => {
            const bill = await models.Bill.findByPk(id, {
                include: [{
                    model: models.BillTransaction
                }]
            });
            var rented = false;
            for (let i = 0; i < bill.bill_transactions.length; i++) {
                const tr = bill.bill_transactions[i];
                if (tr.type == 'rented') {
                    const returns = await tr.getReturn();
                    var total_return = _.sumBy(returns, (o) => o.quantity);
                    if (total_return < tr.quantity) {
                        rented = true;
                        break;
                    }
                }
            }
            return rented;
        },

        wereItemsRented: async (id) => {
            const bill = await models.Bill.findByPk(id, {
                include: [{
                    model: models.BillTransaction
                }]
            });
            var rented = false;
            for (let i = 0; i < bill.bill_transactions.length; i++) {
                const tr = bill.bill_transactions[i];
                if (tr.type == 'rented') {
                    rented = true;
                }
            }
            return rented;
        },
        addReturn: async (tr_id, inv_id, q, bill_id, user_email, date) => {
            q = toNumber(q);
            const inv = await models.Inventory.findByPk(inv_id);
            const user = await models.User.findOne({
                where: {
                    email: user_email
                }
            });
            const inv_record = await insertInventoryRecord({
                type: 'returned',
                value: q,
                recordDate: date
            });
            const tr = await models.BillTransaction.findByPk(tr_id);
            const bill_transac = await models.BillTransaction.create({
                quantity: q,
                type: 'returned',
                createdAt: date
            });
            const bill = await models.Bill.findByPk(bill_id);
            bill_transac.setInventory_record(inv_record);
            inv_record.setInventory(inv);
            inv_record.setUser(user);
            tr.addReturn(bill_transac);
            bill_transac.setBill(bill);
            await bill_transac.save();
            await tr.save();
            await inv_record.save();
        },
        pay: async (id, bd) => {
            const bill = await models.Bill.findByPk(id);
            bill.paid = true;
            bill.payment_method = 'Cash';
            bill.paidOn = bd;
            await bill.save();
        },
        deleteBill: async (id) => {
            const bill = await models.Bill.findByPk(id, {
                include: [{
                        model: models.BillTransaction,
                        include: [{
                                model: models.InventoryRecord,
                            },
                            {
                                model: models.BillTransaction,
                                as: 'return'
                            }
                        ]
                    },
                ]
            });
            
            for (let i = 0; i < bill.bill_transactions.length; i++) {
                const tr = bill.bill_transactions[i];
                if (typeof tr.bill_transactions !== 'undefined' && typeof tr.bill_transactions !== 'null')
                    for (let j = 0; j < tr.bill_transactions.length; j++) {
                        const returns = tr.bill_transactions[j];
                        await returns.inventory_record.destroy();        
                        await returns.destroy();
                    }
                await tr.inventory_record.destroy();
                await tr.destroy();
            } 
            await bill.destroy();
        }
    },
    misc: {
        zones: (data) => {
            return models.Zone.create(data);
        },
        district: (data) => {
            return models.District.create(data);
        },
        postal_code: (data) => {
            return models.PostOffice.bulkCreate(data);
        },
        fetchAllZones: () => {
            return models.Zone.findAll();
        },
        fetchAllDistrict: async (zoneID) => {
            const zone = await models.Zone.findByPk(zoneID);
            return zone.getDistricts();
        },
        fetchAllPostOffice: async (districtID) => {
            const district = await models.District.findByPk(districtID);
            return district.getPost_offices();
        },
        getUserName: async (email) => {
            if (typeof email == 'undefined' || email == null) return 'Admin';
            var user = await models.User.findOne({
                where: {email}
            });
            if (user == null) return 'Admin';
            return user.first_name+' '+user.last_name;
        },
        toNumberFloat: toNumberFloat,
        toNumber: toNumber,
        getThisMonthStart: getThisMonthStart,
        toEnglishDate: (date) => {
            var numbers = {
                '१': 1,
                '२': 2,
                '३': 3,
                '४': 4,
                '५': 5,
                '६': 6,
                '७': 7,
                '८': 8,
                '९': 9,
                '०': 0,
                '1': 1,
                '2': 2,
                '3': 3,
                '4': 4,
                '5': 5,
                '6': 6,
                '7': 7,
                '8': 8,
                '9': 9,
                '0': 0,
            };
            var engDate = '';
            for (let i = 0; i < date.length; i++) {
                const d = date[i];
                if (d == '/') {
                    engDate += '/'
                } else {
                    engDate += numbers[d];
                }
            }
            return engDate;
        },
        insertInventoryRecord: insertInventoryRecord,
        getStats: async () => {
            var data = {}
            var today = new Date();
            var monthName = new NepaliDate(today).format('MMMM', 'np');
            var yearName = new NepaliDate(today).format('YYYY', 'np');
            var dt = new Date();
            while (true) {
                dt.setDate(dt.getDate() - 1);
                var np = new NepaliDate(dt);
                if (np.getDate() == 1) break;
            }
            data.monthName = monthName;
            var total = await models.Bill.sum('total' ,{
                where: {
                    createdAt: {
                        [Op.gte]: dt
                    }
                }
            });
            
            data.total = total;
            data.formatted_total = numeral(total).format('0,0.00');
            data.yearName = yearName;
            // Total Assets
            var inventory_ids = await models.Inventory.findAll({
                attributes: ['id', 'cost'],
            });
            var total_asset = 0;
            for (let j = 0; j < inventory_ids.length; j++) {
                const inv_id = inventory_ids[j];
                var res = await calculateTotalInventory(inv_id.id, new Date());
                total_asset += inv_id.cost * res.total;
            }

            data.formatted_asset = numeral(total_asset).format('0,0.00');

            // Outstanding Revenue
            var outstanding = await models.Bill.sum('total' ,{
                where: {
                    paid: false
                }
            });

            data.formatted_outstanding = numeral(outstanding).format('0,0.00');

            var total_rented = 0;

            var transactions = await models.BillTransaction.findAll({
                where: {
                    type: 'rented'
                }
            });
            
            var bills = [];
            var bill_ids = [];
            for (let j = 0; j < transactions.length; j++) {
                const tr = transactions[j];
                total_rented += tr.quantity;
                var rented = tr.quantity;
                const returns = await tr.getReturn();
                for (let k = 0; k < returns.length; k++) {
                    const r = returns[k];
                    total_rented -= r.quantity;
                    rented -= r.quantity;
                }
                if (rented > 0){
                    var bill = await tr.getBill({
                        include: [
                            {
                                model: models.BillTransaction,
                                include: [
                                    {
                                        model: models.InventoryRecord,
                                        include: [
                                            {
                                                model: models.Inventory
                                            }
                                        ]
                                    }
                                ]
                            },
                            {
                                model: models.Customer
                            }
                        ]
                    });
                    var bill_rented = 0;
                    var txns = bill.bill_transactions;
                    for (let j = 0; j < txns.length; j++) {
                        var txn = txns[j];
                        if (txn.type == 'rented') {
                            bill_rented += txn.quantity;
                            var returns_rented = await txn.getReturn(); 
                            var total_return = _.sumBy(returns_rented, (o) => o.quantity);
                            bill_rented -= total_return;
                        }
                    }
                    bill.bill_rented = bill_rented;

                    if (!bill_ids.includes(bill.id))  {
                        bills.push(bill);
                        bill_ids.push(bill.id);
                    }
                }
            }
            data.formatted_rented = numeral(total_rented).format('0,0');
            data.bills = bills;

            // Unpaid Bills
            var unpaid = await models.Bill.findAll({
                include: [
                    {
                        model: models.BillTransaction,
                        include: [
                            {
                                model: models.InventoryRecord,
                                include: [
                                    {
                                        model: models.Inventory
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        model: models.Customer,
                        include: [
                            {
                                model: models.CustomerType
                            }
                        ]
                    }
                ],
                where: {
                    paid: false
                }
            });
            for (let j = 0; j < unpaid.length; j++) {
                const bill = unpaid[j];
                var rented = false;
                for (let k = 0; k < bill.bill_transactions.length; k++) {
                    const tr = bill.bill_transactions[k];
                    if (tr.type == 'rented') {
                        const returns = await tr.getReturn();
                        var total_return = _.sumBy(returns, (o) => o.quantity);
                        if (total_return < tr.quantity) {
                            rented = true;
                            break;
                        }
                    }
                }
                unpaid[j].rented = rented;
            }
            data.unpaid = unpaid;
            return data;
        },
        fixUserType: async () => {
            await models.User.update({user_type: 'Admin'}, {
                where: {
                    user_type: null
                }
            });
        },
        checkPermission: (req, res, message="User does not have permission to access the page") => {
            if (req.session.user_type === 'Admin') {
                return true;
            }
            req.flash('flash_message', message);
            req.flash('flash_color', 'danger');
            res.redirect('/');
            return false;
        }
    }
}