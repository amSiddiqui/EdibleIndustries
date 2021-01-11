function resetTabs() {
    $(".tab-link").removeClass("is-active");
    $(".tab-content").hide();
}

function fetchAndUpdateReport() {
    $("#report-message").show();
    var from = $("#report-date-from").val();
    var to = $("#report-date-to").val();
    
    $.post('/api/inventory/report/'+inventory_id,{from, to}, function(data) {
        $("#report-message").html(data.message);
        
        if (data.status == 'success') {
            $("#report-message").removeClass('has-text-danger');
            $("#report-message").addClass('has-text-success');
        }else {
            $("#report-message").addClass('has-text-danger');
            $("#report-message").removeClass('has-text-success');
        }
    }).fail(function(err) {
        console.log("Some error occured");
        console.log(err);
    });
}

$(function () {
    $(".add-inventory-record").on('click', function () {
        $('#add-inventory-record-modal').addClass('is-active');
    });
    $("#history-tabs-link").on('click', function () {
        resetTabs();
        $(this).addClass('is-active');
        $("#history-tab").show();
    });

    $("#reports-tabs-link").on('click', function () {
        resetTabs();
        $(this).addClass('is-active');
        $("#reports-tab").show();
    });

    $("#batches-tabs-link").on('click', function () {
        resetTabs();
        $(this).addClass('is-active');
        $("#batches-tab").show();
    });

    $("#bill-tabs-link").on('click', function () {
        resetTabs();
        $(this).addClass('is-active');
        $("#bill-tab").show();
    });


    var total = 0;
    var table_loaded = new Promise((resolve, reject) => {
        $('.rent-status').each(function () {
            let id = $(this).attr('data-key');
            var container = $(this);
            $.get('/api/check-item-rented/' + id, function (data) {
                if (data.status == 'success') {
                    if (data.result) {
                        container.append('<span class="has-text-danger">Rented</span>');
                    } else {
                        container.append('<span class="has-text-success">No</span>');
                    }
                }
            }).fail(function (err) {
                console.log(err);
            }).always(function () {
                total++;
                if (total == totals_bills) {
                    resolve();
                }
            });
        });
    });
    table_loaded.then(function () {
        $("#billing-table").DataTable({
            "columnDefs": [{
                "width": "3%",
                "targets": 0
            }, ],
            "order": [
                [0, 'desc']
            ]
        });
    });

    $("#history-table").DataTable({});


    $("#add-batch-button").on('click', function () {
        $("#add-batch-modal").addClass('is-active');
    });

    $(".batch-edit-button").on('click', function () {
        var id = $(this).val();
        var name = $(this).attr('data-name');
        var quantity = $(this).attr('data-quantity');        
        $("#edit-batch-name").val(name);
        $("#edit-batch-quantity").val(quantity);
        $("#edit-batch-id").val(id);
        $("#edit-batch-modal").addClass('is-active');
    });

    $(".batch-delete-button").on('click', function() {
        var id = $(this).val();
        $("#confirm-delete").find("#delete-batch-id").val(id);
        $("#confirm-delete").addClass('is-active');
    });

    $("#inv-batch").on('change', function() {
        var quant = $("#inv-batch").find(':selected').attr('data-quant');
        quant = parseInt(quant);
        var quantity = $("#quantity").val();
        if (typeof quantity == 'string') {
            if (quantity.length == 0 || isNaN(quantity)) {
                quantity = 0;
            }else{
                quantity = parseInt(quantity);
            }
        }

        var total = quant * quantity;

        $("#total-quant").val(total);
    });

    $("#quantity").on('change', function() {
        var quant = $("#inv-batch").find(':selected').attr('data-quant');
        quant = parseInt(quant);
        var quantity = $("#quantity").val();
        if (typeof quantity == 'string') {
            if (quantity.length == 0 || isNaN(quantity)) {
                quantity = 0;
            }else{
                quantity = parseInt(quantity);
            }
        }

        var total = quant * quantity;

        $("#total-quant").val(total);
    });


    $('#record_date').nepaliDatePicker({
        dateFormat: '%d/%m/%y',
        closeOnDateSelect: true
    });

    $('#edit_record_date').nepaliDatePicker({
        dateFormat: '%d/%m/%y',
        closeOnDateSelect: true
    });

    var inventory_cost = $("#inventory_cost").val();
    $("#type").on('change', function() {
        var val = $(this).val();
        if (val == 'discarded') {
            $("#inventory_cost").val(0.0);
        }
        else{
            $("#inventory_cost").val(inventory_cost);
        }
    });

    $(".record-edit-button").on('click', function() {
        var date = $(this).attr('data-date');
        var type = $(this).attr('data-type');
        var cost = $(this).attr('data-cost');
        var packing = $(this).attr('data-packing');
        var quantity = $(this).attr('data-quantity');
        var record_id = $(this).val();
        $("#edit-inventory-type").val(type);
        $("#edit_record_date").val(date);
        $("#edit_inventory_cost").val(cost);
        $("#edit-inv-batch").val(packing);
        $("#edit-quantity").val(quantity);
        $("#edit-inventory-record-modal").find('form').attr('action', '/inventory/edit/'+record_id+'?_method=PUT');
        $("#edit-inventory-record-modal").addClass('is-active');
    });

    $(".record-delete-button").on('click', function() {
        var id = $(this).val();
        $("#confirm-delete-record").find("#delete-record-id").val(id);
        $("#confirm-delete-record").addClass('is-active');
    });




    // Reports Script
    $("#report-date-from").nepaliDatePicker({
        dateFormat: '%d/%m/%y',
        closeOnDateSelect: true
    });

    $("#report-date-to").nepaliDatePicker({
        dateFormat: '%d/%m/%y',
        closeOnDateSelect: true
    });

    fetchAndUpdateReport();
});