function removeSearchResult() {
    $('.dropdown-menu .dropdown-content').empty();
    $('.dropdown-menu').hide();
}

$(function () {
    removeSearchResult();
    $.get('/api/all-bills', function (data) {
        if (data.status == 'success') {
            const bills = data.bills;

            function searchBills(obj) {
                $('#bill-dropdown-menu .dropdown-content').empty();
                $("#bill-dropdown-menu").show();
                var query = $(obj).val();
                var result = [];
                if (query.length > 0) {
                    for (let i = 0; i < bills.length; i++) {
                        const bill = bills[i];
                        if (bill.detail.search(query) >= 0) {
                            result.push(bill);
                            if (result.length > 5) break;
                        }
                    }
                    if (result.length == 0) {
                        var res = $('<a href="#" class="dropdown-item">No Match</a>');
                        $('#bill-dropdown-menu .dropdown-content').append(res);
                    } else {

                        for (let i = 0; i < result.length - 1; i++) {
                            let r = result[i];
                            var res = $('<a href="/billing/' + r.id + '" class="dropdown-item is-capitalized">' + r.detail + '</a><hr class="dropdown-divider">');
                            $('#bill-dropdown-menu .dropdown-content').append(res);
                        }
                        let r = result[result.length - 1];
                        var res = $('<a href="/billing/' + r.id + '" class="dropdown-item is-capitalized">' + r.detail + '</a>');
                        $('#bill-dropdown-menu .dropdown-content').append(res);
                    }
                }
            }
            $("#bill-search").on('focus', function () {
                searchBills(this);
            });
            $("#bill-search").on('keyup', function () {
                searchBills(this);
            });
        }
    }).fail(function (err) {
        console.log(err);
    });

    $.get('/api/all-customers', function (data) {
        if (data.status == 'success') {
            const customers = data.customers;
            function searchCustomer(obj) {
                $('#customer-dropdown-menu .dropdown-content').empty();
                $("#customer-dropdown-menu").show();
                var query = $(obj).val();
                var result = [];
                if (query.length > 0) {
                    for (let i = 0; i < customers.length; i++) {
                        const customer = customers[i];
                        if (customer.detail.search(query) >= 0) {
                            result.push(customer);
                            if (result.length > 5) break;
                        }
                    }
                    if (result.length == 0) {
                        var res = $('<a href="#" class="dropdown-item">No Match</a>');
                        $('#customer-dropdown-menu .dropdown-content').append(res);
                    } else {

                        for (let i = 0; i < result.length - 1; i++) {
                            let r = result[i];
                            var res = $('<a href="/customer/' + r.id + '" class="dropdown-item is-capitalized">' + r.detail + '</a><hr class="dropdown-divider">');
                            $('#customer-dropdown-menu .dropdown-content').append(res);
                        }
                        let r = result[result.length - 1];
                        var res = $('<a href="/customer/' + r.id + '" class="dropdown-item is-capitalized">' + r.detail + '</a>');
                        $('#customer-dropdown-menu .dropdown-content').append(res);
                    }
                }
            }
            $("#customer-search").on('focus', function () {
                searchCustomer(this);
            });
            $("#customer-search").on('keyup', function () {
                searchCustomer(this);
            });
        }
    }).fail(function (err) {
        console.log(err);
    });


    $(document).on('keyup', function (e) {
        var code;
        if (e.key !== undefined) {
            code = e.key;
        } else if (e.keyIdentifier !== undefined) {
            code = e.keyIdentifier;
        }
        if (code === 'Escape') {
            removeSearchResult();
        }
    });

    $(document).on('click', function (e) {
        if (!$(e.target).hasClass('dropdown')) {
            if ($(e.target).parents('.dropdown').length == 0) {
                removeSearchResult();
            }
        }
    });
});