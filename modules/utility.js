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
                        resolve({exists: false});
                    }
                    if (user.correctPassword(password)) {
                        resolve({exists: true, first_name: user.first_name});
                    } else {
                        resolve({exists: false});
                    }
                }).catch(err => {
                    console.log(err);
                    reject('DB ERROR');
                });
            });
        }
    },    
}