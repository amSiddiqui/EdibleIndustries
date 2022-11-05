const models = require('../models/Models');
const NepaliDate = require('nepali-date-converter');
const fs = require('fs');
var _ = require('lodash');
var numeral = require('numeral');
const NodeCache = require("node-cache");
const utilityCache = new NodeCache({ useClones: false, ttl: 172800 });

const {
    Op
} = require('sequelize');
const {
    sequelize
} = require('./database');
const e = require('express');
const log_file = 'logs/utility_time.log';



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

function getSqlDate(d) {
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function getFormattedTime(ms) {
    if (ms < 1000) {
        return ms + 'ms';
    } else {
        ms = ms / 1000;
        return ms.toFixed(3) + 's';
    }
}

function logTime(__startTime, msg) {
    var __endTime = new Date().getTime();
    var __totalTime = getFormattedTime(__endTime - __startTime.getTime());
    fs.appendFile(log_file, getFormattedDate(__startTime) + ' : ' + msg + ' : ' + __totalTime + '\n', err => {
        if (err) {
            console.log("Error writing to log file");
            console.log(err);
        }
    });
}

function getFormattedDate(d) {
    return d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear();
}

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

async function insertInventoryRecord(rec, batch_id = '') {
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

async function calculateTotalInventory(inv_id, end_date, warehouse_id = 1) {
    var inventory = await models.Inventory.findByPk(inv_id);
    var records = await inventory.getInventory_records({
        where: {
            [Op.and]: [
                sequelize.where(sequelize.fn('date', sequelize.col('record_date')), Op.lte, getSqlDate(end_date)),
                { warehouse_id: warehouse_id }
            ]
        },
        order: [
            ['recordDate']
        ]
    });
    var total = 0;
    var in_stock = 0;
    records.forEach(rec => {
        if (rec.type == 'purchased' || rec.type == 'manufactured' || rec.type == 'returned' || rec.type == 'received') {
            in_stock = in_stock + rec.value;
        } else if (rec.type == 'rented' || rec.type == 'discarded' || rec.type == 'sold' || rec.type == 'transferred') {
            in_stock = in_stock - rec.value;
        }


        if (rec.type == 'purchased' || rec.type == 'manufactured' || rec.type == 'received') {
            total = total + rec.value;
        } else if (rec.type == 'discarded' || rec.type == 'sold' || rec.type == 'transferred') {
            total = total - rec.value;
        }
    });

    return {
        total, in_stock
    };
}

async function getCustomerBalance(customer, object=false) {
    if (!object) {
        customer = await models.Customer.findByPk(customer);
    }
    var entries = await customer.getCustomer_ledgers();
    var balance = 0.;
    entries.forEach(ent => {
        if (ent.credit !== null) {
            balance += ent.credit;
        }
        if (ent.debit !== null) {
            balance -= ent.debit;
        }
    });
    return balance;
}


async function getBillNo(date = new Date()) {
    // if current month == 3 then bill no in category 2077/78/0001
    // if current month == 2 then bill no in category 2076/77/0001
    var _startTime = new Date();
    var nepali_today = new NepaliDate(date);
    var month = nepali_today.getMonth();
    var year = nepali_today.getYear();
    var bill_no = "";
    if (month <= 2) {
        bill_no = (year - 1) + "/" + (year % 100) + "/";
    }
    else {
        bill_no = (year) + "/" + ((year + 1) % 100) + "/";
    }

    var last_bill_no = await models.Bill.findOne({
        where: {
            track_id: {
                [Op.like]: bill_no + "%"
            }
        },
        order: [
            ['id', 'DESC']
        ]
    });

    if (last_bill_no == null) {
        bill_no = bill_no + '00001';
    }
    else {
        var bn = last_bill_no.track_id;
        var parts = bn.split('/');
        var last_no = parts[parts.length - 1];
        last_no = parseInt(last_no);
        last_no++;
        last_no = last_no + '';
        last_no = last_no.padStart(5, 0);
        bill_no = bill_no + last_no;
    }
    logTime(_startTime, 'billing.getBillNo()');
    return bill_no;
}


async function addLedgerEntry(customer_id, entry_data, email) {
    if (utilityCache.has('customer_stats')) {
        utilityCache.del('customer_stats');
    }
    // Only adds Deposit entries
    const customer = await models.Customer.findByPk(customer_id);
    if (entry_data.type != 'Deposit') {
        return null;
    }
    let current_balance = await getCustomerBalance(customer_id);
    let total_balance = entry_data.credit;

    if (current_balance > 0) {
        total_balance += current_balance;
    }

    var ledgerEntry = await models.CustomerLedger.create(entry_data);
    let user = await models.User.findOne({where: {email: email}});
    await ledgerEntry.setUser(user);

    // Find all unpaid bills oldest first
    var unpaid = await customer.getBills({
        where: {
            [Op.or]: [
                { paid: false },
                { payment_method: 'Credit' }
            ],
            createdAt: {
                [Op.lte]: entry_data.date
            }
        },
        order: [
            ['id', 'ASC']
        ]
    });

    await ledgerEntry.setCustomer(customer);

    var total = 0;
    for (var i = 0; i < unpaid.length; i++) {
        var b = unpaid[i];
        total += b.total;
        if (total > total_balance) {
            break;
        } else {
            unpaid[i].paid = true;
            unpaid[i].payment_method = 'Cash';
            await unpaid[i].save();
            await ledgerEntry.addDeposit(unpaid[i]);
        }
    }
}

async function getCustomerData(customer) {
    let bills = await customer.getBills({
        include: [
            {
                model: models.User,
                include: {
                    model: models.Warehouse
                }
            },
            {
                model: models.BillTransaction,
                include: [
                    {
                        model: models.BillTransaction,
                        as: 'return'
                    }
                ]
            }
        ]
    }); 
    let warehouses = [];
    let total = 0;
    let due = 0;
    var total_rented = 0;
    for (let bill of bills) {
        if (!warehouses.includes(bill.user.warehouse.name)) {
            warehouses.push(bill.user.warehouse.name);
        }
        total += bill.total;
        if (!bill.paid) {
            due += bill.total;
        }
        var rented = 0;
        for (let j = 0; j < bill.bill_transactions.length; j++) {
            var txn = bill.bill_transactions[j];
            if (txn.type === 'rented') {
                rented += txn.quantity;
                var returns = txn.return;
                if (returns) {
                    for (let k = 0; k < returns.length; k++) {
                        var r = returns[k];
                        rented -= r.quantity;
                    }
                    if (rented > 0) {
                        total_rented += rented;
                    }
                }
            }
        }
    }

    let balance = await getCustomerBalance(customer, true);
    return {billed_by: warehouses, purchase: total, due, rented: total_rented, account: balance};
}

module.exports = {
    user: {
        fetchAll: async () => {
            return await models.User.findAll({
                include: {
                    model: models.Warehouse
                }
            });
        },
        fetch: async (id) => {
            let user = await models.User.findByPk(id);
            let warehouse = await user.getWarehouse();
            user.warehouse = warehouse;
            return user;
        },
        createUser: async (data) => {
            let user = await models.User.create({
                ...data
            });
            try {
                let warehouse = await models.Warehouse.findByPk(data.warehouse);
                await user.setWarehouse(warehouse);
            }catch(err) {}

            return user;

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
            try {
                let warehouse = await models.Warehouse.findByPk(data.warehouse);
                await user.setWarehouse(warehouse);
            } catch (err) {}

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
        },
        getWarehouse: async (email) => {
            let user = await models.User.findOne({where: {email}});
            return await user.getWarehouse();
        }
    },

    inventory: {
        createInventory: async (data) => {
            var _startTime = new Date();
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
            logTime(_startTime, 'inventory.createInventory()');
            return inventory;
        },
        fetchInventory: async (id, w_id = -1) => {
            var _startTime = new Date();
            var warehouse = await models.Warehouse.findByPk(w_id);
            if (warehouse === null)
                warehouse = await models.Warehouse.findOne({ where: { isPrimary: true } });
            var inv = await models.Inventory.findOne({
                where: {
                    id
                },
                include: [
                    {
                        model: models.InventoryBatch
                    }]
            });
            var res = await calculateTotalInventory(inv.id, new Date(), warehouse.id);
            inv.total = res.total;
            inv.in_stock = res.in_stock;

            logTime(_startTime, 'inventory.fetchInventory()');
            return inv;
        },
        updateInventory: async (id, data) => {
            var _startTime = new Date();
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
            logTime(_startTime, 'inventory.updateInventory()');
            return true;
        },
        deleteInventory: async (id) => {
            var inv = await models.Inventory.findByPk(id);
            await inv.destroy();
            return true;
        },
        fetchAllInventory: async (id = -1) => {
            // Load warehouse
            var _startTime = new Date();
            var warehouse = await models.Warehouse.findByPk(id);
            if (warehouse === null) {
                warehouse = await models.Warehouse.findOne({ where: { isPrimary: true } });
            }

            var inventories = await models.Inventory.findAll({
                include: [
                    {
                        model: models.InventoryBatch
                    }]
            });

            for (let i = 0; i < inventories.length; i++) {
                const inv = inventories[i];
                var res = await calculateTotalInventory(inv.id, new Date(), warehouse.id);
                inv.in_stock = res.in_stock;
                inv.total = res.total;
            }
            logTime(_startTime, 'inventory.fetchAllInventory()');
            return inventories;

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
        fetchAllInventoryIdWithRecord: async (limit_date, w_id = -1) => {
            var _startTime = new Date();
            var warehouse = await models.Warehouse.findByPk(w_id);
            if (warehouse === null) {
                warehouse = await models.Warehouse.findOne({ where: { isPrimary: true } });
            }

            var inventories = await models.Inventory.findAll({
                include: [{
                    model: models.InventoryBatch
                }]
            });


            for (let i = 0; i < inventories.length; i++) {
                const inv = inventories[i];
                var record = await inv.getInventory_records({
                    order: [
                        [sequelize.col('id'), 'DESC']
                    ],
                    limit: 1,
                    where: {
                        warehouse_id: warehouse.id
                    }
                });
                inventories[i].inventory_records = record;

                var res = await calculateTotalInventory(inv.id, limit_date, warehouse.id);
                inventories[i].in_stock = res.in_stock;
                inventories[i].total = res.total;
            }
            logTime(_startTime, 'inventory.fetchAllInventoryIdWithRecord()');
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
            batch.name = data.name;
            batch.quantity = data.quantity;
            await batch.save();
            return true;
        },
        deleteBatch: async (id) => {
            var batch = await models.InventoryBatch.findByPk(id);
            await batch.destroy();
            return true;
        },
        addRecord: async (id, data, user_email, w_id = -1) => {
            var _startTime = new Date();
            var warehouse = await models.Warehouse.findByPk(w_id);
            if (warehouse === null) {
                warehouse = await models.Warehouse.findOne({ where: { isPrimary: true } });
            }
            var user = await models.User.findOne({
                where: {
                    email: user_email
                }
            });

            if (data.type != 'transferred') {
                data.warehouse = null;
            }

            var inventory = await models.Inventory.findByPk(id);
            var inventory_record = await insertInventoryRecord({
                type: data.type,
                value: data.value,
                recordDate: data.created,
                cost: data.cost,
                partnerWarehouseId: data.warehouse
            }, data.batch_id);

            if (data.type == 'transferred') {
                var receivingWarehouse = await models.Warehouse.findByPk(data.warehouse);
                var receiveRecord = await insertInventoryRecord({
                    type: 'received',
                    value: data.value,
                    recordDate: data.created,
                    cost: 0,
                    partnerWarehouseId: warehouse.id
                }, data.batch_id);
                await receiveRecord.setWarehouse(receivingWarehouse);
                await receiveRecord.setInventory(inventory);
                await receiveRecord.setUser(user);
                await receiveRecord.save();
            }

            await inventory_record.setWarehouse(warehouse);
            await inventory_record.setInventory(inventory);
            await inventory_record.setUser(user);
            await inventory_record.save();
            logTime(_startTime, 'inventory.addRecord()');
        },
        editRecord: async (id, data) => {
            var _startTime = new Date();
            var inventory_record = await models.InventoryRecord.findByPk(id);
            var batch = await models.InventoryBatch.findByPk(data.batch_id);
            var batch_value = data.value;
            var user = await models.User.findByPk(data.user_id);
            await inventory_record.setUser(user);
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

            // Check if record type is transferred
            if (inventory_record.type === 'transferred') {
                // Find the received record
                if (typeof id !== 'number') {
                    id = parseInt(id);
                }
                var received_record = await models.InventoryRecord.findByPk(id + 1);
                received_record.value = batch_value * batch.quantity;
                received_record.recordDate = data.created;
                received_record.cost = data.cost;
                await received_record.save();
                var received_batch_record = await batch.createInventory_batch_record({
                    type: received_record.type,
                    value: batch_value,
                    createdAt: data.created
                });
                var old_record = await received_record.getInventory_batch_record();
                await old_record.destroy();
                await received_record.setInventory_batch_record(received_batch_record);
                await received_batch_record.save();
            }

            logTime(_startTime, 'inventory.editRecord()');
            return inventory_id.id;
        },
        deleteRecord: async (id) => {
            var _startTime = new Date();
            var record = await models.InventoryRecord.findByPk(id);
            var batch_record = await record.getInventory_batch_record();
            if (record.type === 'transferred') {
                if (typeof id !== 'number') id = parseInt(id);
                var rec_record = await models.InventoryRecord.findByPk(id + 1);
                if (rec_record.type === 'received') {
                    var batch_record_r = await rec_record.getInventory_batch_record();
                    await batch_record_r.destroy();
                    await rec_record.destroy();
                }
            }
            await batch_record.destroy();
            await record.destroy();
            logTime(_startTime, 'inventory.deleteRecord()');
            return true;
        },
        fetchHistory: async (id, start, end, w_id = -1) => {
            var _startTime = new Date();
            var warehouse = await models.Warehouse.findByPk(w_id);
            if (warehouse === null) {
                warehouse = await models.Warehouse.findOne({ where: { isPrimary: true } });
            }
            
            var inv = await models.Inventory.findOne({
                where: {
                    id
                },
                include: [
                    {
                        model: models.InventoryBatch
                    }]
            });
            var records = await inv.getInventory_records({
                order: [
                    [sequelize.col('record_date')]
                ],
                where: {
                    warehouse_id: warehouse.id,
                    [Op.and]: [
                        sequelize.where(sequelize.fn('date', sequelize.col('inventory_record.record_date')), Op.lte, getSqlDate(end)),
                        sequelize.where(sequelize.fn('date', sequelize.col('inventory_record.record_date')), Op.gte, getSqlDate(start)),
                    ]
                },
                include: [{
                    model: models.User
                }, {
                    model: models.InventoryBatchRecord,
                    include: [{
                        model: models.InventoryBatch
                    }]
                }, {
                    model: models.BillTransaction,
                    include: [{ model: models.Bill }]
                }]
            });

            for (let i = 0; i < records.length; i++) {
                var record = records[i];
                if (record.type == 'sold') {
                    var txn = record.bill_transaction;
                    records[i].bill_id = txn.bill.track_id;
                }
            }

            logTime(_startTime, 'inventory.fetchHistory()');
            return records;
        },
        fetchBills: async (id, user_email, start, end, w_id = -1) => {
            var _startTime = new Date();
            var warehouse = await models.Warehouse.findByPk(w_id);
            if (warehouse === null) {
                warehouse = await models.Warehouse.findOne({ where: { isPrimary: true } });
            }
            var user = await models.User.findOne({
                where: {
                    email: user_email
                }
            });
            var bills = [];
            if (user.user_type === 'Admin') {
                bills = await warehouse.getBills({
                    where: {
                        [Op.and]: [
                            sequelize.where(sequelize.fn('date', sequelize.col('bill.createdAt')), Op.lte, getSqlDate(end)),
                            sequelize.where(sequelize.fn('date', sequelize.col('bill.createdAt')), Op.gte, getSqlDate(start)),
                        ]
                    },
                    include: [{
                        model: models.BillTransaction,
                        include: [
                            {
                                model: models.InventoryRecord,
                                include: [
                                    {
                                        model: models.Inventory
                                    }]
                            }, {
                                model: models.BillTransaction,
                                as: 'return'
                            }]
                    },
                    {
                        model: models.Customer,
                        include: [{
                            model: models.CustomerType
                        }]
                    }, {
                        model: models.User
                    }
                    ],
                    order: [
                        ['id', 'DESC']
                    ]
                });
            } else {
                bills = await warehouse.getBills({
                    where: {
                        [Op.and]: [
                            sequelize.where(sequelize.fn('date', sequelize.col('bill.createdAt')), Op.lte, getSqlDate(end)),
                            sequelize.where(sequelize.fn('date', sequelize.col('bill.createdAt')), Op.gte, getSqlDate(start)),
                        ]
                    },
                    include: [{
                        model: models.BillTransaction,
                        include: [
                            {
                                model: models.InventoryRecord,
                                include: [{
                                    model: models.Inventory
                                }]
                            }, {
                                model: models.BillTransaction,
                                as: 'return'
                            }]
                    },
                    {
                        model: models.Customer,
                        include: [{
                            model: models.CustomerType
                        }]
                    }, {
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
                        const returns = tr.return;
                        var total_return = _.sumBy(returns, (o) => o.quantity);
                        if (total_return < tr.quantity) {
                            rented = true;
                            break;
                        }
                    }
                }
                inv_bills[j].rented = rented;
            }
            logTime(_startTime, 'inventory.fetchBills()');
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
        create: async (data) => {
            if (utilityCache.has('customer_stats')) {
                utilityCache.del('customer_stats');
            }
            let temp = await models.Customer.create({
                ...data
            });

            return temp;
        },
        createFull: async (customerData, addressData, customerType, rates) => {
            if (utilityCache.has('customer_stats')) {
                utilityCache.del('customer_stats');
            }
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
        addInventoryRate: (customer_id, inventory_id, rate) => {
            if (utilityCache.has('customer_stats')) {
                utilityCache.del('customer_stats');
            }
            return models.CustomerRate.create({
                inventoryId: inventory_id,
                customerId: customer_id,
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
                }, {
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
        },
        month_sale: async (id, date, total = false) => {
            var customer = await models.Customer.findByPk(id);
            if (total) {
                var bills = await customer.getBills();
                var total = 0;
                bills.forEach(bill => {
                    total += bill.total;
                });
                return numeral(total).format('0,0.00');
            }
            var np_date = new NepaliDate(date);

            var dt = np_date.toJsDate();
            while (true) {
                dt.setDate(dt.getDate() + 1);
                var np = new NepaliDate(dt);
                if (np.getDate() == 1) break;
            }
            dt.setDate(dt.getDate() - 1);
            var month_start = new NepaliDate(date).toJsDate();
            var month_end = dt;
            var bills = await customer.getBills({
                where: {
                    [Op.and]: [
                        sequelize.where(sequelize.fn('date', sequelize.col('createdAt')), Op.lte, getSqlDate(month_start)),
                        sequelize.where(sequelize.fn('date', sequelize.col('createdAt')), Op.gte, getSqlDate(month_end)),
                    ]
                }
            });
            var total = 0;
            bills.forEach(bill => {
                total += bill.total;
            });
            return numeral(total).format('0,0.00');

        },
        fetchOutstanding: async (id) => {
            var customer = await models.Customer.findByPk(id);
            var total = 0;
            var bills = await customer.getBills({
                where: {
                    [Op.or]: {
                        paid: false,
                        payment_method: 'Credit'
                    }
                }
            });

            bills.forEach(bill => {
                total += bill.total;
            });
            return numeral(total).format('0,0.00');
        },
        getCustomerStats: async () => {
            if (utilityCache.has('customer_stats')) {
                return utilityCache.get('customer_stats');
            }
            var customers = await models.Customer.findAll({
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

            let data = [];
            for (let customer of customers) { 
                let customer_data = await getCustomerData(customer);
                let entry_data = {
                    'id': customer.id,
                    'customer': customer.first_name + ' ' + customer.last_name,
                    'type': customer.customer_type.name,
                    'anchal': customer.district == null ? '': customer.district.value,
                    'billed_by': customer_data.billed_by.join('<br/>'),
                    'purchase': customer_data.purchase.toFixed(2),
                    'due': customer_data.due.toFixed(2),
                    'rented': customer_data.rented,
                    'account': customer_data.account.toFixed(2)
                };
                data.push(entry_data);
            }
            utilityCache.set('customer_stats', data);
            return data;
        }   
    },
    billing: {
        fetchAll: async (user_email, start, end) => {

            var _startTime = new Date();
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
                    where: {
                        [Op.and]: [
                            sequelize.where(sequelize.fn('date', sequelize.col('bill.createdAt')), Op.lte, getSqlDate(end)),
                            sequelize.where(sequelize.fn('date', sequelize.col('bill.createdAt')), Op.gte, getSqlDate(start)),
                        ]
                    },
                    include: [
                        {
                            model: models.BillTransaction,
                            include: [{
                                model: models.BillTransaction,
                                as: 'return'
                            }]
                        },
                        {
                            model: models.Customer,
                            include: models.CustomerType
                        },
                        {
                            model: models.User
                        },
                        {
                            model: models.Warehouse
                        }
                    ],
                    order: [
                        ['id', 'DESC']
                    ]
                });
            } else {
                bills = await models.Bill.findAll({
                    where: {
                        [Op.and]: [
                            sequelize.where(sequelize.fn('date', sequelize.col('bill.createdAt')), Op.lte, getSqlDate(end)),
                            sequelize.where(sequelize.fn('date', sequelize.col('bill.createdAt')), Op.gte, getSqlDate(start)),
                        ]
                    },
                    include: [
                        {
                            model: models.BillTransaction,
                            include: [{
                                model: models.BillTransaction,
                                as: 'return'
                            }]
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
                        },
                        {
                            model: models.Warehouse
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
                        const returns = tr.return;
                        var total_return = _.sumBy(returns, (o) => o.quantity);
                        if (total_return < tr.quantity) {
                            rented = true;
                            break;
                        }
                    }
                }
                bills[j].rented = rented;
            }
            logTime(_startTime, 'billing.fetchAll()');
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
                },
                {
                    model: models.Warehouse
                }
                ]
            });
        },
        getBillNo: getBillNo,
        createFull: async (customer_id, data, transactions, userEmail, w_id = -1) => {
            if (utilityCache.has('stats')) {
                utilityCache.del('stats');
            }
            if (utilityCache.has('customer_stats')) {
                utilityCache.del('customer_stats');
            }

            var _startTime = new Date();
            var warehouse = await models.Warehouse.findByPk(w_id);
            if (warehouse === null) {
                warehouse = await models.Warehouse.findOne({ where: { isPrimary: true } });
            }
            var customer = await models.Customer.findByPk(customer_id);
            var user = await models.User.findOne({
                where: {
                    email: userEmail
                }
            });
            var grand_total = 0.0;
            for (let k = 0; k < transactions.length; k++) {
                const transaction = transactions[k];
                var batch = await models.InventoryBatch.findByPk(transaction.id);
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
            if (data.bd != null) {
                bill_date = data.bd;
            }
            data.track_id = await getBillNo(bill_date);
            bill = await models.Bill.create({
                discount: data.discount_value,
                discountPercent: data.discount_percent,
                taxRate: data.tax_percent,
                tax: data.tax_value,
                description: data.description,
                paid: data.paid,
                originalPaid: data.paid,
                paidOn: data.paid ? bill_date : null,
                payment_method: data.payment_method,
                image: data.image_loc,
                total: cost + '',
                dueDate: data.dd == null ? new Date() : data.dd,
                createdAt: bill_date,
                track_id: data.track_id
            });

            await bill.setWarehouse(warehouse);

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
                    }, transaction.id);
                    inv_record.setWarehouse(warehouse);
                    inv_record.setInventory(inventory);
                    if (user != null) {
                        inv_record.setUser(user);
                    }
                    await inv_record.save();
                    const bill_transaction = await models.BillTransaction.create({
                        quantity: transaction.quantity[j],
                        rate: transaction.rate[j],
                        type: type
                    });
                    bill_transaction.setInventory_record(inv_record);
                    bill_transaction.setBill(bill);
                    await bill_transaction.save();
                }
            }
            bill.setCustomer(customer);

            if (user != null) {
                bill.setUser(user);
            }
            if (bill.payment_method != 'Free') {
                var credit = null;
                var debit = cost;
                if (bill.payment_method === 'Cash') {
                    credit = cost;
                }
                if (bill.payment_method === 'Credit') {
                    var balance = await getCustomerBalance(customer_id);
                    if (balance >= debit) {
                        bill.paid = true;
                        bill.payment_method = "Cash";
                        await bill.save();
                    }
                }

                var customer_ledger = await models.CustomerLedger.create({
                    type: 'Sale',
                    credit,
                    debit,
                    date: bill_date
                });
                await customer_ledger.setSale(bill);
                await customer_ledger.setCustomer(customer);
                await customer_ledger.setUser(user);
            }

            await bill.save();
            logTime(_startTime, 'billing.createFull()');
            return bill.id;
        },
        edit_bill: async (id, data, body) => {
            if (utilityCache.has('stats')) {
                utilityCache.del('stats');
            }

            var _startTime = new Date();
            var bill = await models.Bill.findByPk(id);
            var customer = await models.Customer.findByPk(data.customer);
            await bill.setCustomer(customer);
            try {
                if (bill.saleId) {
                    var sale = await models.CustomerLedger.findByPk(bill.saleId);
                    await sale.setCustomer(customer);
                }
                if (bill.depositId) {
                    var deposit = await models.CustomerLedger.findByPk(bill.depositId);
                    await deposit.setCustomer(customer);
                }
            }catch(err) {
                console.log(err);
            }
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
                var txn = txns[i];
                if (txn.type === 'returned')
                    continue;
                var quant = toNumber(body['quantity-' + txn.id]);
                var rate = toNumberFloat(body['rate-' + txn.id]);
                var batch_id = toNumber(body['packing-' + txn.id]);
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

            let ledgers = await models.CustomerLedger.findAll({
                include: [{
                    model: models.Bill,
                    as: 'sale'
                }],
                where: sequelize.where(sequelize.col('sale.id'), Op.eq, bill.id)
            });

            for (let ledger of ledgers) {
                if (ledger.type === 'Sale') {
                    ledger.debit = total;
                    if (data.paid) {
                        ledger.credit = total;
                    } else {
                        ledger.credit = 0;
                    }
                }
                
                ledger.save();
            }

            logTime(_startTime, 'billing.edit_bill()');
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
            if (utilityCache.has('stats')) {
                utilityCache.del('stats');
            }


            var _startTime = new Date();
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
            const bill_transaction = await models.BillTransaction.create({
                quantity: q,
                type: 'returned',
                createdAt: date
            });
            const bill = await models.Bill.findByPk(bill_id);
            const warehouse = await bill.getWarehouse();
            bill_transaction.setInventory_record(inv_record);
            inv_record.setInventory(inv);
            await inv_record.setWarehouse(warehouse);
            inv_record.setUser(user);
            tr.addReturn(bill_transaction);
            bill_transaction.setBill(bill);
            await bill_transaction.save();
            await tr.save();
            await inv_record.save();
            logTime(_startTime, 'billing.addReturn()');
        },
        pay: async (id, bd, user_email) => {
            if (utilityCache.has('stats')) {
                utilityCache.del('stats');
            }
            const bill = await models.Bill.findByPk(id);
            let user = await models.User.findOne({where: {email: user_email}});
            const customer = await bill.getCustomer();
            const entry = await models.CustomerLedger.create({
                type: 'Deposit',
                credit: bill.total,
                debit: null,
                date: bd
            });
            await entry.setCustomer(customer);
            await entry.addDeposit(bill);
            await entry.setUser(user);
            bill.paid = true;
            bill.payment_method = 'Cash';
            bill.paidOn = bd;
            await bill.save();
        },
        deleteBill: async (id) => {
            if (utilityCache.has('stats')) {
                utilityCache.del('stats');
            }

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

            let ledgers_sale = await models.CustomerLedger.findAll({
                include: [{
                    model: models.Bill,
                    as: 'sale'
                }],
                where: sequelize.where(sequelize.col('sale.id'), Op.eq, bill.id)
            });

            let ledgers_deposit = await models.CustomerLedger.findAll({
                include: [{
                    model: models.Bill,
                    as: 'deposit'
                }],
                where: sequelize.where(sequelize.col('deposit.id'), Op.eq, bill.id)
            });

            for (let i = 0; i < ledgers_sale.length; i++) {
                let ledger = ledgers_sale[i];
                if (ledger.type === 'Sale') {
                    await ledger.destroy();
                }
            }
            
            await bill.destroy();
        },
        lastBillDate: async () => {
            let bill = await models.Bill.findOne({
                order: [
                    ['createdAt', 'DESC']
                ]
            });
            return bill.createdAt;
        },
        changeWarehouse: async (bill_id, warehouse_id, user_id) => {
            let bill = await models.Bill.findByPk(bill_id, {
                include: {
                    model: models.BillTransaction,
                    include: {
                        model: models.InventoryRecord,
                        include: {
                            model: models.InventoryBatchRecord,
                            include: models.InventoryBatch
                        }
                    }
                }
            });
            console.log();
            models.User.findByPk(user_id).then(user => {
                bill.setUser(user);
            }).catch(err => {})
            models.Warehouse.findByPk(warehouse_id).then(async warehouse => {
                await bill.setWarehouse(warehouse);
                let user = null;
                try {
                    user = await models.User.findByPk(user_id);
                } catch (err) {

                }
                for (let tn of bill.bill_transactions) {
                    await tn.inventory_record.setWarehouse(warehouse);
                    if (user) {
                        await tn.inventory_record.setUser(user);
                    }
                }
            }).catch(err => {
            });
        }
    },
    warehouse: {
        fetchWarehouse: async (id) => {
            return models.Warehouse.findByPk(id, {
                include: [
                    {
                        model: models.Zone
                    },
                    {
                        model: models.District,
                    },
                    {
                        model: models.PostOffice
                    }]
            });
        },
        fetchWarehouses: async () => {
            return models.Warehouse.findAll();
        },
        getWarehouse: async (id) => {
            // Check if id exists. If not get the primary warehouse
            var warehouse = await models.Warehouse.findByPk(id);

            if (warehouse === null) {
                warehouse = await models.Warehouse.findOne({
                    where: {
                        isPrimary: true
                    }
                });
            }
            return warehouse;
        },
        addWarehouse: async (warehouseName, addressData, isPrimary) => {
            isPrimary = !!isPrimary;
            var res = await models.Warehouse.findOne({
                where: {
                    name: warehouseName
                }
            });
            if (res !== null) {
                throw new Error();
            }
            var warehouse = await models.Warehouse.create({
                name: warehouseName,
                address1: addressData.address1,
                isPrimary: isPrimary
            });
            if (addressData.zone.trim().length > 0 && !isNaN(addressData.zone)) {
                var zone = await models.Zone.findByPk(addressData.zone);
                warehouse.setZone(zone);
            }
            if (addressData.zone.trim().length > 0 && !isNaN(addressData.district)) {
                var district = await models.District.findByPk(addressData.district);
                warehouse.setDistrict(district);
            }
            if (addressData.post_office.trim().length > 0 && !isNaN(addressData.post_office)) {
                var post_office = await models.PostOffice.findByPk(addressData.post_office);
                warehouse.setPost_office(post_office);
            }
            await warehouse.save();
        },
        warehouseExist: async (name, id) => {
            var res = null;
            if (id === -1) {
                res = await models.Warehouse.findOne({
                    where: {
                        name
                    }
                });
            } else {
                res = await models.Warehouse.findOne({
                    where: {
                        name,
                        id: {
                            [Op.ne]: id
                        }
                    }
                });
            }
            return res !== null;
        },
        editWarehouse: async (id, warehouseName, addressData) => {
            var warehouse = await models.Warehouse.findByPk(id);
            warehouse.name = warehouseName;
            warehouse.address1 = addressData.address1;
            if (addressData.zone.trim().length > 0 && !isNaN(addressData.zone)) {
                var zone = await models.Zone.findByPk(addressData.zone);
                warehouse.setZone(zone);
            }
            if (addressData.district.trim().length > 0 && !isNaN(addressData.district)) {
                var district = await models.District.findByPk(addressData.district);
                warehouse.setDistrict(district);
            }
            if (addressData.post_office.trim().length > 0 && !isNaN(addressData.post_office)) {
                var post_office = await models.PostOffice.findByPk(addressData.post_office);
                warehouse.setPost_office(post_office);
            }
            await warehouse.save();
        }
    },
    ledger: {
        fetchAllEntry: async (customer_id) => {
            const customer = await models.Customer.findByPk(customer_id);
            var entries = await customer.getCustomer_ledgers({
                include: [
                    { model: models.Bill, as: 'sale' },
                    { model: models.Bill, as: 'deposit' },
                    { model: models.User }
                ]
            });
            return entries;
        },
        fetchEntries: async (start, end, warehouse=0) => {
            let query = {
                attribute: ['credit'],
                where: {
                    [Op.and]: [
                        sequelize.where(sequelize.fn('date', sequelize.col('date')), Op.lte, getSqlDate(end)),
                        sequelize.where(sequelize.fn('date', sequelize.col('date')), Op.gte, getSqlDate(start)),
                    ]
                },
                include: [{
                    model: models.Customer,
                }, {
                    model: models.Bill,
                    as: 'sale'
                },
                {
                    model: models.Bill,
                    as: 'deposit'
                }
                , {
                    model: models.User,
                    include: {
                        model: models.Warehouse
                    }
                }]
            };
            if (warehouse != 0) { 
                query.where[Op.and].push(sequelize.where(sequelize.col('user->warehouse.id'), Op.eq, warehouse));
            }
            const entries = models.CustomerLedger.findAll(query);
            return entries;
        },
        addEntry: addLedgerEntry,
        getBalance: getCustomerBalance,
        editEntry: async (id, amount, date, user_id) => {
            let entry = await models.CustomerLedger.findByPk(id);
            entry.credit = parseFloat(amount);
            await entry.save();
            await models.CustomerLedger.update({createdAt: date, date: date}, {where: {id: entry.id}, silent: true});
            let user = await models.User.findByPk(user_id);
            await entry.setUser(user);
        },
        deleteEntry: async (id) => {
            let entry = await models.CustomerLedger.findByPk(id);
            await entry.destroy();
        }
    },
    analytics: {

        fetchCashInflow: async (start, end, warehouse) => {
            if (warehouse != 0) { 
                const users = await models.User.findAll({
                    attributes: ['id'],
                    where: {
                        warehouse_id: warehouse
                    }
                });
                let user_ids = users.map(user => user.id);
                const entries = await models.CustomerLedger.findAll({
                    attribute: ['credit'],
                    where: {
                        [Op.and]: [
                            sequelize.where(sequelize.fn('date', sequelize.col('date')), Op.lte, getSqlDate(end)),
                            sequelize.where(sequelize.fn('date', sequelize.col('date')), Op.gte, getSqlDate(start)),
                        ],
                        userId: user_ids
                    }
                });
                let total = _.sumBy(entries, i => i.credit);
    
                let formatted = numeral(total).format('0,0');
    
                return { total, formatted };
            } else {
                
                const entries = await models.CustomerLedger.findAll({
                    attribute: ['credit'],
                    where: {
                        [Op.and]: [
                            sequelize.where(sequelize.fn('date', sequelize.col('date')), Op.lte, getSqlDate(end)),
                            sequelize.where(sequelize.fn('date', sequelize.col('date')), Op.gte, getSqlDate(start)),
                        ]
                    }
                });
                let total = _.sumBy(entries, i => i.credit);
    
                let formatted = numeral(total).format('0,0');
                return { total, formatted };
            }
        },
        fetchCustomerData: getCustomerData
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
                where: { email }
            });
            if (user == null) return 'Admin';
            return user.first_name + ' ' + user.last_name;
        },
        month_sale: async (date) => {
            var np_date = new NepaliDate(date);

            var dt = np_date.toJsDate();
            while (true) {
                dt.setDate(dt.getDate() + 1);
                var np = new NepaliDate(dt);
                if (np.getDate() == 1) break;
            }
            dt.setDate(dt.getDate() - 1);
            var month_start = new NepaliDate(date).toJsDate();
            var month_end = dt;
            var total = await models.Bill.sum('total', {
                where: {
                    [Op.and]: [
                        sequelize.where(sequelize.fn('date', sequelize.col('createdAt')), Op.lte, getSqlDate(month_end)),
                        sequelize.where(sequelize.fn('date', sequelize.col('createdAt')), Op.lte, getSqlDate(month_start))
                    ]
                }
            });
            return numeral(total).format('0,0.00');

        },
        toNumberFloat: toNumberFloat,
        toNumber: toNumber,
        calculateTotalInventory: calculateTotalInventory,
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
        getSqlDate: getSqlDate,
        getStats: async () => {

            if (utilityCache.has('stats')) {
                return utilityCache.get('stats');
            }

            var __startTime = new Date();
            // Data to be output
            // Current month name
            // Bill total
            // Current year name
            // total assets
            // Outstanding revenue
            // Total rented items
            // All rented bills
            // All unpaid bills
            var data = {}
            var today = new Date();
            var monthName = new NepaliDate(today).format('MMMM', 'np');
            var yearName = new NepaliDate(today).format('YYYY', 'np');
            var dt = new Date();
            dt.setHours(0, 0, 0, 0);
            while (true) {
                var np = new NepaliDate(dt);
                if (np.getDate() == 1) break;
                dt.setDate(dt.getDate() - 1);
            }
            data.monthName = monthName;
            var total = await models.Bill.sum('total', {
                where: sequelize.where(sequelize.fn('date', sequelize.col('createdAt')), Op.gte, getSqlDate(dt))
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
            var outstanding = await models.Bill.sum('total', {
                where: {
                    paid: false
                }
            });

            data.formatted_outstanding = numeral(outstanding).format('0,0.00');
            var total_rented = 0;

            var all_bills = await models.Bill.findAll({
                include: [
                    {
                        model: models.BillTransaction,
                        include: [
                            {
                                model: models.BillTransaction,
                                as: 'return'
                            }
                        ]
                    },
                    {
                        model: models.Customer
                    },
                    {
                        model: models.User
                    }
                ],
                where: {
                    [Op.or]: [
                        { paid: false },
                        { '$bill_transactions.type$': 'rented' }
                    ]
                }
            });

            var bills = [];
            var unpaid = [];
            var total_rented = 0;
            for (let i = 0; i < all_bills.length; i++) {
                var bill = all_bills[i];
                if (!bill.paid) {
                    unpaid.push(bill);
                }
                var rented = 0;
                for (let j = 0; j < bill.bill_transactions.length; j++) {
                    var txn = bill.bill_transactions[j];
                    if (txn.type === 'rented') {
                        rented += txn.quantity;
                        var returns = txn.return;
                        for (let k = 0; k < returns.length; k++) {
                            var r = returns[k];
                            rented -= r.quantity;
                        }
                        if (rented > 0) {
                            total_rented += rented;
                            bill.bill_rented = rented;
                            bills.push(bill);
                        }
                    }
                }
            }

            data.formatted_rented = numeral(total_rented).format('0,0');
            data.bills = bills;

            data.unpaid = unpaid;

            logTime(__startTime, 'misc.getStats()');

            utilityCache.set('stats', data);
            return data;
        },
        fixUserType: async () => {
            await models.User.update({ user_type: 'Admin' }, {
                where: {
                    user_type: null
                }
            });
        },
        syncCustomerLedgerSale: async () => {
            var bills = await models.Bill.findAll({
                include: [
                    {
                        model: models.User
                    },
                    {
                        model: models.Customer
                    }
                ],
                
            });
            for (let bill of bills) {
                if (bill.payment_method === 'Free') continue;
                var entry = await models.CustomerLedger.create({
                    type: 'Sale',
                    debit: bill.total,
                    credit: bill.originalPaid ? bill.total: null,
                    date: bill.createdAt
                });
                
                await entry.setSale(bill);
                await entry.setCustomer(bill.customer);
                await entry.setUser(bill.user);
            }
            console.log("Customer Ledger sale complete");
        },
        syncCustomerLedgerDeposit: async () => {            
            var deposits = [[10203,"Deposit",50,null,"2021-05-28T00:00:00","2021-05-27T00:30:00","2021-07-11T10:44:18",326,null,4],[10207,"Deposit",50,null,"2021-05-28T00:00:00","2021-05-27T00:30:00","2021-07-11T10:44:18",625,null,4],[10246,"Deposit",50,null,"2021-05-27T00:00:00","2021-05-28T12:47:33","2021-07-11T10:44:18",703,10794,4],[10247,"Deposit",50,null,"2021-05-27T00:00:00","2021-05-26T00:30:00","2021-07-11T10:44:18",515,null,4],[10265,"Deposit",80,null,"2021-05-28T00:00:00","2021-05-29T23:11:32","2021-07-11T10:44:18",514,9299,3],[10274,"Deposit",35,null,"2021-05-28T00:00:00","2021-05-29T23:17:48","2021-07-11T10:44:18",700,9208,3],[10307,"Deposit",1550,null,"2021-05-28T00:00:00","2021-05-30T12:08:07","2021-07-11T10:44:18",376,10686,4],[10366,"Deposit",1300,null,"2021-05-30T00:00:00","2021-06-01T12:35:22","2021-07-11T10:44:18",669,10213,4],[10367,"Deposit",50,null,"2021-05-30T00:00:00","2021-05-29T00:30:00","2021-07-11T10:44:18",315,null,4],[10368,"Deposit",100,null,"2021-05-30T00:00:00","2021-06-01T12:37:53","2021-07-11T10:44:18",318,9306,4],[10369,"Deposit",100,null,"2021-05-30T00:00:00","2021-06-01T12:38:32","2021-07-11T10:44:18",715,10751,4],[10370,"Deposit",250,null,"2021-06-01T00:00:00","2021-06-01T12:39:20","2021-07-11T10:44:18",473,10937,4],[10371,"Deposit",25210,null,"2021-05-27T00:00:00","2021-05-26T00:30:00","2021-07-11T10:44:18",575,null,4],[10407,"Deposit",500,null,"2021-05-31T00:00:00","2021-06-01T17:23:21","2021-07-11T10:44:18",701,11018,3],[10459,"Deposit",50,null,"2021-05-31T00:00:00","2021-06-01T18:31:41","2021-07-11T10:44:18",152,10126,4],[10460,"Deposit",50,null,"2021-05-31T00:00:00","2021-06-01T18:32:45","2021-07-11T10:44:18",53,10940,4],[10461,"Deposit",50,null,"2021-05-31T00:00:00","2021-06-01T18:33:11","2021-07-11T10:44:18",237,10992,4],[10462,"Deposit",1650,null,"2021-05-31T00:00:00","2021-06-01T18:33:57","2021-07-11T10:44:18",638,8194,4],[10469,"Deposit",6950,null,"2021-03-14T00:00:00","2021-06-01T18:56:45","2021-07-11T10:44:18",378,3327,3],[10470,"Deposit",6800,null,"2021-04-05T00:00:00","2021-06-01T20:57:53","2021-07-11T10:44:18",383,6171,3],[10471,"Deposit",6800,null,"2021-04-14T00:00:00","2021-06-01T20:58:23","2021-07-11T10:44:18",383,7006,3],[10472,"Deposit",6800,null,"2021-04-16T00:00:00","2021-06-01T20:58:46","2021-07-11T10:44:18",383,7545,3],[10473,"Deposit",10000,null,"2021-03-27T00:00:00","2021-06-01T21:00:22","2021-07-11T10:44:18",617,6287,3],[10518,"Deposit",40,null,"2021-06-01T00:00:00","2021-06-02T19:50:03","2021-07-11T10:44:18",694,9295,3],[10522,"Deposit",560,null,"2021-06-01T00:00:00","2021-05-31T00:30:00","2021-07-11T10:44:19",390,null,3],[10527,"Deposit",200,null,"2021-06-01T00:00:00","2021-06-02T19:54:31","2021-07-11T10:44:19",408,7534,3],[10536,"Deposit",50,null,"2021-06-01T00:00:00","2021-06-03T11:46:27","2021-07-11T10:44:19",39,10397,4],[10583,"Deposit",2000,null,"2021-06-02T00:00:00","2021-06-01T00:30:00","2021-07-11T10:44:19",745,null,4],[10584,"Deposit",250,null,"2021-06-02T00:00:00","2021-06-01T00:30:00","2021-07-11T10:44:19",13,null,4],[10613,"Deposit",40,null,"2021-06-03T00:00:00","2021-06-02T00:30:00","2021-07-11T10:44:19",449,null,3],[10620,"Deposit",980,null,"2021-06-03T00:00:00","2021-06-04T17:28:31","2021-07-11T10:44:19",394,10649,3],[10625,"Deposit",40,null,"2021-06-03T00:00:00","2021-06-04T17:30:42","2021-07-11T10:44:19",529,11047,3],[10686,"Deposit",3900,null,"2021-06-03T00:00:00","2021-06-04T18:17:17","2021-07-11T10:44:19",733,10606,4],[10687,"Deposit",6000,null,"2021-06-03T00:00:00","2021-06-02T00:30:00","2021-07-11T10:44:19",13,null,4],[10688,"Deposit",50,null,"2021-06-03T00:00:00","2021-06-04T18:24:41","2021-07-11T10:44:19",31,11138,4],[10689,"Deposit",50,null,"2021-06-03T00:00:00","2021-06-04T18:25:11","2021-07-11T10:44:19",245,10225,4],[10690,"Deposit",50,null,"2021-06-03T00:00:00","2021-06-04T18:25:34","2021-07-11T10:44:19",178,10964,4],[10691,"Deposit",100,null,"2021-06-03T00:00:00","2021-06-04T18:26:03","2021-07-11T10:44:19",315,11094,4],[10692,"Deposit",2700,null,"2021-06-03T00:00:00","2021-06-04T18:26:35","2021-07-11T10:44:19",127,9951,4],[10693,"Deposit",420,null,"2021-06-03T00:00:00","2021-06-04T18:33:42","2021-07-11T10:44:19",746,11230,3],[10695,"Deposit",80,null,"2021-06-04T00:00:00","2021-06-06T00:17:45","2021-07-11T10:44:19",449,null,3],[10814,"Deposit",800,null,"2021-06-05T00:00:00","2021-06-07T14:37:06","2021-07-11T10:44:19",450,11348,4],[10815,"Deposit",50,null,"2021-06-04T00:00:00","2021-06-07T14:37:37","2021-07-11T10:44:19",396,11088,4],[10816,"Deposit",50,null,"2021-06-04T00:00:00","2021-06-03T00:30:00","2021-07-11T10:44:19",31,null,4],[10817,"Deposit",100,null,"2021-06-04T00:00:00","2021-06-07T14:38:44","2021-07-11T10:44:19",338,8072,4],[10818,"Deposit",100,null,"2021-06-05T00:00:00","2021-06-07T14:40:40","2021-07-11T10:44:19",349,2709,2],[10819,"Deposit",50,null,"2021-06-05T00:00:00","2021-06-04T00:30:00","2021-07-11T10:44:19",269,null,4],[10820,"Deposit",50,null,"2021-06-05T00:00:00","2021-06-07T14:41:37","2021-07-11T10:44:19",716,11010,4],[10821,"Deposit",50,null,"2021-06-05T00:00:00","2021-06-07T14:42:02","2021-07-11T10:44:19",665,10971,4],[10822,"Deposit",50,null,"2021-06-05T00:00:00","2021-06-07T14:42:31","2021-07-11T10:44:19",254,11357,4],[10823,"Deposit",18000,null,"2021-06-05T00:00:00","2021-06-04T00:30:00","2021-07-11T10:44:19",575,null,4],[10830,"Deposit",175,null,"2021-06-05T00:00:00","2021-06-04T00:30:00","2021-07-11T10:44:19",511,null,3],[10833,"Deposit",230,null,"2021-06-05T00:00:00","2021-06-04T00:30:00","2021-07-11T10:44:19",390,null,3],[10835,"Deposit",40,null,"2021-06-05T00:00:00","2021-06-04T00:30:00","2021-07-11T10:44:19",610,null,3],[10840,"Deposit",40,null,"2021-06-05T00:00:00","2021-06-07T17:25:54","2021-07-11T10:44:19",701,null,3],[10851,"Deposit",80,null,"2021-06-05T00:00:00","2021-06-07T17:33:20","2021-07-11T10:44:19",723,11046,3],[10855,"Deposit",785,null,"2021-06-05T00:00:00","2021-06-04T00:30:00","2021-07-11T10:44:19",506,null,3],[10874,"Deposit",80,null,"2021-06-06T00:00:00","2021-06-07T18:04:42","2021-07-11T10:44:19",394,null,3],[10988,"Deposit",30000,null,"2021-06-08T00:00:00","2021-06-08T12:19:25","2021-07-11T10:44:20",598,6888,4],[11002,"Deposit",1620,null,"2021-06-08T00:00:00","2021-06-08T13:03:40","2021-07-11T10:44:20",608,11456,3],[11018,"Deposit",80,null,"2021-06-07T00:00:00","2021-06-08T13:36:18","2021-07-11T10:44:20",482,5852,3],[11038,"Deposit",40,null,"2021-06-08T00:00:00","2021-06-08T23:12:23","2021-07-11T10:44:20",627,8123,3],[11051,"Deposit",595,null,"2021-06-08T00:00:00","2021-06-07T00:30:00","2021-07-11T10:44:20",390,null,3],[11057,"Deposit",80,null,"2021-06-08T00:00:00","2021-06-08T23:45:44","2021-07-11T10:44:20",701,null,3],[11058,"Deposit",280,null,"2021-06-08T00:00:00","2021-06-08T23:45:59","2021-07-11T10:44:20",701,null,3],[11061,"Deposit",420,null,"2021-06-08T00:00:00","2021-06-07T00:30:00","2021-07-11T10:44:20",591,null,3],[11066,"Deposit",650,null,"2021-06-08T00:00:00","2021-06-08T23:53:06","2021-07-11T10:44:20",479,6016,3],[11118,"Deposit",50,null,"2021-06-08T00:00:00","2021-06-09T15:53:17","2021-07-11T10:44:20",27,11300,4],[11119,"Deposit",100,null,"2021-06-08T00:00:00","2021-06-09T15:53:53","2021-07-11T10:44:20",109,2242,2],[11120,"Deposit",100,null,"2021-06-08T00:00:00","2021-06-09T15:54:23","2021-07-11T10:44:20",318,10251,4],[11121,"Deposit",260,null,"2021-06-08T00:00:00","2021-06-09T15:54:52","2021-07-11T10:44:20",387,11436,4],[11122,"Deposit",50,null,"2021-06-08T00:00:00","2021-06-09T15:55:21","2021-07-11T10:44:20",524,10598,4],[11123,"Deposit",2000,null,"2021-06-08T00:00:00","2021-06-09T15:55:46","2021-07-11T10:44:20",638,10011,4],[11124,"Deposit",50,null,"2021-06-08T00:00:00","2021-06-09T15:56:12","2021-07-11T10:44:20",614,11433,4],[11125,"Deposit",100,null,"2021-06-08T00:00:00","2021-06-09T15:57:01","2021-07-11T10:44:20",280,10880,4],[11126,"Deposit",50,null,"2021-06-08T00:00:00","2021-06-09T15:57:40","2021-07-11T10:44:20",396,null,4],[11127,"Deposit",50,null,"2021-06-07T00:00:00","2021-06-09T15:58:30","2021-07-11T10:44:20",315,11173,4],[11128,"Deposit",210,null,"2021-06-07T00:00:00","2021-06-06T00:30:00","2021-07-11T10:44:20",7,null,4],[11129,"Deposit",50,null,"2021-06-07T00:00:00","2021-06-06T00:30:00","2021-07-11T10:44:20",633,null,4],[11130,"Deposit",50,null,"2021-06-08T00:00:00","2021-06-07T00:30:00","2021-07-11T10:44:20",326,null,4],[11131,"Deposit",50,null,"2021-06-08T00:00:00","2021-06-09T16:01:04","2021-07-11T10:44:20",740,11175,4],[11132,"Deposit",1400,null,"2021-06-08T00:00:00","2021-06-09T16:01:57","2021-07-11T10:44:20",21,11684,4],[11133,"Deposit",1650,null,"2021-06-08T00:00:00","2021-06-09T16:03:39","2021-07-11T10:44:20",65,11685,4],[11134,"Deposit",50,null,"2021-06-08T00:00:00","2021-06-07T00:30:00","2021-07-11T10:44:20",712,null,4],[11135,"Deposit",50,null,"2021-06-08T00:00:00","2021-06-07T00:30:00","2021-07-11T10:44:20",29,null,4],[11136,"Deposit",50,null,"2021-06-08T00:00:00","2021-06-09T16:05:01","2021-07-11T10:44:20",285,11089,4],[11137,"Deposit",50,null,"2021-06-08T00:00:00","2021-06-09T16:05:23","2021-07-11T10:44:20",338,null,4],[11141,"Deposit",6000,null,"2021-06-08T00:00:00","2021-06-07T00:30:00","2021-07-11T10:44:20",725,null,4],[11142,"Deposit",10000,null,"2021-06-08T00:00:00","2021-06-09T16:23:40","2021-07-11T10:44:20",575,null,4],[11150,"Deposit",700,null,"2021-06-09T00:00:00","2021-06-09T23:13:52","2021-07-11T10:44:20",701,11451,3],[11158,"Deposit",420,null,"2021-06-09T00:00:00","2021-06-09T23:19:29","2021-07-11T10:44:20",746,11268,3],[11161,"Deposit",80,null,"2021-06-09T00:00:00","2021-06-09T23:20:54","2021-07-11T10:44:20",729,11665,3],[11213,"Deposit",50,null,"2021-06-09T00:00:00","2021-06-10T12:59:50","2021-07-11T10:44:20",715,null,4],[11214,"Deposit",260,null,"2021-06-09T00:00:00","2021-06-10T13:00:38","2021-07-11T10:44:20",402,10795,4],[11215,"Deposit",100,null,"2021-06-09T00:00:00","2021-06-10T13:01:11","2021-07-11T10:44:20",580,11363,4],[11216,"Deposit",50,null,"2021-06-09T00:00:00","2021-06-08T00:30:00","2021-07-11T10:44:20",113,null,4],[11217,"Deposit",100,null,"2021-06-09T00:00:00","2021-06-10T13:03:12","2021-07-11T10:44:20",244,11407,4],[11218,"Deposit",50,null,"2021-06-09T00:00:00","2021-06-08T00:30:00","2021-07-11T10:44:20",29,null,4],[11267,"Deposit",1595,null,"2021-06-10T00:00:00","2021-06-11T15:36:50","2021-07-11T10:44:20",341,8706,4],[11274,"Deposit",80,null,"2021-06-10T00:00:00","2021-06-09T00:30:00","2021-07-11T10:44:20",490,null,3],[11278,"Deposit",80,null,"2021-06-10T00:00:00","2021-06-12T03:10:40","2021-07-11T10:44:20",533,11645,3],[11298,"Deposit",40,null,"2021-06-10T00:00:00","2021-06-12T03:31:05","2021-07-11T10:44:20",758,11737,3],[11305,"Deposit",40,null,"2021-06-10T00:00:00","2021-06-09T00:30:00","2021-07-11T10:44:20",603,null,3],[11314,"Deposit",80,null,"2021-06-11T00:00:00","2021-06-12T04:05:37","2021-07-11T10:44:20",449,null,3],[11344,"Deposit",6000,null,"2021-06-11T00:00:00","2021-06-11T00:30:00","2021-06-17T12:18:16",13,null,4],[11377,"Deposit",50,null,"2021-06-11T00:00:00","2021-06-13T15:59:37","2021-06-17T12:00:31",318,10544,4],[11378,"Deposit",350,null,"2021-06-11T00:00:00","2021-06-13T16:00:04","2021-06-17T12:00:31",473,11717,4],[11379,"Deposit",50,null,"2021-06-11T00:00:00","2021-06-13T16:00:50","2021-06-17T12:00:31",692,10044,4],[11380,"Deposit",100,null,"2021-06-11T00:00:00","2021-06-11T00:30:00","2021-06-17T12:35:04",515,null,4],[11381,"Deposit",150,null,"2021-06-11T00:00:00","2021-06-13T16:03:28","2021-06-17T12:00:31",264,11751,4],[11429,"Deposit",1280,null,"2021-06-12T00:00:00","2021-06-13T17:40:28","2021-06-17T12:00:31",394,11321,3],[11430,"Deposit",160,null,"2021-06-12T00:00:00","2021-06-13T17:42:56","2021-06-17T12:00:31",497,11857,3],[11437,"Deposit",140,null,"2021-06-12T00:00:00","2021-06-12T00:30:00","2021-06-17T12:33:23",511,null,3],[11447,"Deposit",40,null,"2021-06-12T00:00:00","2021-06-13T17:56:56","2021-06-17T12:00:31",529,11867,3],[11448,"Deposit",200,null,"2021-06-12T00:00:00","2021-06-13T17:57:50","2021-06-17T12:00:31",723,11609,3],[11452,"Deposit",40,null,"2021-06-12T00:00:00","2021-06-12T00:30:00","2021-06-17T12:41:26",610,null,3],[11455,"Deposit",80,null,"2021-06-12T00:00:00","2021-06-13T18:05:04","2021-06-17T12:00:31",514,9911,3],[11484,"Deposit",50,null,"2021-06-13T00:00:00","2021-06-14T12:47:10","2021-06-17T12:00:31",179,11169,4],[11487,"Deposit",40,null,"2021-06-13T00:00:00","2021-06-14T16:56:56","2021-06-17T12:00:31",646,11853,3],[11489,"Deposit",40,null,"2021-06-13T00:00:00","2021-06-14T16:58:59","2021-06-14T16:58:59",449,null,3],[11504,"Deposit",80,null,"2021-06-13T00:00:00","2021-06-14T17:14:17","2021-06-17T12:00:31",737,11855,3],[11512,"Deposit",1660,null,"2021-06-13T00:00:00","2021-06-14T17:22:01","2021-06-17T12:00:31",506,4917,3],[11520,"Deposit",650,null,"2021-06-13T00:00:00","2021-06-14T17:27:45","2021-06-17T12:00:31",479,9908,3],[11547,"Deposit",120,null,"2021-06-14T00:00:00","2021-06-15T14:45:30","2021-06-17T12:00:31",369,7053,4],[11548,"Deposit",50,null,"2021-06-14T00:00:00","2021-06-15T14:45:55","2021-06-17T12:00:31",665,11693,4],[11549,"Deposit",100,null,"2021-06-14T00:00:00","2021-06-15T14:46:20","2021-06-17T12:00:31",727,11785,4],[11550,"Deposit",50,null,"2021-06-14T00:00:00","2021-06-15T14:46:47","2021-06-17T12:00:31",387,11523,4],[11551,"Deposit",50,null,"2021-06-14T00:00:00","2021-06-15T14:47:15","2021-06-17T12:00:31",315,11426,4],[11552,"Deposit",50,null,"2021-06-14T00:00:00","2021-06-15T14:47:40","2021-06-17T12:00:31",525,12017,4],[11553,"Deposit",150,null,"2021-06-14T00:00:00","2021-06-15T14:48:03","2021-06-17T12:00:31",27,11930,4],[11555,"Deposit",1950,null,"2021-06-14T00:00:00","2021-06-15T14:52:43","2021-06-15T14:52:43",341,null,4],[11557,"Deposit",80,null,"2021-06-14T00:00:00","2021-06-16T01:11:32","2021-06-17T12:00:31",694,11879,3],[11569,"Deposit",260,null,"2021-06-14T00:00:00","2021-06-14T00:30:00","2021-06-17T12:31:28",490,null,3],[11575,"Deposit",40,null,"2021-06-14T00:00:00","2021-06-16T01:32:45","2021-06-16T01:32:45",729,null,3],[11577,"Deposit",200,null,"2021-06-15T00:00:00","2021-06-16T01:36:38","2021-06-17T12:00:31",479,10623,3],[11635,"Deposit",50,null,"2021-06-15T00:00:00","2021-06-16T16:40:40","2021-06-17T12:00:31",152,10314,4],[11636,"Deposit",150,null,"2021-06-15T00:00:00","2021-06-16T16:41:22","2021-06-17T12:00:31",53,11962,4],[11637,"Deposit",185,null,"2021-06-15T00:00:00","2021-06-16T16:42:49","2021-06-17T12:00:31",207,11799,4],[11638,"Deposit",480,null,"2021-06-15T00:00:00","2021-06-16T16:43:25","2021-06-17T12:00:31",16,12019,4],[11639,"Deposit",80,null,"2021-06-15T00:00:00","2021-06-16T16:44:21","2021-06-17T12:00:31",226,10370,4],[11640,"Deposit",160,null,"2021-06-15T00:00:00","2021-06-16T16:45:17","2021-06-17T12:00:31",85,11558,4],[11641,"Deposit",300,null,"2021-06-15T00:00:00","2021-06-16T16:45:49","2021-06-17T12:00:31",295,12020,4],[11646,"Deposit",80,null,"2021-06-16T00:00:00","2021-06-17T13:47:06","2021-06-17T13:47:06",482,null,3],[11658,"Deposit",240,null,"2021-06-16T00:00:00","2021-06-17T13:55:08","2021-06-17T13:55:08",408,11858,3],[11709,"Deposit",50,null,"2021-06-16T00:00:00","2021-06-17T14:47:28","2021-06-17T14:47:28",672,11946,4],[11710,"Deposit",50,null,"2021-06-16T00:00:00","2021-06-17T14:47:51","2021-06-17T14:47:52",338,null,4],[11711,"Deposit",480,null,"2021-06-16T00:00:00","2021-06-17T14:48:43","2021-06-17T14:48:43",229,11772,4],[11712,"Deposit",500,null,"2021-06-16T00:00:00","2021-06-17T14:49:12","2021-06-17T14:49:12",362,12212,4],[11713,"Deposit",50,null,"2021-06-16T00:00:00","2021-06-17T14:49:35","2021-06-17T14:49:35",31,12141,4],[11714,"Deposit",100,null,"2021-06-16T00:00:00","2021-06-17T14:49:58","2021-06-17T14:49:58",27,12099,4],[11716,"Deposit",960,null,"2021-06-16T00:00:00","2021-06-17T14:56:33","2021-06-17T14:56:33",341,null,4],[11723,"Deposit",120,null,"2021-06-17T00:00:00","2021-06-18T00:57:18","2021-06-18T00:57:18",723,11865,3],[11728,"Deposit",40,null,"2021-06-17T00:00:00","2021-06-18T01:02:41","2021-06-18T01:02:41",627,10640,3],[11738,"Deposit",1140,null,"2021-06-17T00:00:00","2021-06-18T01:10:06","2021-06-18T01:10:06",394,null,3],[11783,"Deposit",8500,null,"2021-06-17T00:00:00","2021-06-18T17:28:25","2021-06-18T17:28:25",745,null,4],[11784,"Deposit",100,null,"2021-06-17T00:00:00","2021-06-18T17:29:14","2021-06-18T17:29:14",237,null,4],[11785,"Deposit",200,null,"2021-06-17T00:00:00","2021-06-18T17:29:44","2021-06-18T17:29:44",450,12030,4],[11792,"Deposit",105,null,"2021-06-18T00:00:00","2021-06-19T21:00:54","2021-06-19T21:00:54",511,null,3],[11796,"Deposit",35,null,"2021-06-18T00:00:00","2021-06-19T21:03:40","2021-06-19T21:03:40",385,null,3],[11804,"Deposit",560,null,"2021-06-18T00:00:00","2021-06-19T21:13:20","2021-06-19T21:13:20",552,12262,3],[11807,"Deposit",40,null,"2021-06-18T00:00:00","2021-06-19T21:18:40","2021-06-19T21:18:40",640,10853,3],[11850,"Deposit",4000,null,"2021-06-18T00:00:00","2021-06-20T13:10:40","2021-06-20T13:10:40",776,null,4],[11851,"Deposit",2000,null,"2021-06-18T00:00:00","2021-06-20T13:11:31","2021-06-20T13:11:31",745,null,4],[11852,"Deposit",100,null,"2021-06-19T00:00:00","2021-06-20T13:16:49","2021-06-20T13:16:49",300,11926,4],[11853,"Deposit",50,null,"2021-06-19T00:00:00","2021-06-20T13:17:23","2021-06-20T13:17:23",716,11823,4],[11898,"Deposit",50,null,"2021-06-19T00:00:00","2021-06-20T14:04:47","2021-06-20T14:04:47",45,null,4],[11899,"Deposit",100,null,"2021-06-19T00:00:00","2021-06-20T14:05:13","2021-06-20T14:05:13",254,12222,4],[11900,"Deposit",2000,null,"2021-06-19T00:00:00","2021-06-20T14:05:42","2021-06-20T14:05:42",296,12221,4],[11901,"Deposit",50,null,"2021-06-19T00:00:00","2021-06-20T14:06:07","2021-06-20T14:06:07",348,11687,4],[11902,"Deposit",50,null,"2021-06-19T00:00:00","2021-06-20T14:06:56","2021-06-20T14:06:56",318,10684,4],[11903,"Deposit",50,null,"2021-06-19T00:00:00","2021-06-20T14:07:53","2021-06-20T14:07:53",525,null,4],[11905,"Deposit",25000,null,"2021-06-15T00:00:00","2021-06-20T17:47:33","2021-06-20T17:47:33",598,null,4],[11922,"Deposit",40,null,"2021-06-19T00:00:00","2021-06-21T00:42:32","2021-06-21T00:42:32",603,null,3],[11925,"Deposit",40,null,"2021-06-19T00:00:00","2021-06-21T00:44:22","2021-06-21T00:44:22",588,11475,3],[11928,"Deposit",120,null,"2021-06-19T00:00:00","2021-06-21T00:46:13","2021-06-21T00:46:13",729,12117,3],[11934,"Deposit",80,null,"2021-06-19T00:00:00","2021-06-21T00:50:32","2021-06-21T00:50:32",567,10833,3],[11944,"Deposit",80,null,"2021-06-20T00:00:00","2021-06-21T01:20:26","2021-06-21T01:20:26",758,12266,3],[11949,"Deposit",385,null,"2021-06-20T00:00:00","2021-06-21T01:24:45","2021-06-21T01:24:45",382,12324,3],[11995,"Deposit",100,null,"2021-06-20T00:00:00","2021-06-22T13:18:06","2021-06-22T13:18:06",33,3643,4],[11996,"Deposit",50,null,"2021-06-20T00:00:00","2021-06-22T13:18:43","2021-06-22T13:18:43",49,11822,4],[11997,"Deposit",50,null,"2021-06-20T00:00:00","2021-06-22T13:19:29","2021-06-22T13:19:29",458,12392,4],[11998,"Deposit",200,null,"2021-06-20T00:00:00","2021-06-22T13:20:01","2021-06-22T13:20:01",135,12273,4],[11999,"Deposit",200,null,"2021-06-20T00:00:00","2021-06-22T13:20:37","2021-06-22T13:20:37",286,12086,4],[12000,"Deposit",405,null,"2021-06-20T00:00:00","2021-06-22T13:50:45","2021-06-22T13:50:45",43,8497,4],[12001,"Deposit",17500,null,"2021-06-21T00:00:00","2021-06-22T14:14:35","2021-06-22T14:14:35",704,12306,4],[12010,"Deposit",40,null,"2021-06-21T00:00:00","2021-06-22T20:54:32","2021-06-22T20:54:32",752,11850,3],[12018,"Deposit",280,null,"2021-06-21T00:00:00","2021-06-22T21:08:09","2021-06-22T21:08:09",746,11738,3],[12069,"Deposit",2600,null,"2021-06-21T00:00:00","2021-06-23T13:24:06","2021-06-23T13:24:06",733,12043,4],[12073,"Deposit",1500,null,"2021-06-21T00:00:00","2021-06-23T13:53:01","2021-06-23T13:53:01",341,null,4],[12087,"Deposit",1000,null,"2021-06-18T00:00:00","2021-06-23T16:08:33","2021-06-23T16:08:33",127,null,4],[12143,"Deposit",70,null,"2021-06-22T00:00:00","2021-06-23T20:25:51","2021-06-23T20:25:51",511,null,3],[12145,"Deposit",35,null,"2021-06-22T00:00:00","2021-06-23T20:26:47","2021-06-23T20:26:47",385,null,3],[12148,"Deposit",600,null,"2021-06-22T00:00:00","2021-06-23T20:28:49","2021-06-23T20:28:49",390,null,3],[12151,"Deposit",1065,null,"2021-06-22T00:00:00","2021-06-23T20:32:23","2021-06-23T20:32:23",506,null,3],[12160,"Deposit",40,null,"2021-06-22T00:00:00","2021-06-23T20:37:14","2021-06-23T20:37:14",758,null,3],[12191,"Deposit",40,null,"2021-06-23T00:00:00","2021-06-23T21:15:05","2021-06-23T21:15:05",729,null,3],[12194,"Deposit",1135,null,"2021-06-23T00:00:00","2021-06-24T12:23:25","2021-06-24T12:23:25",464,7958,4],[12195,"Deposit",500,null,"2021-06-23T00:00:00","2021-06-24T12:24:05","2021-06-24T12:24:05",403,null,4],[12196,"Deposit",2175,null,"2021-06-23T00:00:00","2021-06-24T12:24:40","2021-06-24T12:24:40",307,11956,4],[12197,"Deposit",23000,null,"2021-06-23T00:00:00","2021-06-24T14:39:25","2021-06-24T14:39:25",575,null,4],[12198,"Deposit",100,null,"2021-06-22T00:00:00","2021-06-24T15:51:00","2021-06-24T15:51:00",779,12547,4],[12199,"Deposit",250,null,"2021-06-22T00:00:00","2021-06-24T15:51:33","2021-06-24T15:51:33",181,12286,4],[12200,"Deposit",600,null,"2021-06-22T00:00:00","2021-06-24T15:52:05","2021-06-24T15:52:05",131,12462,4],[12201,"Deposit",100,null,"2021-06-22T00:00:00","2021-06-24T15:52:37","2021-06-24T15:52:37",348,12394,4],[12202,"Deposit",300,null,"2021-06-22T00:00:00","2021-06-24T15:53:05","2021-06-24T15:53:05",228,10068,4],[12203,"Deposit",100,null,"2021-06-22T00:00:00","2021-06-24T15:53:34","2021-06-24T15:53:34",210,12476,4],[12204,"Deposit",50,null,"2021-06-22T00:00:00","2021-06-24T15:54:06","2021-06-24T15:54:06",515,null,4],[12205,"Deposit",50,null,"2021-06-22T00:00:00","2021-06-24T15:54:33","2021-06-24T15:54:33",198,7467,4],[12206,"Deposit",50,null,"2021-06-22T00:00:00","2021-06-24T15:55:09","2021-06-24T15:55:09",762,12165,4],[12207,"Deposit",500,null,"2021-06-22T00:00:00","2021-06-24T15:55:39","2021-06-24T15:55:39",32,12275,4],[12208,"Deposit",50,null,"2021-06-22T00:00:00","2021-06-24T15:56:09","2021-06-24T15:56:09",396,12458,4],[12257,"Deposit",1000,null,"2021-06-23T00:00:00","2021-06-26T12:08:20","2021-06-26T12:08:20",341,null,4],[12258,"Deposit",30,null,"2021-06-23T00:00:00","2021-06-26T12:11:18","2021-06-26T12:11:18",135,null,4],[12259,"Deposit",150,null,"2021-06-23T00:00:00","2021-06-26T12:11:51","2021-06-26T12:11:51",264,12378,4],[12260,"Deposit",920,null,"2021-06-23T00:00:00","2021-06-26T12:12:43","2021-06-26T12:12:43",77,12027,4],[12261,"Deposit",100,null,"2021-06-23T00:00:00","2021-06-26T12:13:37","2021-06-26T12:13:37",63,null,4],[12262,"Deposit",50,null,"2021-06-23T00:00:00","2021-06-26T12:14:08","2021-06-26T12:14:08",395,12215,4],[12263,"Deposit",1000,null,"2021-06-23T00:00:00","2021-06-26T12:15:16","2021-06-26T12:15:16",638,10131,4],[12264,"Deposit",1500,null,"2021-06-23T00:00:00","2021-06-26T12:16:00","2021-06-26T12:16:00",218,8742,4],[12265,"Deposit",100,null,"2021-06-23T00:00:00","2021-06-26T12:16:39","2021-06-26T12:16:39",349,3547,4],[12316,"Deposit",3000,null,"2021-06-24T00:00:00","2021-06-26T17:14:36","2021-06-26T17:14:36",782,null,4],[12318,"Deposit",20875,null,"2021-06-24T00:00:00","2021-06-26T17:18:16","2021-06-26T17:18:16",341,null,4],[12338,"Deposit",1620,null,"2021-06-24T00:00:00","2021-06-26T23:48:17","2021-06-26T23:48:17",608,12451,3],[12351,"Deposit",80,null,"2021-06-25T00:00:00","2021-06-27T00:09:36","2021-06-27T00:09:36",701,null,3],[12356,"Deposit",40,null,"2021-06-25T00:00:00","2021-06-27T00:12:29","2021-06-27T00:12:29",500,12048,3],[12363,"Deposit",40,null,"2021-06-25T00:00:00","2021-06-27T00:17:08","2021-06-27T00:17:08",529,12250,3],[12367,"Deposit",100,null,"2021-06-25T00:00:00","2021-06-27T00:19:33","2021-06-27T00:19:33",390,null,3],[12368,"Deposit",105,null,"2021-06-25T00:00:00","2021-06-27T00:20:18","2021-06-27T00:20:18",382,12640,3],[12377,"Deposit",40,null,"2021-06-25T00:00:00","2021-06-27T00:26:04","2021-06-27T00:26:04",729,null,3],[12378,"Deposit",80,null,"2021-06-25T00:00:00","2021-06-27T00:26:42","2021-06-27T00:26:42",567,11495,3],[12381,"Deposit",5250,null,"2021-06-22T00:00:00","2021-06-27T14:24:08","2021-06-27T14:24:08",725,null,4],[12469,"Deposit",480,null,"2021-06-26T00:00:00","2021-06-27T17:38:51","2021-06-27T17:38:51",227,12287,4],[12470,"Deposit",50,null,"2021-06-26T00:00:00","2021-06-27T17:39:22","2021-06-27T17:39:22",237,null,4],[12471,"Deposit",50,null,"2021-06-24T00:00:00","2021-06-27T17:40:00","2021-06-27T17:40:00",144,12552,4],[12472,"Deposit",100,null,"2021-06-24T00:00:00","2021-06-27T17:40:31","2021-06-27T17:40:31",101,12359,4],[12473,"Deposit",50,null,"2021-06-24T00:00:00","2021-06-27T17:41:00","2021-06-27T17:41:00",481,12718,4],[12474,"Deposit",50,null,"2021-06-24T00:00:00","2021-06-27T17:41:36","2021-06-27T17:41:36",625,12372,4],[12475,"Deposit",50,null,"2021-06-24T00:00:00","2021-06-27T17:42:12","2021-06-27T17:42:12",379,11364,4],[12476,"Deposit",100,null,"2021-06-25T00:00:00","2021-06-27T17:42:57","2021-06-27T17:42:58",569,12533,4],[12477,"Deposit",50,null,"2021-06-25T00:00:00","2021-06-27T17:43:24","2021-06-27T17:43:24",285,11975,4],[12478,"Deposit",100,null,"2021-06-25T00:00:00","2021-06-27T17:44:00","2021-06-27T17:44:00",294,8406,4],[12479,"Deposit",50,null,"2021-06-25T00:00:00","2021-06-27T17:44:30","2021-06-27T17:44:30",52,12016,4],[12480,"Deposit",50,null,"2021-06-26T00:00:00","2021-06-27T17:45:14","2021-06-27T17:45:14",300,12614,4],[12481,"Deposit",50,null,"2021-06-26T00:00:00","2021-06-27T17:45:37","2021-06-27T17:45:37",664,12615,4],[12482,"Deposit",50,null,"2021-06-26T00:00:00","2021-06-27T17:46:09","2021-06-27T17:46:09",201,12336,4],[12483,"Deposit",100,null,"2021-06-26T00:00:00","2021-06-27T17:46:57","2021-06-27T17:46:57",318,10943,4],[12484,"Deposit",100,null,"2021-06-26T00:00:00","2021-06-27T17:47:22","2021-06-27T17:47:22",191,12081,4],[12485,"Deposit",100,null,"2021-06-26T00:00:00","2021-06-27T17:47:47","2021-06-27T17:47:47",105,11754,4],[12486,"Deposit",325,null,"2021-06-26T00:00:00","2021-06-27T17:48:13","2021-06-27T17:48:13",638,null,4],[12487,"Deposit",1200,null,"2021-06-24T00:00:00","2021-06-27T17:49:00","2021-06-27T17:49:00",638,null,4],[12489,"Deposit",9200,null,"2021-06-26T00:00:00","2021-06-27T17:54:00","2021-06-27T17:54:00",341,null,4],[12490,"Deposit",4195,null,"2021-06-26T00:00:00","2021-06-27T17:54:28","2021-06-27T17:54:28",341,null,4],[12529,"Deposit",80,null,"2021-06-27T00:00:00","2021-06-28T11:14:02","2021-06-28T11:14:02",677,12832,3],[12578,"Deposit",4675,null,"2021-06-27T00:00:00","2021-06-28T15:00:51","2021-06-28T15:00:51",341,null,4],[12579,"Deposit",550,null,"2021-06-27T00:00:00","2021-06-28T15:01:40","2021-06-28T15:01:41",65,12863,4],[12580,"Deposit",50,null,"2021-06-27T00:00:00","2021-06-28T15:02:19","2021-06-28T15:02:19",114,12835,4],[12581,"Deposit",150,null,"2021-06-27T00:00:00","2021-06-28T15:02:51","2021-06-28T15:02:51",286,12722,4],[12582,"Deposit",500,null,"2021-06-27T00:00:00","2021-06-28T15:03:38","2021-06-28T15:03:38",642,12532,4],[12583,"Deposit",100,null,"2021-06-27T00:00:00","2021-06-28T15:03:49","2021-06-28T15:03:49",642,null,4],[12584,"Deposit",200,null,"2021-06-27T00:00:00","2021-06-28T15:04:52","2021-06-28T15:04:52",128,10872,4],[12585,"Deposit",50,null,"2021-06-27T00:00:00","2021-06-28T15:05:17","2021-06-28T15:05:17",396,12870,4],[12586,"Deposit",100,null,"2021-06-27T00:00:00","2021-06-28T15:05:43","2021-06-28T15:05:43",614,12765,4],[12587,"Deposit",50,null,"2021-06-27T00:00:00","2021-06-28T15:06:12","2021-06-28T15:06:12",27,12848,4],[12589,"Deposit",1400,null,"2021-06-28T00:00:00","2021-06-28T23:11:06","2021-06-28T23:11:06",394,12104,3],[12600,"Deposit",80,null,"2021-06-28T00:00:00","2021-06-28T23:19:52","2021-06-28T23:19:52",490,null,3],[12610,"Deposit",420,null,"2021-06-28T00:00:00","2021-06-28T23:25:22","2021-06-28T23:25:22",701,null,3],[12614,"Deposit",40,null,"2021-06-28T00:00:00","2021-06-28T23:28:29","2021-06-28T23:28:29",729,null,3],[12657,"Deposit",200,null,"2021-06-28T00:00:00","2021-06-29T16:56:48","2021-06-29T16:56:48",303,12891,4],[12658,"Deposit",1600,null,"2021-06-28T00:00:00","2021-06-29T16:57:18","2021-06-29T16:57:18",376,12531,4],[12659,"Deposit",200,null,"2021-06-28T00:00:00","2021-06-29T16:57:48","2021-06-29T16:57:48",40,12992,4],[12660,"Deposit",100,null,"2021-06-28T00:00:00","2021-06-29T16:58:19","2021-06-29T16:58:19",650,12607,4],[12661,"Deposit",130,null,"2021-06-28T00:00:00","2021-06-29T16:58:43","2021-06-29T16:58:43",387,12869,4],[12665,"Deposit",15000,null,"2021-06-28T00:00:00","2021-06-29T17:08:43","2021-06-29T17:08:43",575,null,4],[12666,"Deposit",250,null,"2021-06-28T00:00:00","2021-06-29T17:16:14","2021-06-29T17:16:14",277,9962,4],[12667,"Deposit",50,null,"2021-06-28T00:00:00","2021-06-29T17:23:09","2021-06-29T17:23:09",58,11758,4],[12668,"Deposit",300,null,"2021-06-28T00:00:00","2021-06-29T17:23:40","2021-06-29T17:23:40",128,12029,4],[12669,"Deposit",100,null,"2021-06-28T00:00:00","2021-06-29T17:24:11","2021-06-29T17:24:11",271,11432,4],[12670,"Deposit",100,null,"2021-06-28T00:00:00","2021-06-29T17:27:06","2021-06-29T17:27:06",105,12692,4],[12671,"Deposit",150,null,"2021-06-28T00:00:00","2021-06-29T17:27:37","2021-06-29T17:27:37",237,11710,4],[12672,"Deposit",50,null,"2021-06-28T00:00:00","2021-06-29T17:28:24","2021-06-29T17:28:24",338,null,4],[12673,"Deposit",440,null,"2021-06-28T00:00:00","2021-06-29T17:32:17","2021-06-29T17:32:17",56,11671,4],[12686,"Deposit",280,null,"2021-06-29T00:00:00","2021-06-30T00:26:24","2021-06-30T00:26:24",723,12643,3],[12695,"Deposit",120,null,"2021-06-29T00:00:00","2021-06-30T00:32:54","2021-06-30T00:32:55",730,12668,3],[12698,"Deposit",90,null,"2021-06-29T00:00:00","2021-06-30T00:34:45","2021-06-30T00:34:45",552,null,3],[12749,"Deposit",50,null,"2021-06-29T00:00:00","2021-06-30T16:20:43","2021-06-30T16:20:43",237,11812,4],[12750,"Deposit",150,null,"2021-06-29T00:00:00","2021-06-30T16:21:17","2021-06-30T16:21:17",711,12757,4],[12751,"Deposit",250,null,"2021-06-29T00:00:00","2021-06-30T16:21:47","2021-06-30T16:21:47",315,12856,4],[12762,"Deposit",80,null,"2021-06-30T00:00:00","2021-07-01T00:44:55","2021-07-01T00:44:55",677,13013,3],[12767,"Deposit",400,null,"2021-06-30T00:00:00","2021-07-01T00:48:42","2021-07-01T00:48:42",408,13012,3],[12769,"Deposit",80,null,"2021-06-30T00:00:00","2021-07-01T00:50:30","2021-07-01T00:50:30",394,null,3],[12771,"Deposit",2050,null,"2021-06-30T00:00:00","2021-07-01T00:52:54","2021-07-01T00:52:54",506,7624,3],[12773,"Deposit",40,null,"2021-06-30T00:00:00","2021-07-01T00:54:00","2021-07-01T00:54:00",758,null,3],[12774,"Deposit",650,null,"2021-06-30T00:00:00","2021-07-01T00:57:41","2021-07-01T00:57:41",479,11034,3],[12790,"Deposit",40,null,"2021-06-30T00:00:00","2021-07-01T01:11:27","2021-07-01T01:11:27",729,null,3],[12795,"Deposit",260,null,"2021-04-17T00:00:00","2021-07-01T15:57:57","2021-07-01T15:57:57",124,8263,4],[12859,"Deposit",550,null,"2021-06-30T00:00:00","2021-07-01T17:11:34","2021-07-01T17:11:34",473,13113,4],[12860,"Deposit",50,null,"2021-06-30T00:00:00","2021-07-01T17:12:05","2021-07-01T17:12:05",285,12733,4],[12909,"Deposit",1775,null,"2021-07-01T00:00:00","2021-07-02T18:34:54","2021-07-02T18:34:54",218,null,4],[12910,"Deposit",100,null,"2021-07-01T00:00:00","2021-07-02T18:35:24","2021-07-02T18:35:24",727,12687,4],[12911,"Deposit",50,null,"2021-07-01T00:00:00","2021-07-02T18:35:49","2021-07-02T18:35:49",104,12689,4],[12912,"Deposit",160,null,"2021-07-01T00:00:00","2021-07-02T18:36:19","2021-07-02T18:36:19",669,13217,4],[12913,"Deposit",50,null,"2021-07-01T00:00:00","2021-07-02T18:36:45","2021-07-02T18:36:45",153,12919,4],[12914,"Deposit",50,null,"2021-07-01T00:00:00","2021-07-02T18:37:17","2021-07-02T18:37:17",210,12991,4],[12915,"Deposit",50,null,"2021-07-01T00:00:00","2021-07-02T18:38:41","2021-07-02T18:38:41",335,null,4],[12916,"Deposit",50,null,"2021-07-01T00:00:00","2021-07-02T18:39:10","2021-07-02T18:39:10",27,13134,4],[12920,"Deposit",8300,null,"2021-07-01T00:00:00","2021-07-02T18:48:18","2021-07-02T18:48:18",725,10346,4],[12932,"Deposit",70,null,"2021-07-01T00:00:00","2021-07-03T23:22:52","2021-07-03T23:22:52",390,null,3],[12971,"Deposit",40,null,"2021-07-02T00:00:00","2021-07-04T00:07:05","2021-07-04T00:07:05",567,11620,3],[12979,"Deposit",40,null,"2021-07-02T00:00:00","2021-07-04T00:12:13","2021-07-04T00:12:13",629,null,3],[12981,"Deposit",80,null,"2021-07-02T00:00:00","2021-07-04T00:14:40","2021-07-04T00:14:41",729,12323,3],[13034,"Deposit",100,null,"2021-07-02T00:00:00","2021-07-04T15:20:05","2021-07-04T15:20:05",750,11389,4],[13035,"Deposit",350,null,"2021-07-02T00:00:00","2021-07-04T15:20:37","2021-07-04T15:20:37",46,null,4],[13036,"Deposit",100,null,"2021-07-02T00:00:00","2021-07-04T15:21:14","2021-07-04T15:21:14",237,12482,4],[13037,"Deposit",850,null,"2021-07-02T00:00:00","2021-07-04T15:21:58","2021-07-04T15:21:58",90,8681,4],[13038,"Deposit",250,null,"2021-07-02T00:00:00","2021-07-04T15:22:27","2021-07-04T15:22:27",58,13390,4],[13039,"Deposit",100,null,"2021-07-02T00:00:00","2021-07-04T15:22:52","2021-07-04T15:22:52",569,13280,4],[13040,"Deposit",100,null,"2021-07-02T00:00:00","2021-07-04T15:23:29","2021-07-04T15:23:29",113,10236,4],[13091,"Deposit",100,null,"2021-07-03T00:00:00","2021-07-04T16:12:43","2021-07-04T16:12:43",330,5706,4],[13092,"Deposit",270,null,"2021-07-03T00:00:00","2021-07-04T16:13:29","2021-07-04T16:13:29",402,11756,4],[13093,"Deposit",50,null,"2021-07-03T00:00:00","2021-07-04T16:13:59","2021-07-04T16:13:59",672,13396,4],[13094,"Deposit",100,null,"2021-07-03T00:00:00","2021-07-04T16:14:25","2021-07-04T16:14:25",254,13194,4],[13095,"Deposit",50,null,"2021-07-03T00:00:00","2021-07-04T16:14:53","2021-07-04T16:14:53",63,null,4],[13096,"Deposit",875,null,"2021-07-03T00:00:00","2021-07-04T16:15:19","2021-07-04T16:15:19",335,8448,4],[13097,"Deposit",50,null,"2021-07-03T00:00:00","2021-07-04T16:15:47","2021-07-04T16:15:47",779,13195,4],[13100,"Deposit",300,null,"2021-07-03T00:00:00","2021-07-04T16:24:28","2021-07-04T16:24:28",46,null,4],[13101,"Deposit",12077,null,"2021-06-30T00:00:00","2021-07-04T16:38:24","2021-07-04T16:38:24",549,11884,4],[13103,"Deposit",14045,null,"2021-07-03T00:00:00","2021-07-04T17:53:56","2021-07-04T17:53:57",459,3323,4],[13107,"Deposit",560,null,"2021-07-03T00:00:00","2021-07-04T23:17:58","2021-07-04T23:17:58",552,null,3],[13111,"Deposit",80,null,"2021-07-03T00:00:00","2021-07-04T23:20:57","2021-07-04T23:20:57",514,10170,3],[13124,"Deposit",5400,null,"2021-07-03T00:00:00","2021-07-04T23:30:47","2021-07-04T23:30:47",383,8026,3],[13132,"Deposit",1400,null,"2021-07-04T00:00:00","2021-07-04T23:43:49","2021-07-04T23:43:49",394,12119,3],[13203,"Deposit",1750,null,"2021-07-04T00:00:00","2021-07-05T14:02:37","2021-07-05T14:02:37",341,null,4],[13204,"Deposit",3250,null,"2021-07-04T00:00:00","2021-07-05T14:05:44","2021-07-05T14:05:44",587,10036,4],[13205,"Deposit",50,null,"2021-07-04T00:00:00","2021-07-05T14:06:13","2021-07-05T14:06:13",113,11376,4],[13206,"Deposit",50,null,"2021-07-04T00:00:00","2021-07-05T14:07:00","2021-07-05T14:07:00",464,null,4],[13210,"Deposit",600,null,"2021-07-05T00:00:00","2021-07-06T16:25:18","2021-07-06T16:25:18",341,null,4],[13271,"Deposit",50,null,"2021-07-05T00:00:00","2021-07-06T17:34:50","2021-07-06T17:34:50",27,13418,4],[13272,"Deposit",100,null,"2021-07-05T00:00:00","2021-07-06T17:35:23","2021-07-06T17:35:23",33,12738,4],[13273,"Deposit",150,null,"2021-07-05T00:00:00","2021-07-06T17:35:53","2021-07-06T17:35:53",264,13419,4],[13274,"Deposit",550,null,"2021-07-05T00:00:00","2021-07-06T17:36:20","2021-07-06T17:36:20",645,13386,4],[13275,"Deposit",50,null,"2021-07-05T00:00:00","2021-07-06T17:36:47","2021-07-06T17:36:47",338,null,4],[13276,"Deposit",50,null,"2021-07-05T00:00:00","2021-07-06T17:37:10","2021-07-06T17:37:10",740,11546,4],[13277,"Deposit",50,null,"2021-07-05T00:00:00","2021-07-06T17:37:35","2021-07-06T17:37:35",316,13439,4],[13278,"Deposit",150,null,"2021-07-05T00:00:00","2021-07-06T17:38:01","2021-07-06T17:38:01",128,12491,4],[13279,"Deposit",100,null,"2021-07-05T00:00:00","2021-07-06T17:38:27","2021-07-06T17:38:27",90,8970,4],[13280,"Deposit",50,null,"2021-07-05T00:00:00","2021-07-06T17:38:54","2021-07-06T17:38:54",762,12604,4],[13305,"Deposit",385,null,"2021-07-05T00:00:00","2021-07-06T23:06:29","2021-07-06T23:06:29",511,null,3],[13376,"Deposit",16000,null,"2021-07-06T00:00:00","2021-07-07T17:09:36","2021-07-07T17:09:36",575,null,4],[13377,"Deposit",250,null,"2021-07-06T00:00:00","2021-07-07T17:14:53","2021-07-07T17:14:53",105,13665,4],[13378,"Deposit",160,null,"2021-07-06T00:00:00","2021-07-07T17:15:21","2021-07-07T17:15:21",12,8504,4],[13379,"Deposit",1705,null,"2021-07-06T00:00:00","2021-07-07T17:15:54","2021-07-07T17:15:54",218,null,4],[13380,"Deposit",2150,null,"2021-07-06T00:00:00","2021-07-07T17:18:30","2021-07-07T17:18:30",439,12844,4],[13388,"Deposit",80,null,"2021-07-06T00:00:00","2021-07-07T20:31:19","2021-07-07T20:31:19",533,13017,3],[13398,"Deposit",40,null,"2021-07-06T00:00:00","2021-07-07T20:43:56","2021-07-07T20:43:56",629,null,3],[13418,"Deposit",40,null,"2021-07-06T00:00:00","2021-07-07T21:28:04","2021-07-07T21:28:04",500,null,3],[13420,"Deposit",120,null,"2021-07-06T00:00:00","2021-07-07T21:31:54","2021-07-07T21:31:54",603,8870,3],[13426,"Deposit",40,null,"2021-07-07T00:00:00","2021-07-07T23:58:13","2021-07-07T23:58:13",394,null,3],[13428,"Deposit",260,null,"2021-07-07T00:00:00","2021-07-08T00:01:40","2021-07-08T00:01:40",490,null,3],[13433,"Deposit",80,null,"2021-07-07T00:00:00","2021-07-08T00:08:57","2021-07-08T00:08:57",677,13738,3],[13439,"Deposit",880,null,"2021-07-07T00:00:00","2021-07-08T00:14:50","2021-07-08T00:14:50",701,11888,3],[13447,"Deposit",40,null,"2021-07-07T00:00:00","2021-07-08T00:22:36","2021-07-08T00:22:36",693,13743,3],[13510,"Deposit",5000,null,"2021-07-07T00:00:00","2021-07-08T14:24:50","2021-07-08T14:24:50",638,12742,4],[13511,"Deposit",50,null,"2021-07-07T00:00:00","2021-07-08T14:25:26","2021-07-08T14:25:26",235,3842,4],[13512,"Deposit",50,null,"2021-07-07T00:00:00","2021-07-08T14:26:01","2021-07-08T14:26:01",375,13611,4],[13513,"Deposit",50,null,"2021-07-07T00:00:00","2021-07-08T14:26:27","2021-07-08T14:26:27",163,null,4],[13514,"Deposit",100,null,"2021-07-07T00:00:00","2021-07-08T14:27:04","2021-07-08T14:27:04",614,13454,4],[13515,"Deposit",250,null,"2021-07-07T00:00:00","2021-07-08T14:27:44","2021-07-08T14:27:44",15,8552,4],[13516,"Deposit",1300,null,"2021-07-07T00:00:00","2021-07-08T14:28:54","2021-07-08T14:28:54",308,null,4],[13520,"Deposit",3100,null,"2021-07-07T00:00:00","2021-07-08T14:40:56","2021-07-08T14:40:56",782,null,4],[13522,"Deposit",260,null,"2021-07-08T00:00:00","2021-07-08T21:56:59","2021-07-08T21:56:59",500,13755,3],[13529,"Deposit",1620,null,"2021-07-08T00:00:00","2021-07-08T22:03:37","2021-07-08T22:03:37",608,13481,3],[13533,"Deposit",60,null,"2021-07-08T00:00:00","2021-07-08T22:08:44","2021-07-08T22:08:44",552,null,3],[13535,"Deposit",40,null,"2021-07-08T00:00:00","2021-07-08T22:11:38","2021-07-08T22:11:38",609,13740,3],[13539,"Deposit",40,null,"2021-07-08T00:00:00","2021-07-08T22:15:06","2021-07-08T22:15:06",701,null,3],[13616,"Deposit",10000,null,"2021-07-08T00:00:00","2021-07-09T17:33:42","2021-07-09T17:33:42",575,null,4],[13617,"Deposit",900,null,"2021-07-08T00:00:00","2021-07-09T17:34:15","2021-07-09T17:34:15",782,null,4],[13618,"Deposit",700,null,"2021-07-08T00:00:00","2021-07-09T17:35:04","2021-07-09T17:35:04",341,null,4],[13619,"Deposit",700,null,"2021-07-08T00:00:00","2021-07-09T17:35:41","2021-07-09T17:35:41",537,null,4],[13620,"Deposit",150,null,"2021-07-08T00:00:00","2021-07-09T17:36:09","2021-07-09T17:36:09",260,13127,4],[13621,"Deposit",100,null,"2021-07-08T00:00:00","2021-07-09T17:36:39","2021-07-09T17:36:39",315,13215,4],[13622,"Deposit",50,null,"2021-07-08T00:00:00","2021-07-09T17:37:17","2021-07-09T17:37:17",40,13277,4],[13623,"Deposit",4000,null,"2021-07-08T00:00:00","2021-07-09T17:37:59","2021-07-09T17:37:59",127,10214,4],[13624,"Deposit",1000,null,"2021-07-08T00:00:00","2021-07-09T17:38:26","2021-07-09T17:38:26",127,null,4],[13637,"Deposit",685,null,"2021-07-09T00:00:00","2021-07-10T13:11:46","2021-07-10T13:11:46",511,null,3],[13641,"Deposit",1400,null,"2021-07-09T00:00:00","2021-07-10T13:14:27","2021-07-10T13:14:27",394,12809,3],[13652,"Deposit",5400,null,"2021-07-09T00:00:00","2021-07-10T13:31:13","2021-07-10T13:31:13",383,null,3],[13655,"Deposit",40,null,"2021-07-09T00:00:00","2021-07-10T13:33:05","2021-07-10T13:33:05",729,null,3],[13657,"Deposit",105,null,"2021-07-09T00:00:00","2021-07-10T13:34:39","2021-07-10T13:34:39",506,null,3]]            
            for (let deposit of deposits) {
                let user = await models.User.findByPk(deposit[9]);
                await addLedgerEntry(deposit[7], {
                    type: 'Deposit',
                    credit: deposit[2],
                    debit: null,
                    date: deposit[4]
                }, user.email);
            }
            
        },
        recalibrateBillNo: async function () {
            const bills = await models.Bill.findAll({
                order: [
                    ['createdAt', 'ASC'],
                    ['id', 'ASC']
                ]
            });
            let counter = 1;
            var last_bill_no = ""
            for (let i = 0; i < bills.length; i++) {
                var np = new NepaliDate(bills[i].createdAt);
                var month = np.getMonth();
                var year = np.getYear();
                var bill_no = "";

                if (month <= 2) {
                    bill_no = (year - 1) + "/" + (year % 100) + "/";
                } else {
                    bill_no = (year) + "/" + ((year + 1) % 100) + "/";
                }
                if (last_bill_no != "") {
                    if (last_bill_no !== bill_no) {
                        counter = 1;
                    }
                }
                last_bill_no = bill_no;
                bill_no = bill_no + (counter++ + '').padStart(5, 0);
                bills[i].track_id = bill_no;
                bills[i].save();
            }
        },
        checkPermission: (req, res, message = "User does not have permission to access the page") => {
            if (req.session.user_type === 'Admin') {
                return true;
            }
            req.flash('flash_message', message);
            req.flash('flash_color', 'danger');
            res.redirect('/');
            return false;
        },
    }
}