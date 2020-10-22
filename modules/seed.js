'use strict';

const utility = require("./utility");
const models = require("../models/Models");


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

const fs = require('fs');
const {
    District, PostOffice
} = require("../models/Models");
const {
    sequelize
} = require("./database");
var rawdata = fs.readFileSync('modules/data/first-names.json');
const first_names = JSON.parse(rawdata);

rawdata = fs.readFileSync('modules/data/surnames.json');
const last_names = JSON.parse(rawdata);

rawdata = fs.readFileSync('modules/data/fortune500.json');
const organizations = JSON.parse(rawdata);

rawdata = fs.readFileSync('modules/data/nepal_zones_district.json');
const zone_district = JSON.parse(rawdata);


rawdata = fs.readFileSync('modules/data/nepal_district_postal_code.json');
const district_postal_code = JSON.parse(rawdata);


function getFirstName() {
    var f_name = first_names[Math.floor(Math.random() * first_names.length)];
    return f_name;
}

function getLastName() {
    var l_name = last_names[Math.floor(Math.random() * last_names.length)];
    return l_name;
}

function getCompany() {
    var company = organizations.companies[Math.floor(Math.random() * organizations.companies.length)];
    return company;
}

function getPhone() {
    Math.floor(Math.random() * 10);
    let phone = '+977 9';
    for (let i = 0; i < 9; i++) {
        var digit = Math.floor(Math.random() * 10);
        phone = phone + digit;
    }
    return phone;
}

function getEmail(first_name, last_name) {
    var email = first_name.toLowerCase() + last_name.toLowerCase() + '@mail.com';
    return email;
}

async function addZones(fillAdd) {
    if (fillAdd) {
        // Get all the zones
        for (let [zone_small, district] of Object.entries(zone_district)) {
            let zone = zone_small[0].toUpperCase() + zone_small.substr(1);
            let z = await utility.misc.zones({
                value: zone
            });
            
            for (let i = 0; i < district.length; i++) {
                district[i] = district[i][0].toUpperCase() + district[i].substr(1);
                const d = await utility.misc.district({
                    value: district[i],
                    zoneId: z.id
                });

                var pcs = district_postal_code[d.value];
                if (typeof pcs === 'undefined') continue;
                var postal_codes = [

                ];
                for (let j = 0; j < pcs.length; j++) {
                    const c = pcs[j];
                    postal_codes.push({
                        name: c.city,
                        value: c.post_code,
                        districtId: d.id
                    });
                }
                await utility.misc.postal_code(postal_codes);
            }
        }
    }
}

module.exports = function (fillAdd) {
    var data = [{
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
        console.log("All Inventory Record Successfully added");

        // Create customer type
        var c_types = [];
        var c_type = await utility.customer_type.create({
            name: 'Promotion'
        });
        await utility.customer_type.addInventoryRate(c_type.id, inv.id, 0);
        c_types.push(c_type);

        c_type = await utility.customer_type.create({
            name: 'Dealer'
        });
        await utility.customer_type.addInventoryRate(c_type.id, inv.id, 10);
        c_types.push(c_type);

        c_type = await utility.customer_type.create({
            name: 'Buyer Rental'
        });
        await utility.customer_type.addInventoryRate(c_type.id, inv.id, 15);
        c_types.push(c_type);

        c_type = await utility.customer_type.create({
            name: 'Buyer Paid'
        });
        await utility.customer_type.addInventoryRate(c_type.id, inv.id, 25);
        c_types.push(c_type);
        console.log("All Customer Type and rates have been successfully added");

        addZones(fillAdd).then(() => {
            console.log("All Zones Successfully added");
            models.Zone.findAll().then(async (all_zones) => {
                for (let i = 0; i < 10; i++) {
                    let f_name = getFirstName();
                    let l_name = getLastName();
                    let org = getCompany();
                    let ph = getPhone();
                    let email = getEmail(f_name, l_name);   
                    var zone = all_zones[Math.floor(Math.random() * all_zones.length)]; 
                    var districts = await zone.getDistricts();
                    var district = districts[Math.floor(Math.random() * districts.length)]; 
                    var post_offices = await district.getPost_offices();
                    var post_office = post_offices[Math.floor(Math.random() * post_offices.length)]; 
                    var customer =  await models.Customer.create({
                        first_name: f_name,
                        last_name: l_name,
                        organization: org,
                        phone: ph,
                        email,
                        anchal: zone.id,
                        jilla: district.id,
                        address1: "Some Address",
                        postal_code: post_office.id, 
                    });
                    var c_type = c_types[Math.floor(Math.random() * c_types.length)]; 
                    customer.setCustomer_type(c_type);
                }
                console.log("All Customers Created");
            });
        });
        
        
    }).catch(err => {
        console.log(err);
    });
}