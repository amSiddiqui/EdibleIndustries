const db = require("../modules/database");
const crypto = require('crypto');

const User = db.sequelize.define("user", {
    id: {
        type: db.Sequelize.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
    },
    first_name: {
        type: db.Sequelize.STRING,
        allowNull: false,
        validate: {
            notEmpty: true
        }
    }, 
    last_name: {
        type: db.Sequelize.STRING,
        allowNull: true
    },
    email: {
        type: db.Sequelize.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true,
            notEmpty: true
        },
    },
    password: {
        type: db.Sequelize.STRING,
        get() {
            return () => this.getDataValue('password')
        },
        validate: {
            len: [6,20],
            notEmpty: true,
        }
    },
    salt: {
        type: db.Sequelize.STRING,
        get() {
            return() => this.getDataValue('salt')
        }
    },
}, {
    getterMethods: {
        fullName() {
            return this.first_name+' '+this.last_name;
        }
    }
});

User.generateSalt = function() {
    return crypto.randomBytes(16).toString('base64')
};

User.encryptPassword = function(plainText, salt) {
    return crypto
        .createHash('RSA-SHA256')
        .update(plainText)
        .update(salt)
        .digest('hex')
};

const setSaltAndPassword = user => {
    if (user.changed('password')) {
        user.salt = User.generateSalt()
        user.password = User.encryptPassword(user.password(), user.salt())
    }
};

User.beforeCreate(setSaltAndPassword);
User.beforeUpdate(setSaltAndPassword);

User.prototype.correctPassword = function(enteredPassword) {
    return User.encryptPassword(enteredPassword, this.salt()) === this.password()
};


const Inventory = db.sequelize.define("inventory", {
    id: {
        type: db.Sequelize.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
    },
    type: {
        type: db.Sequelize.ENUM,
        values: ['purchased', 'manufactured'],
        defaultValue: 'purchased'
    },
    name: {
        type: db.Sequelize.STRING,
        allowNull: false,
        validate: {
            notEmpty: true
        }
    },
    image: {
        type: db.Sequelize.STRING,
        defaultValue: '/images/warehouse.svg'
    },
    cost: {
        type: db.Sequelize.DOUBLE
    },
    description: {
        type: db.Sequelize.TEXT
    }
});

const InventoryRecord = db.sequelize.define("inventory_record", {
    id: {
        type: db.Sequelize.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
    },
    type: {
        type: db.Sequelize.ENUM,
        values: ['purchased', 'manufactured', 'rented', 'returned', 'discarded', 'sold'],
    },
    value: {
        type: db.Sequelize.INTEGER
    },
    in_stock: {
        type: db.Sequelize.INTEGER
    },
    total: {
        type: db.Sequelize.INTEGER
    }
});

InventoryRecord.beforeCreate(async (rec, options) => {
    var id = await InventoryRecord.max('id');
    if (isNaN(id)) {
        rec.in_stock = rec.value;
        rec.total = rec.value;
    }else{
        var lastRec = await InventoryRecord.findByPk(id);
        if (lastRec == null) {
            rec.in_stock = rec.value;
            rec.total = rec.value;
        }else{
            if (rec.type == 'purchased' || rec.type == 'manufactured' || rec.type == 'returned') {
                rec.in_stock = lastRec.in_stock + rec.value;
            }
            else if (rec.type == 'rented' || rec.type == 'discarded' || rec.type == 'sold') {
                rec.in_stock = lastRec.in_stock - rec.value;
            }
            if (rec.type == 'purchased' || rec.type == 'manufactured') {
                rec.total = lastRec.total + rec.value;
            }
            else if (rec.type == 'discarded' || rec.type == 'sold') {
                rec.total = lastRec.total - rec.value;
            }
            else if (rec.type == 'rented' || rec.type == 'returned') {
                rec.total = lastRec.total;
            }
        }
    }
});

Inventory.hasMany(InventoryRecord, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
});

InventoryRecord.belongsTo(Inventory);

module.exports = {User, Inventory, InventoryRecord};