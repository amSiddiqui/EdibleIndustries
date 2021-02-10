$(document).ready(() => {
    $("#add-inventory-button").click(e => {
        $("#add-inventory-modal").toggleClass('is-active');
    });

    FilePond.registerPlugin(FilePondPluginImagePreview);

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

    });

    $("#add-inventory-modal form").submit(e => {
        e.preventDefault();
        var form = $(e.target);
        var name = form.find('input[name="name"]');
        var cost = form.find('input[name="cost"]');
        var type = form.find('select[name="type"]');
        var passed = true;
        if (name.val().trim().length === 0) {
            name.addClass('is-danger');
            name.siblings('.help').show();
            passed = false;
        } else {
            name.addClass('is-success');
        }

        if (cost.val().trim().length === 0 || isNaN(cost.val())) {
            cost.addClass('is-danger');
            cost.siblings('.help').show();
            passed = false;
        } else {
            cost.addClass('is-success');
        }

        if (type.val() === 'purchased' || type.val() === 'manufactured') {
            type.addClass('is-success');
        } else {
            type.addClass('is-danger');
            type.siblings('.help').show();
            passed = false;
        }
        form.off();
        if (passed) {
            form.submit();
        }
    });

    $("#add-inventory-modal form input, #add-inventory-modal form select").on('change', e => {
        var element = $(e.target);
        element.removeClass('is-danger');
        element.siblings('.help').hide();
    });

    $("#add-inventory-modal form select").on('change', e => {
        var val = e.target.value;
        if (val === 'purchased') {
            $(".cost-label").html('Cost');
        } else if (val === 'manufactured') {
            $('.cost-label').html('Cost Of Manufacture');
        }
    });

    $(".custom-card").on('click', function(e) {
        if ($(e.target).parents('.edit').length === 0) {
            var id = $(e.target).parents('.custom-card').attr('data-value');
            window.location.href = '/inventory/' + id;
        }
    });

    const inventory_batch_template = `
    <div class="columns">
        <div class="column">
            <div class="field">
                <label class="label">Packing</label>
                <div class="control">
                    <input required type="text" class="input" placeholder="Packing" name="batch_name[]">
                </div>
            </div>
        </div>
        <div class="column">
            <div class="field">
                <label class="label">Quantity</label>
                <div class="control">
                    <input required type="number" min="0" step="1" class="input" placeholder="Quantity" name="batch_quantity[]">
                </div>
            </div>
        </div>
        <div class="column is-1">
            <button type="button" class="add-item-button remove-item has-text-danger" style="margin-top: 30px;">
                <i class="fas fa-minus-circle fa-lg"></i>
            </button>
        </div>
    </div>
    `;

    $("#add-batch-button").on('click', function() {
        console.log("This is clicked");
        var temp = $(inventory_batch_template).clone();
        temp.find(".remove-item").on('click', function() {
            temp.remove();
        });
        $(".batch-container").append(temp);
    });




});