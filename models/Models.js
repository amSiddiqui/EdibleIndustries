const db = require("../modules/database");
const crypto = require('crypto');
const NepaliDate = require('nepali-date-converter');
const {
    Op
} = require('sequelize');

const Zone = db.sequelize.define("zone", {
    id: {
        type: db.Sequelize.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
    },
    value: {
        type: db.Sequelize.STRING,
        allowNull: false,
        validate: {
            notEmpty: true
        }
    },
}, {
    underscored: true
});

const District = db.sequelize.define('district', {
    id: {
        type: db.Sequelize.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
    },
    value: {
        type: db.Sequelize.STRING,
        allowNull: false,
        validate: {
            notEmpty: true
        }
    }
}, {
    underscored: true
});

const PostOffice = db.sequelize.define('post_office', {
    id: {
        type: db.Sequelize.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
    },
    value: {
        type: db.Sequelize.STRING,
        allowNull: false,
        validate: {
            notEmpty: true
        }
    },

    name: {
        type: db.Sequelize.STRING,
        allowNull: false,
        validate: {
            notEmpty: true
        }
    },
}, {
    underscored: true
});

Zone.hasMany(District);
District.belongsTo(Zone);

District.hasMany(PostOffice);
PostOffice.belongsTo(District);


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
        validate: {
            isEmail: true,
            notEmpty: true
        },
    },
    user_type: {
        type: db.Sequelize.ENUM,
        values: ['Admin', 'Accountant'],
        defaultValue: 'Admin'
    },
    password: {
        type: db.Sequelize.STRING,
        get() {
            return () => this.getDataValue('password')
        },
        validate: {
            notEmpty: true,
        }
    },
    salt: {
        type: db.Sequelize.STRING,
        get() {
            return () => this.getDataValue('salt')
        }
    },
}, {
    getterMethods: {
        fullName() {
            return this.first_name + ' ' + this.last_name;
        }
    },
    underscored: true
});

User.generateSalt = function () {
    return crypto.randomBytes(16).toString('base64')
};

User.encryptPassword = function (plainText, salt) {
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

User.prototype.correctPassword = function (enteredPassword) {
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
}, {
    underscored: true
});


const InventoryBatch = db.sequelize.define("inventory_batch", {
    id: {
        type: db.Sequelize.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
    },
    quantity: {
        type: db.Sequelize.INTEGER,
        defaultValue: 1,
    },
    name: {
        type: db.Sequelize.STRING,
        defaultValue: ''
    }
    
}, {
    underscored: true
});


const InventoryRecord = db.sequelize.define("inventory_record", {
    id: {
        type: db.Sequelize.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
    },
    type: {
        type: db.Sequelize.ENUM,
        values: ['purchased', 'manufactured', 'rented', 'returned', 'discarded', 'sold', 'transferred', 'received'],
    },
    value: {
        type: db.Sequelize.INTEGER
    },
    cost: {
        type: db.Sequelize.DOUBLE,
        defaultValue: 0
    },
    recordDate: {
        type: db.Sequelize.DATE
    },
    partnerWarehouseId: {
        type: db.Sequelize.INTEGER.UNSIGNED,
        allowNull: true
    }
}, {
    underscored: true
});

const InventoryBatchRecord = db.sequelize.define("inventory_batch_record", {
    id: {
        type: db.Sequelize.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
    },
    type: {
        type: db.Sequelize.ENUM,
        values: ['purchased', 'manufactured', 'rented', 'returned', 'discarded', 'sold', 'transferred', 'received'],
    },
    value: {
        type: db.Sequelize.INTEGER
    }
}, {
    underscored: true
});

InventoryBatch.hasMany(InventoryBatchRecord, {
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE'
});

InventoryBatchRecord.belongsTo(InventoryBatch);

InventoryRecord.hasOne(InventoryBatchRecord);
InventoryBatchRecord.belongsTo(InventoryRecord);

Inventory.hasMany(InventoryRecord, {
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE'
});


