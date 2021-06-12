const fs = require("fs");
const Sequelize = require("sequelize"),
  sequelize = new Sequelize(
    process.env.DBNAME,
    process.env.DBUSER,
    process.env.DBPASS,
    {
      host: process.env.DBHOST,
      dialect: "mysql",
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
      timezone: '+05:45',
      dialectOptions: {
        dateStrings: true,
        typeCast: function (field, next) { // for reading from database
            if (field.type === 'DATETIME') {
                return new Date(field.string())
            }
            return next()
        },
      },
      //  logging: msg => {
      //     fs.appendFile('logs/sequelize_query.log', new Date().toDateString()+'\n'+msg+'\n\n', err => {
      //         if (err) {
      //             console.log("Logging sequelize query failed");
      //             console.log(err);
      //         }
      //     });
      //  },
      logging: false,
    }
  );

module.exports = {
  sequelize: sequelize,
  Sequelize: Sequelize,
};
