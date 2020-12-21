$(function () {

    if (typeof zone_id !== 'undefined') {
        if (zone_id != -1) {

            $("#district").addClass("is-loading");
            $("#district").empty();
            $("#post_office").empty();
            $.get('/api/district/' + zone_id, function (data) {
                let empty_option = '';
                if (district_id == -1) {
                    empty_option = $('<option value="" disabled selected></option>');
                } else {
                    empty_option = $('<option value="" disabled></option>');
                }
                $("#district").append(empty_option);
                data.districts.forEach(district => {
                    let option = '';
                    if (district.id == district_id) {
                        option = $('<option value="' + district.id + '" selected>' + district.value + '</option>');
                    } else {
                        option = $('<option value="' + district.id + '">' + district.value + '</option>');
                    }
                    $("#district").append(option);
                });
    
                $("#district").removeClass("is-loading");
            });
    
            if (district_id != -1) {
                $("#post_office").addClass("is-loading");
                $("#post_office").empty();
                $.get('/api/post-office/' + district_id, function (data) {
                    let empty_option = '';
                    if (post_office_id == -1) {
                        empty_option = $('<option value="" disabled selected></option>');
                    }else{
                        empty_option = $('<option value="" disabled></option>');
                    }
                    $("#post_office").append(empty_option);
                    data.post_offices.forEach(po => {
                        let option = '';
                        if (po.id == post_office_id) {
                            option = $('<option selected value="' + po.id + '">' + po.name + ' (' + po.value + ') ' + '</option>');
                        }else {
                            option = $('<option value="' + po.id + '">' + po.name + ' (' + po.value + ') ' + '</option>');
                        }
                        $("#post_office").append(option);
                    });
                    $("#post_office").removeClass('is-loading');
                });

            }
        }

        $.get('/api/customer/' + customer_id, function (data) {
            $('.set-rates table tbody').empty();
            var template = $("template").html();
            const inventories = data.inventories;
            const customer_type = data.customer_type;
            for (let i = 0; i < inventories.length; i++) {
                const inventory = inventories[i];
                for (let j = 0; j < inventory.inventory_batches.length; j++) {
                    const b = inventory.inventory_batches[j];
                    var tr = $(template).clone();
                    tr.find('.inventory-id').html(b.id);
                    tr.find('.inventory-name').html(inventory.name);
                    tr.find('.packing-name').html(b.name);
                    let inventory_default_rate = 0;
                    let batch = null;
                    for(let j = 0; j < customer_type.inventory_batches.length; j++) {
                        const temp = customer_type.inventory_batches[j];
                        if (temp.id == b.id) {
                            inventory_default_rate = temp.customer_type_rate.rate;
                            batch = temp;
                            break;
                        }
                    }
                    for(let j = 0; j < data.customer.inventory_batches.length; j++) {
                        const temp = data.customer.inventory_batches[j];
                        if (temp.id == b.id) {
                            inventory_default_rate = temp.customer_rate.rate;
                            break;
                        }
                    }
                    
                    tr.find('input').attr('name', 'rate-' + b.id).attr('id', 'rate-' + b.id).val(inventory_default_rate);
                    if (batch != null) {
                        tr.find('button').attr('id', 'rate-btn-' + b.id).val(b.id);
                    }else {
                        tr.find('button').remove();
                    }
                    $('.set-rates table tbody').append(tr);
                    if (batch != null) {
                        $("#rate-btn-" + batch.id).click(function () {
                            $("#rate-" + batch.id).val(inventory_default_rate);
                        });
                    }
                }
            }
            $('.set-rates').show();
        }).fail(function(err) {
            console.log(err);
        });
    }

    $("#zone").on('change', function () {
        var id = $(this).val();
        $("#district").addClass("is-loading");
        $("#district").empty();
        $("#post_office").empty();
        $.get('/api/district/' + id, function (data) {
            let empty_option = $('<option value="" disabled selected></option>');
            $("#district").append(empty_option);
            data.districts.forEach(district => {
                let option = $('<option value="' + district.id + '">' + district.value + '</option>');
                $("#district").append(option);
            });

            $("#district").removeClass("is-loading");
        });
    });

    $("#district").on('change', function () {
        let id = $(this).val();
        if (id.length > 0) {
            $("#post_office").addClass("is-loading");
            $("#post_office").empty();
            $.get('/api/post-office/' + id, function (data) {
                let empty_option = $('<option value="" disabled selected></option>');
                $("#post_office").append(empty_option);
                data.post_offices.forEach(po => {
                    let option = $('<option value="' + po.id + '">' + po.name + ' (' + po.value + ') ' + '</option>');
                    $("#post_office").append(option);
                });
                $("#post_office").removeClass('is-loading');
            });
        }
    });

    $("#customer_type").on('change', function () {
        let id = $(this).val();
        $.get('/api/customer-type/' + id, function (data) {
            $('.set-rates table tbody').empty();
            var template = $("template").html();
            const inventories = data.inventories;
            const customer_type = data.customer_type;
            for (let i = 0; i < inventories.length; i++) {
                const inventory = inventories[i];
                for (let j = 0; j < inventory.inventory_batches.length; j++) {
                    const b = inventory.inventory_batches[j];
                    var tr = $(template).clone();
                    tr.find('.inventory-id').html(inventory.id);
                    tr.find('.inventory-name').html(inventory.name);
                    tr.find('.packing-name').html(b.name+'('+b.quantity+')');
                    let inventory_default_rate = 0;
                    let found = false;
                    var cb;
                    for(let k = 0; k < customer_type.inventory_batches.length; k++) {
                        cb = customer_type.inventory_batches[k];
                        if (cb.id == b.id) {
                            inventory_default_rate = cb.customer_type_rate.rate;
                            found = true;
                            break;
                        }
                    }
                    tr.find('input').attr('name', 'rate-' + b.id).attr('id', 'rate-' + b.id).val(inventory_default_rate);
                    if (found) {
                        tr.find('button').attr('id', 'rate-btn-' + b.id).val(b.id);
                    }else {
                        tr.find('button').remove();
                    }
                    $('.set-rates table tbody').append(tr);
                    $("#rate-btn-" + b.id).click(function () {
                        $("#rate-" + b.id).val(inventory_default_rate);
                    });
                }
            }
            $('.set-rates').show();
        });
    });

    $("#add-new-customer-form").submit(function (e) {
        e.preventDefault();
        var first_name = $("#first_name").val();
        var organization = $("#organization").val();
        var customer_type = $("#customer_type").val();
        let valid = true;

        if ( (first_name == null || first_name.trim().length == 0) && ( organization == null || organization.trim().length == 0 ) ) {
            $("#first_name").addClass('is-danger');
            $("#first_name").siblings(".help").show();
            $("#organization").addClass('is-danger');
            $("#organization").siblings(".help").show();
            valid = false;
        }
        if (customer_type == null || customer_type.trim().length == 0) {
            $("#customer_type").addClass('is-danger');
            $("#customer_type").siblings('.help').show();
            valid = false;
        }
        if (valid) {
            $(this).off();
            $(this).submit();
        }
    });

    $("#edit-new-customer-form").submit(function (e) {
        e.preventDefault();
        var first_name = $("#first_name").val();
        var customer_type = $("#customer_type").val();
        let valid = true;

        if (first_name == null || first_name.trim().length == 0) {
            $("#first_name").addClass('is-danger');
            $("#first_name").siblings(".help").show();
            valid = false;
        }
        if (customer_type == null || customer_type.trim().length == 0) {
            $("#customer_type").addClass('is-danger');
            $("#customer_type").siblings('.help').show();
            valid = false;
        }
        if (valid) {
            $(this).off();
            $(this).submit();
        }
    });

    $("#first_name").on('keyup', function () {
        $(this).removeClass('is-danger');
        $(this).siblings('.help').hide();
    });

    $("#customer_type").on('change', function () {
        $(this).removeClass('is-danger');
        $(this).siblings('.help').hide();
    });

    $('#date-added').nepaliDatePicker({
        dateFormat: '%d/%m/%y',
        closeOnDateSelect: true,
    });
});