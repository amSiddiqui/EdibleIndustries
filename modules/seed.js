'use strict';

const utility = require("./utility");
const models = require("../models/Models");
const fs = require('fs');


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

module.exports = function (fillAdd, fullSync) {

    utility.warehouse.addWarehouse('Factory', {
        address1: '',
        zone: '',
        post_office: ''
    }, true).then(() => {
        var data = [{
            id: 1,
            first_name: 'Aamir',
            last_name: 'Mushtaq Siddiqui',
            email: 'gt_ams@yahoo.in',
            password: 'Edible1077',
            warehouse: 1,
        }, {
            id: 2,
            first_name: 'Bhim',
            last_name: 'Singh Khatri',
            email: 'bhimsinghkhatri9@gmail.com',
            password: 'WaterPlant9876',
            warehouse: 1,
        }]
    
        data.forEach(d => {
            utility.user.createUser(d).then(u => {
                console.log("User Successfully created with id: ", u);
            }).catch(err => {
                console.log("Error Creating User:", err);
            });
        });
    });



    if (fullSync) {
        utility.inventory.createInventory({
            type: 'purchased',
            name: 'Jar 20L',
            cost: '100',
            description: '20 ltr Jar'
        }).then(async inv => {
            var r = await utility.misc.insertInventoryRecord({
                type: 'purchased',
                value: 100,
                userId: 1,
                inventoryId: inv.id
            }, inv.id);
    
            await utility.misc.insertInventoryRecord({
                type: 'sold',
                value: 10,
                userId: 1,
                inventoryId: inv.id
            }, inv.id);
            await utility.misc.insertInventoryRecord({
                type: 'discarded',
                value: 2,
                userId: 1,
                inventoryId: inv.id
            }, inv.id);
            await utility.misc.insertInventoryRecord({
                type: 'rented',
                value: 20,
                userId: 1,
                inventoryId: inv.id
            }, inv.id);
            await utility.misc.insertInventoryRecord({
                type: 'rented',
                value: 8,
                userId: 1,
                inventoryId: inv.id
            }, inv.id);
            await utility.misc.insertInventoryRecord({
                type: 'returned',
                value: 8,
                userId: 1,
                inventoryId: inv.id
            }, inv.id);
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
                        await customer.setCustomer_type(c_type);
                        await customer.save();
                        await utility.customer.addInventoryRate(customer.id, inv.id, Math.floor(Math.random() * 20) + 1);
                    }
                    console.log("All Customers Created");
                    const inven = await models.Inventory.findByPk(1);
                    // Start Creating 20 records
                    for (let i = 0; i < 20; i++) {
                        var customer_id = Math.floor(Math.random() * 10) + 1;
                        var user_id = 1;
                        const customer = await models.Customer.findByPk(customer_id);
                        const user = await models.User.findByPk(user_id);
                        let record = await models.Bill.create({
                            discount: 0,
                            taxRate: 0,
                            tax: 0,
                            description: 'Some Description',
                            paid: true,
                            payment_method: 'Cash',
                            total: ((Math.random() * 50) + 1).toFixed(2),
                            paidOn: new Date()
                        });
                        record.setCustomer(customer);
                        record.setUser(user);
    
                        // 3 Inventory Items sold
                        const last_record_id = await models.InventoryRecord.max('id');
                        if (last_record_id == null) {
                            await record.destroy();
                            console.log("No inventory Items");
                            continue;
                        }
                        const last_record = await models.InventoryRecord.findByPk(last_record_id);
                        if (last_record.in_stock < 3){
                            await record.destroy();
                            console.log('No inventory items');
                            continue;
                        }
                        const record_trans = await utility.misc.insertInventoryRecord({
                            type: 'sold',
                            value: 3,
                        }, inv.id);
    
                        record_trans.setInventory(inven);
                        record_trans.setUser(user);
                        
                        var customer_rate = await customer.getInventories();
                        var rate = 0;
                        if (customer_rate.length > 0) {
                            rate = customer_rate[0].customer_rate.rate;
                        }else{
                            var customer_type = await customer.getCustomer_type();
                            var inventories_types = await customer_type.getInventories();
                            if (inventories_types.length > 0) {
                                rate = inventories_types[0].customer_type_rate.rate;
                            }else{
                                rate = Math.floor(Math.random() * 15) + 5;
                            }
                        }
                        const trans = await models.BillTransaction.create({
                            quantity: 3,
                            rate,
                            type: 'sold'     
                        });
                        await trans.setBill(record);
                        await trans.setInventory_record(record_trans);
                        await record.save();
                        await trans.save();
                    }
                    console.log("All transactions completed");
                });
            });
            
            
        }).catch(err => {
            console.log(err);
        });
    }else{
        addZones(fillAdd).then(function() {
            console.log("All zones added");
        }).catch(function(err) {
            console.log("Error While adding zones");
            console.log(err);
        });
    }
}