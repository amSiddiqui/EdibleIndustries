const {
    Inventory,
    InventoryRecord
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
        getInventory: async (id) => {
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
    }
}