InventoryRecord.belongsTo(Inventory);

Inventory.hasMany(InventoryBatch, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
});

InventoryBatch.belongsTo(Inventory);

User.hasMany(InventoryRecord);
InventoryRecord.belongsTo(User);

const Customer = db.sequelize.define("customer", {
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
    },
    organization: {
        type: db.Sequelize.STRING,
    },
    email: {
        type: db.Sequelize.STRING,
    },
    phone: {
        type: db.Sequelize.STRING
    },
    address1: {
        type: db.Sequelize.STRING
    },
    vat_number: {
        type: db.Sequelize.STRING
    },
    anchal: {
        type: db.Sequelize.INTEGER.UNSIGNED,
        references: {
            model: Zone,
            key: 'id'
        },
    },
    jilla: {
        type: db.Sequelize.INTEGER.UNSIGNED,
        references: {
            model: District,
            key: 'id'
        },
    },
    postal_code: {
        type: db.Sequelize.INTEGER.UNSIGNED,
        references: {
            model: PostOffice,
            key: 'id'
        },
    }
}, {
    underscored: true
});

Zone.hasMany(Customer, {
    foreignKey: 'anchal'
});
Customer.belongsTo(Zone, {
    foreignKey: 'anchal'
});

District.hasMany(Customer, {
    foreignKey: 'jilla'
});
Customer.belongsTo(District, {
    foreignKey: 'jilla'
});

PostOffice.hasMany(Customer, {
    foreignKey: 'postal_code'
});
Customer.belongsTo(PostOffice, {
    foreignKey: 'postal_code'
});


const CustomerType = db.sequelize.define("customer_type", {
    id: {
        type: db.Sequelize.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: db.Sequelize.STRING,
        allowNull: false,
        validate: {
            notEmpty: true
        }
    }
}, {
    underscored: true
});

const CustomerTypeRate = db.sequelize.define("customer_type_rate", {
    id: {
        type: db.Sequelize.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
    },
    rate: {
        type: db.Sequelize.DOUBLE,
        allowNull: false,
        defaultValue: 0.0
    },
}, {
    underscored: true
});

const CustomerRate = db.sequelize.define("customer_rate", {
    id: {
        type: db.Sequelize.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
    },
    rate: {
        type: db.Sequelize.DOUBLE,
        allowNull: false,
        defaultValue: 0.0
    },
}, {
    underscored: true
});



CustomerType.hasMany(Customer);
Customer.belongsTo(CustomerType);

Customer.belongsToMany(InventoryBatch, {
    through: CustomerRate
});

InventoryBatch.belongsToMany(Customer, {
    through: CustomerRate
});

CustomerType.belongsToMany(InventoryBatch, {
    through: CustomerTypeRate
});

InventoryBatch.belongsToMany(CustomerType, {
    through: CustomerTypeRate
});


// Bill Model
const Bill = db.sequelize.define("bill", {
    id: {
        type: db.Sequelize.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
    },
    track_id: {
        type: db.Sequelize.STRING
    },
    discount: {
        type: db.Sequelize.DOUBLE,
        defaultValue: 0.0
    },
    discountPercent: {
        type: db.Sequelize.DOUBLE,
        defaultValue: 0.0
    },
    taxRate: {
        type: db.Sequelize.DOUBLE,
        defaultValue: 0.0
    },
    tax: {
        type: db.Sequelize.DOUBLE,
        defaultValue: 0.0
    },
    description: {
        type: db.Sequelize.TEXT
    },
    paid: {
        type: db.Sequelize.BOOLEAN,
        defaultValue: true
    },
    originalPaid: {
        type: db.Sequelize.BOOLEAN,
        allowNull: true,
        default: null,
    },
    dueDate: {
        type: db.Sequelize.DATE
    },
    paidOn: {
        type: db.Sequelize.DATE
    },
    payment_method: {
        type: db.Sequelize.STRING
    },
    image: {
        type: db.Sequelize.STRING,
        defaultValue: '/images/placeholder-vertical.jpg'
    },
    total: {
        type: db.Sequelize.DOUBLE,
        defaultValue: 0.0
    }
});

