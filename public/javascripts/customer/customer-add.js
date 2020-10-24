$(document).ready(function() {
    $("#zone").on('change', function() {
        var id = $(this).val();
        $("#district").addClass("is-loading");
        $("#district").empty();
        $("#post_office").empty();
        $.get('/api/district/'+id, function(data) {
            let empty_option = $('<option value="" disabled selected></option>');
            $("#district").append(empty_option);
            data.districts.forEach(district => {
                let option = $('<option value="'+district.id+'">'+district.value+'</option>');
                $("#district").append(option);
            });

            $("#district").removeClass("is-loading");
        });
    });

    $("#district").on('change', function() {
        let id = $(this).val();
        if (id.length > 0) {
            $("#post_office").addClass("is-loading");
            $("#post_office").empty();
            $.get('/api/post-office/'+id, function(data) {
                let empty_option = $('<option value="" disabled selected></option>');
                $("#post_office").append(empty_option);
                data.post_offices.forEach(po => {
                    let option = $('<option value="'+po.id+'">'+po.name+' ('+po.value+') '+'</option>');
                    $("#post_office").append(option);
                });
                $("#post_office").removeClass('is-loading');
            });
        } 
    });

    $("#customer_type").on('change', function() {
        let id = $(this).val();
        $.get('/api/customer-type/'+id, function(data) {
            $('.set-rates table tbody').empty();
            var template = $("template").html();
            const inventories = data.customer_type.inventories;
            for (let i = 0; i < inventories.length; i++) {
                const inventory = inventories[i];
                var tr = $(template).clone();
                tr.find('.inventory-id').html(inventory.id);
                tr.find('.inventory-name').html(inventory.name);
                tr.find('input').attr('name', 'rate-'+inventory.id).attr('id', 'rate-'+inventory.id).val(inventory.customer_type_rate.rate);
                tr.find('button').attr('id', 'rate-btn-'+inventory.id).val(inventory.id);
                $('.set-rates table tbody').append(tr);
                $("#rate-btn-"+inventory.id).click(function() {
                    $("#rate-"+inventory.id).val(inventory.customer_type_rate.rate);
                });
            }
            $('.set-rates').show();
        });
    });

    $("#add-new-customer-form").submit(function(e) {
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

    $("#first_name").on('keyup', function() {
        $(this).removeClass('is-danger');
        $(this).siblings('.help').hide();
    });

    $("#customer_type").on('change', function() {
        $(this).removeClass('is-danger');
        $(this).siblings('.help').hide();
    });
});