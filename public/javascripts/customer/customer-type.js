$(function() {
    $("#customer-type-table").DataTable({
        "columnDefs": [
            { "width": "8%", "targets": 0 },
        ]
    });

    $("#add-customer-type-button").click(function() {
        $("#add-customer-type-modal").toggleClass("is-active");
    });

    $("#add-customer-type-modal form").submit(function(e) {
        e.preventDefault();
        const form = $(this);
        var name =  form.find("#customer-type-name").val();
        if (name.trim().length === 0) {
            form.find("#customer-type-name").addClass("is-danger");
            form.find("#customer-type-name").siblings(".help").show().html("Please Enter customer type.");
        }else{
            // Check if name is valid
            $.post('/customer/customer-type-exists', {name}, function(data) {
                if (data.status == 'success') {
                    form.off();
                    form.submit();
                }else{
                    form.find("#customer-type-name").addClass("is-danger");
                    form.find("#customer-type-name").siblings(".help").show().html(data.message);
                }
            });
        }
    });

    $("#edit-customer-type-modal form").submit(function(e) {
        e.preventDefault();
        const form = $(this);
        var name =  form.find("#edit-customer-type-name").val();
        if (name.trim().length === 0) {
            form.find("#edit-customer-type-name").addClass("is-danger");
            form.find("#edit-customer-type-name").siblings(".help").show().html("Please Enter customer type.");
        }else{
            form.off();
            form.submit();
        }
    });

    $("#customer-type-name, #edit-customer-type-name").on('keyup', function() {
        $(this).removeClass("is-danger");
        $(this).siblings(".help").hide();
    });

    $(".type-delete-button").click(function() {
        var id = $(this).val();
        var name = $(this).attr('data-key');
        $("#confirm-delete").find(".modal-card-title").html("Confirm Delete "+name+"?");
        $("#confirm-delete").find("form").attr('action', '/customer/customer-type/'+id+'?_method=DELETE');
        $("#confirm-delete").addClass('is-active');
    });

    $(".type-edit-button").on('click', function() {
        var id = $(this).val();
        $.get("/customer/customer-type/"+id, function(data) {
            if (data.status == 'success') {
                $("#edit-customer-type-name").val(data.customer_type.name);
                const form = $("#edit-customer-type-modal form");
                form.attr('action', '/customer/customer-type/'+id+'?_method=PUT');
                form.find("input[type='number']").val('');
                data.customer_type.inventorie_batches.forEach(batch => {
                    form.find("input[name='batch-"+batch.id+"']").val(batch.customer_type_rate.rate);
                });
                $("#edit-customer-type-modal").addClass('is-active');
            }else {
                alert("Something went wrong try again later");    
            }
        });
    });
});