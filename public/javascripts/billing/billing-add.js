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
    });
    var currentCustomerData = null;
    $("#customer").on('change', function (e) {
        $("#customer").removeClass('is-danger');
        $("#customer").siblings('.help').hide();
        var id = $(this).val();
        if (isNaN(id)) {
            return;
        }
        $.get('/api/customer/' + id, function (data) {
            currentCustomerData = data.customer;
            $("#inventory-table-body tr").each(function (i) {
                var inv_id = $(this).find('.inv_id').html();

                var inv_rate = 0;
                currentCustomerData.inventories.forEach(inv => {
                    if (inv.id == inv_id) {
                        inv_rate = inv.cutomer_rate.rate;
                    }
                });
                var quant = $(this).find('.quantity').val();
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
        if (currentCustomerData === null || inventories === null) return;
        $("#select-inventory-item-modal").addClass('is-active');
    });

    $(".list-group-item").on('click', function () {
        $("#select-inventory-item-modal").removeClass('is-active');
        if (currentCustomerData === null) {
            console.log('Currentt Customer data not set');
            return;
        }
        var template = $("#inventory-item-template").html();
        var inventory_key = $(this).attr('data-value');
        var row = $(template).clone();
        var inventory_rate = 0;
        var inventory = null;
        for (let i = 0; i < inventories.length; i++) {
            const temp = inventories[i];
            if (temp.id == inventory_key) inventory = temp;
        }
        if (inventory === null) {
            console.log("Inventory not found");
            return;
        }
        currentCustomerData.inventories.forEach(inv => {
            if (inv.id == inventory.id) inventory_rate = inv.customer_rate.rate;
        });
        var in_stock = 0;
        if (inventory.inventory_records.length > 0) {
            in_stock = inventory.inventory_records[0].in_stock;
        }
        row.find('.inv-id').html(inventory.id);
        row.find('.inv-name').html(inventory.name);
        row.find('.inv-type').attr('name', 'inv_type_' + inventory.id + '[]');
        row.find('.rate').val(inventory_rate.toFixed(2));
        row.find('.rate').on('change', function () {
            var rate = $(this).val();
            var q = row.find('.quantity').val();
            if (isNaN(q) || isNaN(rate)) {
                row.find('.total').html('Re. 0.00');
            } else {
                q = parseFloat(q);
                rate = parseFloat(rate);
                var total = q * rate;
                row.find('.total').html('Re. ' + total.toFixed(2));
            }
            updateTotal();
        });
        row.find('.quantity').attr('max', in_stock);
        row.find('.quantity').attr('name', 'quantity_' + inventory.id + '[]');
        row.find('.rate').attr('name', 'rate_' + inventory.id + '[]');
        row.find('.quantity').on('change', function () {
            var q = $(this).val();
            var rate = row.find('.rate').val();
            if (isNaN(q) || isNaN(rate)) {
                row.find('.total').html('Re. 0.00');
            } else {
                q = parseFloat(q);
                rate = parseFloat(rate);
                var total = q * rate;
                row.find('.total').html('Re. ' + total.toFixed(2));
            }
            updateTotal();
        });
        row.find('.remove-item').on('click', function () {
            row.remove();
        });
        $("#inventory-table-body").append(row);
        updateTotal();
    });

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
        } else {
            $(this).off();
            $(this).trigger('submit');
        }

    });

    $(".tgl-flip").on('change', function () {
        if ($(this).is(':checked')) {
            $("#due_date_container").hide();
            $("#due_date_container").prop('required', false);
        } else {
            $("#due_date_container").show();
            $("#due_date_container").prop('required', true);
        }
    });

    $('#due_date').nepaliDatePicker({
        dateFormat: '%d/%m/%y',
        closeOnDateSelect: true,
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