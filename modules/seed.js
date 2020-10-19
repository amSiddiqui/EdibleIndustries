const utility = require("./utility");

module.exports = function () {
    data = [
        {
            first_name: 'Aamir',
            last_name: 'Siddiqui',
            email: 'gt_ams@yahoo.in',
            password: 'password',
        }
    ]

    data.forEach(d => {
        utility.user.createUser(d).then(u => {
            console.log("User Successfully created with id: ", u.id);                    
        }).catch(err => {
            console.log("Error Creating User:", err);
        });
    });

}