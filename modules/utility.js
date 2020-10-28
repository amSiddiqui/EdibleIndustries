const {
    Inventory,
    InventoryRecord,
    CustomerTypeRate
} = require('../models/Models');
const models = require('../models/Models');
const NepaliDate = require('nepali-date-converter');
const { Op } = require('sequelize');
const { sequelize } = require('./database');

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
                include: [
                    {
                        model: models.InventoryRecord,
                        order: [[sequelize.col('id'), 'DESC']]
                    }
                ]
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
                    include: InventoryRecord,
                    order: [
                        [InventoryRecord, 'id', 'DESC']
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
                include: [
                    {
                        model: models.InventoryRecord,
                        order: [[sequelize.col('id'), 'DESC']],
                        limit: 1
                    }
                ]
            });
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
                if (rate.rate.length > 0 && !isNaN(rate.rate)) {
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
                    existingRate.rate = rate.rate;
                    await existingRate.save();
                } else {
                    await models.CustomerTypeRate.create({
                        inventoryId: rate.id,
                        customerTypeId: customer_type.id,
                        rate: rate.rate
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
                include: Inventory
            });
        },
        fetchCustomerType: (id) => {
            return models.CustomerType.findByPk(id, {
                include: Inventory
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
            if (!isNaN(addressData.zone)) {
                var zone = await models.Zone.findByPk(addressData.zone);
                customer.setZone(zone);
            }
            if (!isNaN(addressData.district)) {
                var district = await models.District.findByPk(addressData.district);
                customer.setDistrict(district);
            }
            if (!isNaN(addressData.post_office)) {
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
            if (!isNaN(addressData.zone)) {
                var zone = await models.Zone.findByPk(addressData.zone);
                customer.setZone(zone);
            }
            if (!isNaN(addressData.district)) {
                var district = await models.District.findByPk(addressData.district);
                customer.setDistrict(district);
            }
            if (!isNaN(addressData.post_office)) {
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
        createFull: async (customer_id, data, transactions) => {
            var customer = await models.Customer.findByPk(customer_id);
            var grand_total = 0;
            transactions.forEach(transaction => {
                for (let i = 0; i < transaction.rate.length; i++) {
                    grand_total +=  parseFloat(transaction.rate[i]) * parseFloat(transaction.quantity[i]); 
                }
            });
            var cost = grand_total - parseFloat(data.discount_value) + parseFloat(data.tax_value);
            var bill = await models.Bill.create({
                discount: data.discount_value,
                discountPercent: data.discount_percent,
                taxRate: data.tax_percent,
                tax: data.tax_value,
                description: data.description,
                paid: data.paid,
                payment_method: data.payment_method,
                image: data.image_loc,
                total: cost
            });
            for (let i = 0; i < transactions.length; i++) {
                const transaction = transactions[i];
                const inventory = models.Inventory.findByPk(transaction.id);
                for (let j = 0; j < transaction.rate.length; j++) {
                    var type = 'sold';
                    if (transaction.type[j] == 'Rented') type = 'rented';
                    const inv_record = await models.InventoryRecord.create({
                        type,
                        value: transaction.quantity[j]
                    });
                    inv_record.setInventory(inventory);
                    await inv_record.save();
                    const bill_transac = await models.BillTransaction.create({
                        quantity: transaction.quantity[j],
                        rate: transaction.rate[j] 
                    });
                    bill_transac.setInventory_record(inv_record);
                    bill_transac.setBill(bill);
                    await bill_transac.save();
                }
            }
            bill.setCustomer(customer);
            var user = await models.User.findOne({
                where: {
                    email: req.session.email
                }
            });
            if (user != null) {
                bill.setUser(user);
            }
            await bill.save();
            return bill.id;
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
        }
    }
}