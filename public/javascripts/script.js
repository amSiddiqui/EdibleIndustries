$(() => {
    $(".delete").on('click', e => {
        $(e.target).parents('.modal').toggleClass('is-active');
        $(e.target).parents('.notification').hide();
    });
    $(".close-modal").on('click', e => {
        $(e.target).parents('.modal').toggleClass('is-active');
    });

    setTimeout(() => {
        $('.notification').animate({
            'margin-top': '-63px'
        }, complete = () => {
            $('.notification').hide();
        });
    }, 4000);

    $(document).on('keypress', 'input,select', function (e) {
        if (e.which == 13) {
            e.preventDefault();
        }
    });
    var nabarShow = false;
    $(".navbar-burger").on('click', function() {
        if (!nabarShow) {
            $("#navMenu").show();
        }else{
            $("#navMenu").hide();
        }
        nabarShow = !nabarShow;
    });
    
});

function formatMoney(amount, decimalCount = 2, decimal = ".", thousands = ",") {
    try {
        decimalCount = Math.abs(decimalCount);
        decimalCount = isNaN(decimalCount) ? 2 : decimalCount;

        const negativeSign = amount < 0 ? "-" : "";

        let i = parseInt(amount = Math.abs(Number(amount) || 0).toFixed(decimalCount)).toString();
        let j = (i.length > 3) ? i.length % 3 : 0;

        return negativeSign + (j ? i.substr(0, j) + thousands : '') + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + thousands) + (decimalCount ? decimal + Math.abs(amount - i).toFixed(decimalCount).slice(2) : "");
    } catch (e) {
        console.log(e)
    }
};


function convertNepaliToEnglish(date) {
    var numbers = {
        '१': 1,
        '२': 2,
        '३': 3,
        '४': 4,
        '५': 5,
        '६': 6,
        '७': 7,
        '८': 8,
        '९': 9,
        '०': 0,
        '1': 1,
        '2': 2,
        '3': 3,
        '4': 4,
        '5': 5,
        '6': 6,
        '7': 7,
        '8': 8,
        '9': 9,
        '0': 0,
    };
    var engDate = '';
    for (let i = 0; i < date.length; i++) {
        const d = date[i];
        if (d == '/') {
            engDate += '/'
        } else {
            engDate += numbers[d];
        }
    }
    return engDate;
}

function convertEnglishToNepali(date) {
    var numbers = {
        '1': '१',
        '2': '२',
        '3': '३',
        '4': '४',
        '5': '५',
        '6': '६',
        '7': '७',
        '8': '८',
        '9': '९',
        '0': '०',
        '१': '१',
        '२': '२',
        '३': '३',
        '४': '४',
        '५': '५',
        '६': '६',
        '७': '७',
        '८': '८',
        '९': '९',
        '०': '०',
    };
    var engDate = '';
    for (let i = 0; i < date.length; i++) {
        const d = date[i];
        if (d == '/') {
            engDate += '/'
        } else {
            engDate += numbers[d];
        }
    }
    return engDate;
}


function compareDate(self, other) {
    var self_comp = self.split("/");
    var other_comp = other.split("/");
    if (parseInt(self_comp[2]) > parseInt(other_comp[2]))
        return 1;
    if (parseInt(self_comp[2]) < parseInt(other_comp[2]))
        return -1;
    
    if (parseInt(self_comp[1]) > parseInt(other_comp[1]))
        return 1;
    if (parseInt(self_comp[1]) < parseInt(other_comp[1]))
        return -1;
    
    if (parseInt(self_comp[0]) > parseInt(other_comp[0]))
        return 1;
    if (parseInt(self_comp[0]) < parseInt(other_comp[0]))
        return -1;
    
    return 0;
}

function dateInRange(date, low, high) {
    if (compareDate(date, low) >= 0 && compareDate(date, high) <= 0) {
        return true;
    }
    return false;
}

function validDate(date) {
    var d = convertNepaliToEnglish(date);
    var comp = d.split("/");
    if (comp.length !== 3) return false;
    for (let i = 0; i < 3; i++) {
        if (comp[i].length === 0) return false;
        if (isNaN(comp[i])) return false;
    }
    return true;
}

function warn(msg) {
    $("#warning-message").find('p').html(msg);
    $("#warning-message").show();
}

$(() => {
 $('.clear-button').on('click', function() {
    $(this).siblings('input').val('');
    $(this).siblings('input').trigger('change');
 });
});

var wind_ = $(window);

wind_.on('load', function () {
    $('.preloader').fadeOut(300);
});