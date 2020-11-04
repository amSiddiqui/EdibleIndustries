const models = require('../models/Models');
const NepaliDate = require('nepali-date-converter');
var _ = require('lodash');

const {
    Op
} = require('sequelize');
const {
    sequelize
} = require('./database');


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

async function insertInventoryRecord (rec, inv_id){
    var inventory = await models.Inventory.findByPk(inv_id);
    var inventory_records = await inventory.getInventory_records({
        order: [
            ['id', 'DESC']
        ],
        limit: 1
    });
    if (inventory_records.length == 0) {
        rec.in_stock = rec.value;
        rec.total = rec.value;
    }
    else{
        var lastRec = inventory_records[0];
        if (rec.type == 'purchased' || rec.type == 'manufactured' || rec.type == 'returned') {
            rec.in_stock = lastRec.in_stock + rec.value;
        } else if (rec.type == 'rented' || rec.type == 'discarded' || rec.type == 'sold') {
            rec.in_stock = lastRec.in_stock - rec.value;
        }
        if (rec.type == 'purchased' || rec.type == 'manufactured') {
            rec.total = lastRec.total + rec.value;
        } else if (rec.type == 'discarded' || rec.type == 'sold') {
            rec.total = lastRec.total - rec.value;
        } else if (rec.type == 'rented' || rec.type == 'returned') {
            rec.total = lastRec.total;
        }
    }
    return models.InventoryRecord.create(rec);
}


