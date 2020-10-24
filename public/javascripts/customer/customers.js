$(document).ready(() => {
    $("#customer-table").DataTable({
        "columnDefs": [
            { "width": "3%", "targets": 0 },
        ]
    });

    $("#customer-table tbody tr").click(function() {
        var id = $(this).find(".customer-id").html();
        window.location.href = "/customer/"+id;
    });
});