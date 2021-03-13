$(function() {
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
    
    $("#name, #edit-name").on('focus', function() {
        $(this).addClass('is-touched');
    });


    $("#name").on('change', function() {
        var name = $(this).val();
        if (name.trim().length === 0) {
            $("#name").addClass("is-invalid");
            $("#name").siblings('.help').show().html("Please enter a name");
            $("#submit-button").attr('disabled', true);
        } else {
            $.post('/api/warehouse/exists', {'name': name}, function(res) {
                if (res.exists) {
                    $("#name").addClass("is-invalid");
                    $("#name").siblings('.help').show().html("Warehouse already exists");
                    $("#submit-button").attr('disabled', true);
                } else {
                    $("#name").removeClass("is-invalid");
                    $("#submit-button").attr('disabled', false);
                    $("#name").siblings(".help").hide();
                }
            }).fail(function(err) {
                console.log(err);
                $("#name").addClass("is-invalid");
                $("#name").siblings('.help').show().html(err.message);
            });
        }
    });

    $("#edit-name").on('change', function() {
        var name = $(this).val();
        if (name.trim().length === 0) {
            $("#edit-name").addClass("is-invalid");
            $("#edit-name").siblings('.help').show().html("Please enter a name");
            $("#submit-button").attr('disabled', true);
        } else {
            $.post('/api/warehouse/exists', {'name': name, id: warehouse_id}, function(res) {
                if (res.exists) {
                    $("#edit-name").addClass("is-invalid");
                    $("#edit-name").siblings('.help').show().html("Warehouse already exists");
                    $("#submit-button").attr('disabled', true);
                } else {
                    $("#edit-name").removeClass("is-invalid");
                    $("#submit-button").attr('disabled', false);
                    $("#edit-name").siblings(".help").hide();
                }
            }).fail(function(err) {
                console.log(err);
                $("#edit-name").addClass("is-invalid");
                $("#edit-name").siblings('.help').show().html(err.message);
            });
        }
    });
});