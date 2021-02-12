$(function () {
    function updateTotal() {
        var total = 0;
        $(".total").each(function () {
            var t = $(this).html();
            var tt = t.split(' ');
            tt = tt[tt.length - 1];
            tt = isNaN(tt) ? 0 : parseFloat(tt);
            total = total + tt;
        });
        $("#sum-total").html('Re. ' + total.toFixed(2));
        var dis_percent = $("#discount-percent input").val();
        if (isNaN(dis_percent)) dis_percent = 0;
        else dis_percent = parseFloat(dis_percent);
        var disc = total * dis_percent / 100;
        $("#discount-value input").val(disc.toFixed(2));
        var remaining = total - disc;
        $("#discount-total").html('Re. ' + remaining.toFixed(2));
        var tax_p = $("#tax-percent input").val();
        if (isNaN(tax_p)) tax_p = 0;
        else tax_p = parseFloat(tax_p);
        var tax = remaining * tax_p / 100;
        $("#tax-value input").val(tax.toFixed(2));
        var grand = remaining + tax;
        $("#grand-total").html('Re. ' + grand.toFixed(2));
    }

    $("#discount-percent input").on('change', function () {
        var val = $(this).val();
        if (val < 0) {
            $(this).val(0);
            val = 0;
        }
        if (val > 100) {
            $(this).val(100);
            val = 100;
        }

        var st = $("#sum-total").html();
        var temp = st.split(' ');
        temp = temp[temp.length - 1];
        var sum_total = parseFloat(temp);
        var discount = sum_total * val / 100;
        var remaining = sum_total - discount;
        $("#discount-value input").val(discount.toFixed(2));
        $("#discount-total").html('Re. ' + remaining.toFixed(2));

        var tax_rate = $("#tax-percent input").val();
        var tax = remaining * tax_rate / 100;
        $("#tax-value input").val(tax.toFixed(2));
        var grand = remaining + tax;
        $("#grand-total").html('Re. ' + grand.toFixed(2));
    });

    $("#discount-value input").on('change', function () {
        var val = $(this).val();
        var sum_total = $("#sum-total").html();
        var temp = sum_total.split(' ');
        temp = temp[temp.length - 1];
        sum_total = parseFloat(temp);
        if (val < 0) {
            $(this).val(0);
            val = 0;
        }
        if (val > sum_total) {
            $(this).val(sum_total.toFixed(2));
            val = sum_total;
        }
        var disc_percent = (val / sum_total) * 100;
        $("#discount-percent input").val(disc_percent.toFixed(2));
        var remaining = sum_total - val;
        $('#discount-total').html('Re. ' + remaining.toFixed(2));
        var tax_rate = $("#tax-percent input").val();
        var tax = remaining * tax_rate / 100;
        $("#tax-value input").val(tax.toFixed(2));
        var grand = remaining + tax;
        $("#grand-total").html('Re. ' + grand.toFixed(2));
    });

    $("#tax-percent input").on('change', function () {
        var val = $(this).val();
        if (val < 0) {
            $(this).val(0);
            val = 0;
        }
        if (val > 100) {
            $(this).val(100);
            val = 100;
        }

        var st = $("#discount-total").html();
        var temp = st.split(' ');
        temp = temp[temp.length - 1];
        var d_total = parseFloat(temp);
        var tax = d_total * val / 100;
        $("#tax-value input").val(tax.toFixed(2));
        var grand = d_total + tax;
        $("#grand-total").html('Re. ' + grand.toFixed(2));
    });

    $("#tax-value input").on('change', function () {
        var val = $(this).val();
        if (isNaN(val)) val = 0;
        else val = parseFloat(val);
        var sum_total = $("#discount-total").html();
        var temp = sum_total.split(' ');
        temp = temp[temp.length - 1];
        var discount_total = parseFloat(temp);
        var tax_rate = (val / discount_total) * 100;

        $("#tax-percent input").val(tax_rate.toFixed(2));
        var grand = discount_total + val;
        $("#grand-total").html('Re. ' + grand.toFixed(2));
    });

    $("#customer").select2();


    var inventories = null;
    $.get('/api/inventories', function (data) {
        inventories = data.inventories;
    }).fail(function (err) {
        console.log(err);
        window.history.back();
    });


    var currentCustomerData = null;
    $("#customer").on('change', function (e) {

        $("#customer").removeClass('is-danger');
        $("#customer").siblings('.help').hide();
        var id = $(this).val();
        if (isNaN(id)) {
            return;
        }

        
        $.get('/api/customer/rented/'+id, function(data) {
            if (data.status == 'success') {
                $("#total-jars-rented").find('strong').html(data.rented);
                $("#total-jars-rented").show();
            }
        }).fail(function(err) {
            console.log(err);
        });


        $.get('/api/customer/' + id, function (data) {
            currentCustomerData = data;
            $("#inventory-table-body tr").each(function (i) {
                // Batch ID
                var inv_id = $(this).find('.inv_id').html();

                var inv_rate = 0;
                var found = false;
                currentCustomerData.customer.inventory_batches.forEach(batch => {
                    if (batch.id == inv_id) {
                        inv_rate = batch.cutomer_rate.rate;
                        found = true;
                    }
                });
                // If customer rate is not found find its default rate
                if (!found) {
                    let current_customer_type = null;
                    currentCustomerData.customer_type.forEach(ty => {
                        if (ty.id == currentCustomerData.customer.customer_type.id) {
                            current_customer_type = ty;
                        }
                    });

                    current_customer_type.inventory_batches.forEach(b => {
                        if (b.id == inv_id) {
                            inv_rate = b.customer_type_rate.rate;
                        }
                    });
                }
                var quant = $(this).find('.total-quantity').val();
                quant = isNaN(quant) ? 0 : parseFloat(quant);
                var total = quant * inv_rate;
                $(this).find('.total').html('Re. ' + total.toFixed(2));
                $(this).find('.rate').val(inv_rate.toFixed(2));
            });
            updateTotal();
        }).fail(function (err) {
            console.log(err);
        });
    });

    $("#add-inventory-item-button").on('click', function () {
        if (currentCustomerData === null || inventories === null) {
            warn("Please select a customer");
            return;
        }
        $("#select-inventory-item-modal").addClass('is-active');
    });

    var list_group_item_event = function() {
        $("#select-inventory-item-modal").removeClass('is-active');
        if (currentCustomerData === null) {
            warn("Please select a customer");
            return;
        }
        var template = $("#inventory-item-template").html();
        var inventory_key = $(this).attr('data-value');
        console.log("Inventory Key: ", inventory_key);
        var row = $(template).clone();
        var inventory_rate = 0;
        var inventory = null;
        for (let i = 0; i < inventories.length; i++) {
            const temp = inventories[i];
            if (temp.id == inventory_key) inventory = temp;
        }
        if (inventory === null) {
            warn("Inventory not found");
            return;
        }
        


        var in_stock = inventory.in_stock;
        
        var defaultBatch = null;
        for (let i = 0; i < inventory.inventory_batches.length; i++) {
            const batch = inventory.inventory_batches[i];
            var option = $('<option value="'+batch.id+'">'+batch.name+' ('+batch.quantity+')'+'</option>').clone();
            if (batch.name == 'Single') {
                option = $('<option selected value="'+batch.id+'">'+batch.name+' ('+batch.quantity+')'+'</option>').clone()
                defaultBatch = batch;
            }
            row.find('.packing').append(option);
        }

        if (inventory.type != 'purchased') {
            row.find('option[value="rented"]').remove();
        }


        var customer_b = null;
        currentCustomerData.customer.inventory_batches.forEach(batch => {
            if (batch.id === defaultBatch.id) customer_b = batch;
        });

        if (typeof customer_b !== 'undefined' || customer_b !== null) {
            inventory_rate = customer_b.customer_rate.rate;
        }else{
            let current_customer_type = null;
            currentCustomerData.customer_type.forEach(ty => {
                if (ty.id == currentCustomerData.customer.customer_type.id) {
                    current_customer_type = ty;
                }
            });

            current_customer_type.inventory_batches.forEach(b => {
                if (b.id == defaultBatch.id) {
                    inventory_rate = b.customer_type_rate.rate;
                }
            });
        }


        row.find('.packing').on('change', function() {
            var id = $(this).val();
            var batch = null;
            for (let i = 0; i < inventories.length; i++) {
                const inventory = inventories[i];
                for (let j = 0; j < inventory.inventory_batches.length; j++) {
                    const b = inventory.inventory_batches[j];
                    if (b.id == id) {
                        batch = b;
                    }
                }
            }

            defaultBatch = batch;

            var q = row.find('.quantity').val();
            if (typeof q == 'string') {
                if (q.length == 0) {
                    q = 0;
                }else{
                    if (isNaN(q)) {
                        q = 0;
                    }else{
                        q = parseInt(q);
                    }
                }
            }

            var total = q * batch.quantity;
            row.find('.total-quantity').val(total);

            var defaultRate = null;

            currentCustomerData.customer.inventory_batches.forEach(batch => {
                if (batch.id == id) {
                    defaultRate = batch.customer_rate.rate;
                }
            });

            if (defaultRate == null) {
                currentCustomerData.customer_type.inventory_batches.forEach(batch => {
                    if (batch.id == id) {
                        defaultRate = batch.customer_type_rate.rate;
                    }
                });
            }

            if (defaultRate == null) {
                defaultRate = 0;
            }


            var sub_total = q * defaultRate;
            
            row.find('.rate').val(defaultRate.toFixed(2));
            row.find('.inv-id').html(defaultBatch.id);
            row.find('.inv-type').attr('name', 'inv_type_' + defaultBatch.id + '[]');
            row.find('.quantity').attr('name', 'quantity_' + defaultBatch.id + '[]');
            row.find('.rate').attr('name', 'rate_' + defaultBatch.id + '[]');
            inventory_rate = defaultRate;
            row.find('.total').html('Re. ' + sub_total.toFixed(2));
            var max = Math.floor(in_stock / defaultBatch.quantity);
            row.find('.quantity').attr('max', max);
            updateTotal();
        });

        row.find('.inv-id').html(defaultBatch.id);
        row.find('.inv-name').html(inventory.name);
        
        row.find('.inv-type').attr('name', 'inv_type_' + defaultBatch.id + '[]');
        row.find('.rate').val(inventory_rate.toFixed(2));
        row.find('.inv-type').on('change', function() {
            var val = $(this).val();
            if (val == 'sold') {
                row.find('.rate').val(inventory_rate.toFixed(2));
            }else if (val == 'rented') {
                row.find('.rate').val(0.00);
            }
            row.find('.rate').trigger('change');
        });
        row.find('.rate').on('change', function () {
            var rate = $(this).val();
            var q = row.find('.quantity').val();
            if (isNaN(q) || isNaN(rate)) {
                row.find('.total').html('Re. 0.00');
            } else {
                q = parseInt(q);
                rate = parseFloat(rate);
                var total = q * rate;
                row.find('.total').html('Re. ' + total.toFixed(2));
            }
            updateTotal();
        });

        var max = Math.floor(in_stock / defaultBatch.quantity);
        row.find('.quantity').attr('max', max);
        row.find('.quantity').attr('name', 'quantity_' + defaultBatch.id + '[]');
        row.find('.rate').attr('name', 'rate_' + defaultBatch.id + '[]');
        row.find('.quantity').on('change', function () {
            var q = $(this).val();
            var rate = row.find('.rate').val();
            if (isNaN(q) || isNaN(rate)) {
                row.find('.total').html('Re. 0.00');
                row.find('.total-quantity').val(0);
            } else {
                q = parseInt(q);
                var total_q = q * defaultBatch.quantity;
                rate = parseFloat(rate);
                var total = q * rate;
                row.find('.total-quantity').val(total_q);
                row.find('.total').html('Re. ' + total.toFixed(2));
            }
            updateTotal();
        });
        row.find('.remove-item').on('click', function () {
            row.remove();
            updateTotal();
        });
        $("#inventory-table-body").append(row);
        updateTotal();
    };

    $(".list-group-item").on('click', list_group_item_event);

    const inputElement = document.querySelector('input[type="file"]');
    const pond = FilePond.create(inputElement, {
        labelIdle: 'Add Image',
        server: {
            url: '/api/image/',
            process: 'process',
            revert: 'revert',
        },
        onerror: e => {
            console.log(e);
        },
        onprocessfile: (e, f) => {
            var reader = new FileReader();
            reader.readAsDataURL(f.file);
            reader.onload = function () {

                $(".image-placeholder img").attr('src', reader.result);
            };
        },
        onremovefile: (e, f) => {
            $(".image-placeholder img").attr('src', '/images/placeholder-vertical.jpg');
        }
    });

    $("#new-bill-form").on('submit', function (e) {
        e.preventDefault();
        var customer = $("#customer").val();
        if (customer === null || customer.length === 0) {
            $("#customer").addClass('is-danger');
            $("#customer").siblings('.help').show();
            $("html, body").animate({ scrollTop: "0" }); 
        } else {
            $(this).off();
            $(this).trigger('submit');
        }

    });

    $(".tgl-flip").on('change', function () {
        if ($(this).is(':checked')) {
            $("#due_date_container").hide();
            $("#due_date_container").prop('required', false);
            $("#payment_method").val('Cash');
        } else {
            $("#due_date_container").show();
            $("#due_date_container").prop('required', true);
            $("#payment_method").val('Credit');
        }
    });

    $("#payment-method").on('change', function() {
        var method = $(this).val();
        if (method === 'Free' || method === 'Cash') {
            $("#due_date_container").hide();
            $("#due_date_container").prop('required', false);
            $(".tg-flip").prop("checked", true);
        }
        else if (method === 'Credit') {
            $("#due_date_container").show();
            $("#due_date_container").prop('required', true);
            $(".tg-flip").prop("checked", false);
        }
    });

    $('#due_date').nepaliDatePicker({
        dateFormat: '%d/%m/%y',
        closeOnDateSelect: true,
    });

    $('#bill_date').nepaliDatePicker({
        dateFormat: '%d/%m/%y',
        closeOnDateSelect: true,
    });

    $("#bill_date").on('change', function() {
        var bill_date = $(this).val();
        $("#inventory-table-body").empty();
        updateTotal();

        $.get('/api/inventories?date='+bill_date, function (data) {
            inventories = data.inventories;
            $(".list-group").empty();
            inventories.forEach(function(inv) {
                var list_group_item = $(`
                <a href="#" data-value="${inv.id}"
                                class="panel-block list-group-item">${inv.name} (In Stock: ${inv.in_stock})</a>
                `);
                $(".list-group").append(list_group_item); 
            });
            $(".list-group-item").on('click', list_group_item_event);

        }).fail(function (err) {
            console.log(err);
            window.location.href = '/billing';
        });
        $.post('/api/bill-no', {bill_date: bill_date}, function(data) {
            if (data.status == 'success') {
                $("#track_id").val(data.bill_no);
                console.log("Bill number updated");
                console.log(data);
            }else{
                console.log("Bill number update error");
                console.log(data);
                window.location.href = '/billing';
            }
        });
    });
});



$(document).on('keyup', function (e) {
    var code;
    if (e.key !== undefined) {
        code = e.key;
    } else if (e.keyIdentifier !== undefined) {
        code = e.keyIdentifier;
    }
    if (code === 'Escape') {
        $(".modal").removeClass('is-active');
    }
});