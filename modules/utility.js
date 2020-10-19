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