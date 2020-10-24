const {
    Inventory,
    InventoryRecord,
    CustomerTypeRate
} = require('../models/Models');
const models = require('../models/Models');


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
                include: InventoryRecord,
                order: [
                    [InventoryRecord, 'createdAt', 'DESC'],
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
                console.log(rate);
                if (rate.rate.length > 0 && !isNaN(rate.rate)) {
                    rates_data.push({
                        inventoryId: rate.id,
                        customerTypeId: customer_type.id,
                        rate: parseFloat(rate.rate)
                    });
                }
            });
            var temp = await models.CustomerTypeRate.bulkCreate(rates_data);
            console.log(temp);
            return true;
        },
        editWithRates: async (id, data) => {
            var customer_type = await models.CustomerType.findByPk(id);
            customer_type.name = data.name;
            data.rates.forEach(rate => {
                models.CustomerTypeRate.findOne({
                    where: {
                        inventoryId: rate.id,
                        customerTypeId: customer_type.id
                    }
                }).then(customer_type_rate => {
                    customer_type_rate.rate = rate.rate;
                    customer_type_rate.save();
                });
            });
            customer_type.save();
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
        addInventoryRate: (cutomer_id, inventory_id, rate) => {
            return models.CustomerRate.create({
                inventoryId: inventory_id,
                cutomerId: cutomer_id,
                rate
            });
        },
        fetchAllCustomer: () => {
            return models.Customer.findAll({
                include: [
                    {
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