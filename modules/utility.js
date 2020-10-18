const models = require('../models/Models');


module.exports = {
    user: {
        createUser: (data) => {
            return models.User.create({...data});
        },
        userExists: (email, password) => {
            return new Promise((resolve, reject) => {
                models.User.findOne({where: {email: email}}).then(function(user) {
                    if (user == null) {
                        resolve(null);
                    }
                    if (user.correctPassword(password)) {
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                }).catch(err => {
                    console.log(err);
                    reject('DB ERROR');
                });
            });
        }
    },    
}