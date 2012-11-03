//foo
// main options

var kWh_cost = 0.219;
var kWh_paid = 4262; // per year
var rrd_file = "/sm/data/smartmeter_rescue.rrd";
var rrd_correction_factor = 60 * 60 / 2; // 2000 pulses per kWh, stored every minute but internally treated as pulses per second by rrd

// localized strings
var lang = "de";
var strings = {
    en : {
        last_day : "Last Day",
        last_week : "Last Week",
        last_month : "Last Month",
        counter1 : "Counter 1",
        counter2 : "Counter 2",
        counter3 : "Counter 3",
        lost : "Lost",
        total : "Total",
        absolute_costs : "Absolute costs",
        relative_costs : "Relative costs",
        power_consumption : "Power consumption",
        currency : "€",
        two_days : "2 Days (1 min)",
        two_weeks : "2 Weeks (5 min)",
        six_months : "6 Months (30 min)",
        two_years : "2 Years (6 hours)",
        average : "Average",
        consumption : "Consumption",
        costs : "Costs",
        counter_reading : "Counter reading",
    },
    de : {
        last_day : "Letzter Tag",
        last_week : "Letzte Woche",
        last_month : "Letzter Monat",
        counter1 : "Zähler 1",
        counter2 : "Zähler 2",
        counter3 : "Zähler 3",
        lost : "Verloren",
        total : "Summe",
        absolute_costs : "Absolute Kosten",
        relative_costs : "Relative Kosten",
        power_consumption : "Stromverbrauch",
        currency : "€",
        two_days : "2 Tage (1 min)",
        two_weeks : "2 Wochen (5 min)",
        six_months : "6 Monate (30 min)",
        two_years : "2 Jahre (6 std)",
        average : "Durchschnitt",
        consumption : "Verbrauch",
        costs : "Kosten",
        counter_reading : "Zählerstand",
    },
};

// counter options

var cBarOpts = {
    show : true,
    stacked : true,
    horizontal : false,
    barWidth : undefined,
    lineWidth : 1,
    shadowSize : 0,
    fillOpacity : 0.8,
};

var counters = {
    total: {
        label: strings[(lang)][("total")],
        ref_val : 11501.33, // counter reading
        ref_ts : 1348977966, // the time you took it
        color: "#dddddd",
        lines: {
            show: true,
            lineWidth : 2,
            stacked: false,
            fill: true,
            fillOpacity : 0.3,
        },
        data: []
    },
    counter1: {
        label: strings[(lang)][("counter1")],
        ref_val : 497.82, // counter reading
        ref_ts : 1348977966, // the time you took it
        color: "#55ff55",
        bars : cBarOpts,
        data: []
    },
    counter2: {
        label: strings[(lang)][("counter2")],
        ref_val : 270.06, // counter reading
        ref_ts : 1348977966, // the time you took it
        color: "#eeee44",
        bars : cBarOpts,
        data: []
    },
    counter3: {
        label: strings[(lang)][("counter3")],
        ref_val : 1206.72, // counter reading
        ref_ts : 1348977966, // the time you took it
        color: "#5555ff",
        bars : cBarOpts,
        data: []
    },
    lost: {
        label: strings[(lang)][("lost")],
        ref_val : 0, // counter reading
        ref_ts : 1348977966, // the time you took it
        color: "#ff5555",
        bars : cBarOpts,
        data: []
    },
};

// various options

var rrd_data, graph, x, o;

var cXaxisOpts = {
    mode : 'time', 
    timeMode : 'local',
    timeUnit : 'second',
    labelsAngle : 0,
    noTicks : 10,
    tickDecimals : 0,
};

var cMouseOpts = {
    track           : true, // Enable mouse tracking
    trackAll        : false,
    trackY          : false,
    lineColor       : null,
    relative        : false,
    position        : 'ne',
    sensibility     : 5,
    trackDecimals   : 0,
    trackFormatter  : function (o) { return tooltipFormatter(o.x, o.y, o.series.label); }
};

var cMainGraphOpts = {
    mouse : cMouseOpts,
    HtmlText : false,
    title : strings[(lang)][("power_consumption")],
    xaxis : cXaxisOpts,
    yaxis : {
        autoscale : true,
        noTicks : 2,
        tickFormatter : function(val, axisOpts) {return yTickFormatter(val, axisOpts);},
    },
        selection : {
        mode : 'xy'
    },
    legend : {
        backgroundColor : '#ccc' // Light blue 
    },
    grid : {
        tickColor : '#666',
        verticalLines : false,
        horizontalLines : true,
        backgroundColor : {
            colors : [[0,'#666'], [1,'#333']],
            start : 'top',
            end : 'bottom'
        },
    },
};

var cSpinnerOpts = {
    lines: 9, // The number of lines to draw
    length: 7, // The length of each line
    width: 4, // The line thickness
    radius: 10, // The radius of the inner circle
    corners: 1, // Corner roundness (0..1)
    rotate: 0, // The rotation offset
    color: '#000', // #rgb or #rrggbb
    speed: 1, // Rounds per second
    trail: 60, // Afterglow percentage
    shadow: false, // Whether to render a shadow
    hwaccel: false, // Whether to use hardware acceleration
    className: 'spinner', // The CSS class to assign to the spinner
    zIndex: 2e9, // The z-index (defaults to 2000000000)
    top: 'auto', // Top position relative to parent in px
    left: 'auto' // Left position relative to parent in px
};



// vim: expandtab sw=4 ts=4