const BillTransaction = db.sequelize.define("bill_transaction", {
    id: {
        type: db.Sequelize.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
    },
    quantity: {
        type: db.Sequelize.DOUBLE,
        defaultValue: 0.0
    },
    rate: {
        type: db.Sequelize.DOUBLE,
        defaultValue: 0.0
    },
    type: {
        type: db.Sequelize.STRING
    }
});

Bill.hasMany(BillTransaction, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
});
BillTransaction.belongsTo(Bill);

Customer.hasMany(Bill);
Bill.belongsTo(Customer);

User.hasMany(Bill);
Bill.belongsTo(User);

InventoryRecord.hasOne(BillTransaction);
BillTransaction.belongsTo(InventoryRecord);

BillTransaction.hasMany(BillTransaction, {
    as: 'return',
    foreignKey: 'returnId',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
});

const Warehouse = db.sequelize.define('warehouse', {
    id: {
        type: db.Sequelize.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: db.Sequelize.STRING,
        allowNull: false,
        validate: {
            notEmpty: true
        }
    },
    isPrimary: {
        type: db.Sequelize.BOOLEAN,
        defaultValue: false
    },
    address1: {
        type: db.Sequelize.STRING
    },
    anchal: {
        type: db.Sequelize.INTEGER.UNSIGNED,
        references: {
            model: Zone,
            key: 'id'
        },
    },
    jilla: {
        type: db.Sequelize.INTEGER.UNSIGNED,
        references: {
            model: District,
            key: 'id'
        },
    },
    postal_code: {
        type: db.Sequelize.INTEGER.UNSIGNED,
        references: {
            model: PostOffice,
            key: 'id'
        },
    }
});

Zone.hasMany(Warehouse, {
    foreignKey: 'anchal'
});
Warehouse.belongsTo(Zone, {
    foreignKey: 'anchal'
});

District.hasMany(Warehouse, {
    foreignKey: 'jilla'
});
Warehouse.belongsTo(District, {
    foreignKey: 'jilla'
});

PostOffice.hasMany(Warehouse, {
    foreignKey: 'postal_code'
});
Warehouse.belongsTo(PostOffice, {
    foreignKey: 'postal_code'
});

Warehouse.hasMany(InventoryRecord);
InventoryRecord.belongsTo(Warehouse);

Warehouse.hasMany(Bill);
Bill.belongsTo(Warehouse);

Warehouse.hasMany(User);
User.belongsTo(Warehouse);

const CustomerLedger = db.sequelize.define('customer_ledger', {
    id: {
        type: db.Sequelize.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
    },
    type: {
        type: db.Sequelize.ENUM,
        values: ['Sale', 'Deposit']
    },
    credit: {
        type: db.Sequelize.DOUBLE,
        allowNull: true
    },
    debit: {
        type: db.Sequelize.DOUBLE,
    },
    date: {
        type: db.Sequelize.DATE
    }
});

Customer.hasMany(CustomerLedger);
CustomerLedger.belongsTo(Customer);

CustomerLedger.hasOne(Bill, {
    as: 'sale',
    foreignKey: 'saleId',
    onDelete: 'SET NULL',
    onUpdate: 'SET NULL'
});

CustomerLedger.hasMany(Bill, {
    as: 'deposit',
    foreignKey: 'depositId',
    onDelete: 'SET NULL',
    onUpdate: 'SET NULL'
});

User.hasMany(CustomerLedger);
CustomerLedger.belongsTo(User);

module.exports = {
    User,
    Inventory,
    InventoryRecord,
    InventoryBatch,
    InventoryBatchRecord,
    Customer,
    CustomerType,
    CustomerTypeRate,
    CustomerRate,
    Zone,
    District,
    PostOffice,
    Bill,
    BillTransaction,
    Warehouse,
    CustomerLedger,
};