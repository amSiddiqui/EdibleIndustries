function resetTabs() {
    $(".tab-link").removeClass("is-active");
    $(".tab-content").hide();
}

function recordEdit(
    date,
    type,
    cost,
    packing,
    quantity,
    record_id
) {
    $("#edit-inventory-type").val(type);
    $("#edit_record_date").val(date);
    $("#edit_inventory_cost").val(cost);
    $("#edit-inv-batch").val(packing);
    $("#edit-quantity").val(quantity);
    $("#edit-inventory-record-modal").find('form').attr('action', '/inventory/edit/'+record_id+'?_method=PUT');
    $("#edit-inventory-record-modal").addClass('is-active');
}

function recordDelete(id) {
    $("#confirm-delete-record").find("#delete-record-id").val(id);
    $("#confirm-delete-record").addClass('is-active');
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
            ],
            "footerCallback": function (row, data, start, end, display) {
                var api = this.api(),
                    data;
                var intVal = function (i) {
                    if (typeof i === 'string') {
                        i = i.trim();
                        if (i.length == 0) {
                            return 0;
                        }
                        if (isNaN(i)) {
                            i = i.substring(3);
                            return parseFloat(i);
                        }
                        return parseFloat(i);
                    }
                    return i;
                };
    
                // computing column Total of the complete result 
                var costTotal = api
                    .column(4, { search:'applied' })
                    .data()
                    .reduce(function (a, b) {
                        return intVal(a) + intVal(b);
                    }, 0);
    
                var total = api
                    .column(5, { search:'applied' })
                    .data()
                    .reduce(function (a, b) {
                        return intVal(a) + intVal(b);
                    }, 0);
    
                costTotal = formatMoney(costTotal);
    
                // Update footer by showing the total with the reference of the column index 
                $(api.column(0).footer()).html('Total');
                $(api.column(4).footer()).html('Re. '+costTotal);
                $(api.column(5).footer()).html(total);
            }
        });
    });

    $("#history-table").DataTable({
        "footerCallback": function (row, data, start, end, display) {
            var api = this.api();
            var intVal = function (i) {
                if (typeof i === 'string') {
                    i = i.trim();
                    if (i.length == 0) {
                        return 0;
                    }
                    if (isNaN(i)) {
                        i = i.split(')')[1];
                        return parseFloat(i);
                    }
                    return parseFloat(i);
                }
                return i;
            };

            // computing column Total of the complete result 
        
            var total = api
                .column(4, { search:'applied' })
                .data()
                .reduce(function (a, b) {
                    return intVal(a) + intVal(b);
                }, 0);

            var costTotal = api
                .column(5, { search:'applied' })
                .data()
                .reduce(function (a, b) {
                    return intVal(a) + intVal(b);
                }, 0);

            costTotal = formatMoney(costTotal);

            // Update footer by showing the total with the reference of the column index 
            $(api.column(0).footer()).html('Total');
            $(api.column(4).footer()).html(total);
            $(api.column(5).footer()).html('Re. '+costTotal);
        }
    });


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