module.exports = {
    user: {
        createUser: (data) => {
            return models.User.create({
                ...data
            });
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
                            first_name: user.first_name
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
        createInventory: (data) => {
            return models.Inventory.create({
                ...data
            });
        },
        fetchInventory: async (id) => {
            var inv = await models.Inventory.findOne({
                where: {
                    id
                },
                include: [{
                    model: models.InventoryRecord,
                    order: [
                        [sequelize.col('id'), 'DESC']
                    ],
                    include: [
                        {
                            model: models.User
                        }
                    ]
                }]
            });
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
        fetchAllInventory: () => {
            return new Promise((resolve, reject) => {
                models.Inventory.findAll({
                    include: models.InventoryRecord,
                    order: [
                        [models.InventoryRecord, 'id', 'DESC']
                    ]
                }).then(inventories => {
                    resolve(inventories);
                }).catch(err => {
                    console.log(err);
                    reject("DB ERROR");
                });
            });
        },
        fetchAllInventoryID: () => {
            return models.Inventory.findAll();
        },
        fetchAllInventoryIdWithRecord: () => {
            return models.Inventory.findAll({
                include: [{
                    model: models.InventoryRecord,
                    order: [
                        [sequelize.col('id'), 'DESC']
                    ],
                    limit: 1
                }]
            });
        },
        addRecord: async (id, data, user_email) => {
            var user = await models.User.findOne({
                where: {
                    email: user_email
                }
            });
            
            data.value = toNumber(data.value);
            var inventory = await models.Inventory.findByPk(id);
            var inventory_record = await insertInventoryRecord({
                type: data.type,
                value: data.value
            }, id);
            inventory_record.setInventory(inventory);
            inventory_record.setUser(user);
            await inventory_record.save();
        },
        fetchBills: async(id) => {
            var bills = await models.Bill.findAll({
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
                ]
            });
            var inv_bills = [];
            for(let i = 0; i < bills.length; i++) {
                const bill = bills[i];
                const transactions = bill.bill_transactions;
                for (let j = 0; j < transactions.length; j++) {
                    const tr = transactions[j];
                    if (tr.inventory_record.inventory.id == id) {
                        inv_bills.push(bill);
                        break;
                    }
                }
            }
            return inv_bills;
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
                if (rate.rate.trim().length > 0 && !isNaN(rate.rate)) {
                    rates_data.push({
                        inventoryId: rate.id,
                        customerTypeId: customer_type.id,
                        rate: parseFloat(rate.rate)
                    });
                }
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
                        inventoryId: rate.id,
                        customerTypeId: customer_type.id
                    }
                });
                if (existingRate != null) {
                    existingRate.rate = toNumberFloat(rate.rate);
                    await existingRate.save();
                } else {
                    await models.CustomerTypeRate.create({
                        inventoryId: rate.id,
                        customerTypeId: customer_type.id,
                        rate: toNumberFloat(rate.rate)
                    });
                }
            }
            await customer_type.save();
        },
        addInventoryRate: (customer_type_id, inventory_id, rate) => {
            return models.CustomerTypeRate.create({
                inventoryId: inventory_id,
                customerTypeId: customer_type_id,
                rate
            });

        },
        fetchAllTypes: () => {
            return models.CustomerType.findAll({
                include: models.Inventory
            });
        },
        fetchCustomerType: (id) => {
            return models.CustomerType.findByPk(id, {
                include: models.Inventory
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
            if ( addressData.zone.trim().length > 0 && !isNaN(addressData.district)) {
                var district = await models.District.findByPk(addressData.district);
                customer.setDistrict(district);
            }
            if (addressData.post_office.trim().length > 0 &&  !isNaN(addressData.post_office)) {
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
                        model: models.Inventory
                    }
                ]
            });
        },
        fetchBills: async (id) => {
            var customer = await models.Customer.findByPk(id);
            return customer.getBills({
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
                    }
                ]
            });
        }
    },
    billing: {
        fetchAll: () => {
            return models.Bill.findAll({
                include: [{
                        model: models.BillTransaction
                    },
                    {
                        model: models.Customer,
                        include: models.CustomerType
                    }
                ],
                order: [
                    ['id', 'DESC']
                ]
            });
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
                                    model: models.Inventory
                                }
                            ]
                        },
                        {
                            model: models.BillTransaction,
                            as: 'return'
                        }
                    ]
                    },
                    {
                        model: models.Customer,
                        include: 
                        [{
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
                        }]
                    },
                    {
                        model: models.User
                    }
                ]
            });
        },
        getBillNo: async () => {
            var nepali_today = new NepaliDate(new Date());
            var rec_id = nepali_today.format('YYYY') + nepali_today.format('MM');
            var month_id = 1;
            var last_month = await models.Bill.findOne({
                where: {
                    track_id: {
                        [Op.like]: rec_id + '%'
                    }
                },
                order: [
                    ['id', 'DESC']
                ]
            });
            if (last_month == null) {
                month_id = (month_id + '').padStart(4, '0');
                rec_id = rec_id + month_id;
            } else {
                var last_id = parseInt(last_month.track_id.substring(6));
                last_id++;
                last_id = (last_id + '').padStart(4, '0');
                rec_id = rec_id + last_id;
            }
            return rec_id;
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
            if (data.dd == null) {
                bill = await models.Bill.create({
                    discount: data.discount_value,
                    discountPercent: data.discount_percent,
                    taxRate: data.tax_percent,
                    tax: data.tax_value,
                    description: data.description,
                    paid: data.paid,
                    paidOn: data.paid ? new Date() : null,
                    payment_method: data.payment_method,
                    image: data.image_loc,
                    total: cost + ''
                });
            }else{
                bill = await models.Bill.create({
                    discount: data.discount_value,
                    discountPercent: data.discount_percent,
                    taxRate: data.tax_percent,
                    tax: data.tax_value,
                    description: data.description,
                    paid: data.paid,
                    paidOn: data.paid? new Date : null,
                    payment_method: data.payment_method,
                    image: data.image_loc,
                    total: cost + '',
                    dueDate: data.dd
                });
            }
            for (let i = 0; i < transactions.length; i++) {
                const transaction = transactions[i];
                const inventory = await models.Inventory.findByPk(transaction.id);
                for (let j = 0; j < transaction.rate.length; j++) {
                    var type = 'sold';
                    if (transaction.type[j] == 'rented') type = 'rented';
                    const inv_record = await models.InventoryRecord.create({
                        type,
                        value: transaction.quantity[j]
                    });
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
        areItemsRented: async (id) => {
            const bill = await models.Bill.findByPk(id, {
                include: [
                    {
                        model: models.BillTransaction
                    }
                ]
            });
            var rented = false;
            for(let i = 0; i < bill.bill_transactions.length; i++) {
                const tr = bill.bill_transactions[i];
                if (tr.type == 'rented') {
                    const returns = await tr.getReturn();
                    var total_return =  _.sumBy(returns, (o) => o.quantity);
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
                include: [
                    {
                        model: models.BillTransaction
                    }
                ]
            });
            var rented = false;
            for(let i = 0; i < bill.bill_transactions.length; i++) {
                const tr = bill.bill_transactions[i];
                if (tr.type == 'rented') {
                    rented = true;
                }
            }
            return rented;
        },
        addReturn: async (tr_id, inv_id, q, bill_id) => {
            q = toNumber(q);
            const inv = await models.Inventory.findByPk(inv_id);
            const inv_record =  await insertInventoryRecord({
                type: 'returned',
                value: q
            }, inv_id);
            const tr = await models.BillTransaction.findByPk(tr_id);
            const bill_transac = await models.BillTransaction.create({
                quantity: q,
                type: 'returned'
            });
            const bill = await models.Bill.findByPk(bill_id);
            bill_transac.setInventory_record(inv_record);
            tr.addReturn(bill_transac);
            bill_transac.setBill(bill);
            await bill_transac.save();
            await tr.save();
        },
        pay: async (id) => {
            const bill = await models.Bill.findByPk(id);
            bill.paid = true;
            bill.paidOn = new Date();
            await bill.save();
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
        toNumberFloat: toNumberFloat,
        toNumber: toNumber,
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
            };
            var engDate = '';
            for (let i = 0; i < date.length; i++) {
                const d = date[i];
                if (d == '/') {
                    engDate += '/'
                }else{
                    engDate += numbers[d];
                }
            }
            return engDate;
        },
        insertInventoryRecord: insertInventoryRecord,
    }
}