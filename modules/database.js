const Sequelize = require('sequelize'),
    sequelize = new Sequelize(process.env.DBNAME, process.env.DBUSER, process.env.DBPASS, {
        host: process.env.DBHOST,
        dialect: 'mysql',
         pool: {
             max: 5,
             min: 0,
             acquire: 30000,
             idle: 10000
         },
         timezone: '+05:30',
         logging: false
    });

module.exports = {
    sequelize: sequelize,
    Sequelize: Sequelize,
};