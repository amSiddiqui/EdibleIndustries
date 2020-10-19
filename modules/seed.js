const utility = require("./utility");

function getMethods(obj) {
    var result = [];
    for (var id in obj) {
        try {
            if (typeof (obj[id]) == "function") {
                result.push(id + ": " + obj[id].toString());
            }
        } catch (err) {
            result.push(id + ": inaccessible");
        }
    }
    return result;
}

module.exports = function () {
    data = [{
        first_name: 'Aamir',
        last_name: 'Siddiqui',
        email: 'gt_ams@yahoo.in',
        password: 'password',
    }]

    data.forEach(d => {
        utility.user.createUser(d).then(u => {
            console.log("User Successfully created with id: ", u.id);
        }).catch(err => {
            console.log("Error Creating User:", err);
        });
    });

    utility.inventory.createInventory({
        type: 'purchased',
        name: 'Jar 20L',
        cost: '100',
        description: '20 ltr Jar'
    }).then(async inv => {
        
        await inv.createInventory_record({
            type: 'purchased',
            value: 100
        });
        await inv.createInventory_record({
            type: 'sold',
            value: 10
        });
        await inv.createInventory_record({
            type: 'discarded',
            value: 2
        });
        await inv.createInventory_record({
            type: 'rented',
            value: 20
        });
        await inv.createInventory_record({
            type: 'rented',
            value: 8
        });
        await inv.createInventory_record({
            type: 'returned',
            value: 8
        });
        await inv.save();
        console.log("All Record Successfully added");
    });

}