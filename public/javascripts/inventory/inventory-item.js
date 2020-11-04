function resetTabs() {
    $(".tab-link").removeClass("is-active");
    $(".tab-content").hide();
}

$(function() {
    $(".add-inventory-record").on('click', function() {
        $('#add-inventory-record-modal').addClass('is-active');
    });
    $("#history-tabs-link").on('click', function() {
        resetTabs();
        $(this).addClass('is-active');
        $("#history-tab").show();
    });

    $("#reports-tabs-link").on('click', function() {
        resetTabs();
        $(this).addClass('is-active');
        $("#reports-tab").show();
    });

    $("#bill-tabs-link").on('click', function() {
        resetTabs();
        $(this).addClass('is-active');
        $("#bill-tab").show();
    });
    var total = 0;
    var table_loaded = new Promise((resolve, reject) => {
        $('.rent-status').each(function() {
            let id = $(this).attr('data-key');
            var container = $(this);
            $.get('/api/check-item-rented/'+id, function(data) {
                if (data.status == 'success') {
                    if (data.result) {
                        container.append('<span class="has-text-danger">Rented</span>');
                    }else{
                        container.append('<span class="has-text-success">No</span>');
                    }
                }
            }).fail(function(err) {
                console.log(err);
            }).always(function() {
                total++;
                if (total == totals_bills) {
                    resolve();
                }
            });
        });
    });
    table_loaded.then(function() {
        $("#billing-table").DataTable({
            "columnDefs": [
                { "width": "3%", "targets": 0 },
            ],
            "order": [[0, 'desc']]
        });
    });

    $("#history-table").DataTable({        
    });

});

