//
// main options
var kWh_cost = 0.219;
var kWh_paid = 4262;
var counter_reference = {
    counter1 : {
        timestamp : 1349042400, // 1.10.2012, 00:00 uhr
        value : 0, // zaehlerstand..
    },
    counter2 : {
        timestamp : 1349042400, // 1.10.2012, 00:00 uhr
        value : 0, // zaehlerstand..
    },
    counter3 : {
        timestamp : 1349042400, // 1.10.2012, 00:00 uhr
        value : 0, // zaehlerstand..
    },
    lost : {
        timestamp : 1349042400, // 1.10.2012, 00:00 uhr
        value : 0, // muss null sein, weil gabs vorher nicht..
    },
    total : {
        timestamp : 1349042400, // 1.10.2012, 00:00 uhr
        value : 0, // der im keller..
    },
};
var rrd_file = "/sm/data/smartmeter.rrd";


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

var cBarOpts = {
    show : true,
    stacked : true,
    horizontal : false,
    barWidth : undefined,
    lineWidth : 1,
    shadowSize : 0,
    fillOpacity : 0.8,
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
    title : 'Average Consumption',
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
        verticalLines : false,
        horizontalLines : true,
        backgroundColor : {
            colors : [[0,'#666'], [1,'#333']],
            start : 'top',
            end : 'bottom'
        },
    },
};

var counters = {
    total: {
        label: 'Total',
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
    lost: {
        label: 'Lost',
        color: "#ff5555",
        bars : cBarOpts,
        data: []
    },
    counter3: {
        label: 'Counter 1',
        color: "#5555ff",
        bars : cBarOpts,
        data: []
    },
    counter1: {
        label: 'Counter 2',
        color: "#55ff55",
        bars : cBarOpts,
        data: []
    },
    counter2: {
        label: 'Counter 3',
        color: "#eeee44",
        bars : cBarOpts,
        data: []
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


// helper functions

function objDump(arr,level) {
    var dumped_text = "";
    if(!level) level = 0;

    var level_padding = "";
    for(var j=0;j<level+1;j++) level_padding += "    ";

    if(typeof(arr) == 'object') {  
        for(var item in arr) {
            var value = arr[item];

            if(typeof(value) == 'object') { 
                dumped_text += level_padding + "'" + item + "' ...\n";
                dumped_text += objDump(value,level+1);
            } else {
                dumped_text += level_padding + "'" + item + "' => \"" + value + "\"\n";
            }
        }
    } else { 
        dumped_text = "===>"+arr+"<===("+typeof(arr)+")";
    }
    return dumped_text;
}


function tooltipFormatter(x, y, s) {
    var t = new Date(x * 1000);
    var w = parseFloat(y / 1000);
    if (y < 1000) {
        w = Math.round(y) + ' W';
    } else {
        w = w.toFixed(3) + ' kW';
    }
    
    return t.toLocaleDateString() + '<br>' + t.toLocaleTimeString() + '<br>' + s + ': ' + w;
}

function yTickFormatter(val, axisOpts) {
    if (val < 1000) {
        return val + ' W';
    } else {
        return val / 1000 + ' kW';
    }
}
       


function regionMap(seriesData, from, to, fn) {
    var res=[], rec;

    for(var i=0,n=seriesData.length; i<n; i++) {
        rec = seriesData[i];

        if(rec[0] < from || rec[0] > to) { continue; }

        res.push(fn(rec));
    }

    return res;
}

function getSeriesAverage(seriesData, from, to) {
    var values = regionMap(seriesData, from, to, function(rec) { return rec[1]; }),
        sum = values.reduce(function(previousValue, currentValue) {
            return previousValue+currentValue;
        });
    return sum/values.length;
}

function getSeriesTotalConsumption(seriesData, from, to) {
    var duration = to - from;
    var avg = getSeriesAverage(seriesData, from, to);

    return avg*duration / 3600;
}

function get_next_month(ts) {
    var d = new Date(ts * 1000);
    var next_month = d.getMonth() + 1;
    console.log("date before conversion: " + d);
    d.setMonth(next_month);
    d.setDate(1);
    d.setHours(0);
    d.setMinutes(0);
    d.setSeconds(0);
    console.log("date after conversion:  " + d);
    return d.getTime() / 1000;
}

function truncate_empty_space(array) {
    var newArray = [];
    var firstValueSeen = 0;
    $.each(array, function(idx, obj) {
        if (firstValueSeen) {
            newArray.push(obj);
        } else {
            if (obj[1] > 0) {
                console.log("first value found");
                firstValueSeen = 1;
            }
        }
    });
    return newArray;
}


function update_table(min, max) {
    var oAvgTot=document.getElementById("sel_total_avg");
    oAvgTot.innerHTML = Math.round(getSeriesAverage(counters.total.data, min, max)) + " W";

    var oAvgC1=document.getElementById("sel_counter1_avg");
    oAvgC1.innerHTML = Math.round(getSeriesAverage(counters.counter1.data, min, max)) + " W";

    var oAvgC2=document.getElementById("sel_counter2_avg");
    oAvgC2.innerHTML = Math.round(getSeriesAverage(counters.counter2.data, min, max)) + " W";

    var oAvgC3=document.getElementById("sel_counter3_avg");
    oAvgC3.innerHTML = Math.round(getSeriesAverage(counters.counter3.data, min, max)) + " W";

    var oAvgLost=document.getElementById("sel_lost_avg");
    oAvgLost.innerHTML = Math.round(getSeriesAverage(counters.lost.data, min, max)) + " W";

    var oTotCons=document.getElementById("sel_total_consumption");
    var consumption = getSeriesTotalConsumption(counters.total.data, min, max) / 1000;
    oTotCons.innerHTML =consumption.toFixed(3) + " kWh";

    var oTotCost=document.getElementById("sel_total_cost");
    var cost = parseFloat(getSeriesTotalConsumption(counters.total.data, min, max) / 1000 * kWh_cost);
    oTotCost.innerHTML = cost.toFixed(2) + " &euro;";
}

function draw_graph(container) {
    var options = cMainGraphOpts;

    // Draw graph with default options, overwriting with passed options
    function drawGraph (opts) {
        // Clone the options, so the 'options' variable always keeps intact.
        o = Flotr._.extend(Flotr._.clone(options), opts || {});

        update_table(o.xaxis.min, o.xaxis.max);

        // Return a new graph.
        return Flotr.draw(
            container,
            counters,
            o
        );
    }

    graph = drawGraph();

    // flotr zoom handling
    Flotr.EventAdapter.observe(container, 'flotr:select', function(area){
        console.log("zoom x: " + area.x1 + " - " + area.x2);
        console.log("zoom y: " + area.y1 + " - " + area.y2);
        // Draw selected area
        graph = drawGraph({
            xaxis : {
                min : area.x1,
                max : area.x2,
                mode : cXaxisOpts.mode, 
                timeMode : cXaxisOpts.timeMode,
                timeUnit : cXaxisOpts.timeUnit,
                labelsAngle : cXaxisOpts.labelsAngle,
                noTicks : cXaxisOpts.noTicks,
                tickDecimals : cXaxisOpts.tickDecimals,
            },
            yaxis : {
                min : area.y1,
                max : area.y2,
                autoscale : true,
                tickFormatter : function(val, axisOpts) {return yTickFormatter(val, axisOpts);},
            },
           // bars : cBarOpts,
        });
    });

    // When graph is clicked, draw the graph with default area.
    Flotr.EventAdapter.observe(container, 'flotr:click', function () { graph = drawGraph(); });
}

        


// push rrd data into a timestamped array and give it to the draw_graph() function
function prepare_master_graph() {

    var f_rows;

    oSelRRA=document.getElementById("select_rra");
    rraIdx=oSelRRA.options[oSelRRA.selectedIndex].value;
    if (!rraIdx) rraIdx = 9;
    console.log("Selected RRA: " + rraIdx);

    counters.total.data = [];

    for (var dsIdx = 0; dsIdx < 4; dsIdx++) {
        // get RRA info
        var rra = rrd_data.getRRA(rraIdx);
        var ds_name = rrd_data.getDS(dsIdx).getName();
        var rows = rra.getNrRows();
        f_rows = rows;
        var last_update = rrd_data.getLastUpdate();
        var step = rra.getStep();
        var ts = (last_update - (step * rows));

        // set barWidth according to step size
        cBarOpts.barWidth = step - (step/5);

        console.log("rra: " + rra);
        console.log("rows: " + rows);
        console.log("last_update: " + last_update);
        console.log("step: " + step);
        console.log("ds_name: " + ds_name);

        counters[(ds_name)].data = [];

        
        for (var i = 0; i < f_rows; i++) {
            var el = rra.getElFast(i,dsIdx);
            //if (i >= rows - 10) console.log(ds_name + ": " + ts + ": " + el * 1800);
            //if (!isNaN(el)) firstValueSeen = true;
            if (isNaN(el)) { el = 0; }
            //if (firstValueSeen) {
                counters[(ds_name)].data.push( [ ts, el * 1800 ] );
                if (counters.total.data[(i)]) {
                    counters.total.data[(i)][1] += el * 1800;
                } else {
                    counters.total.data.push( [ ts, el * 1800 ] );
                }
            //}
            ts += (step);
        }
    }



    // truncate empty beginnings of data series
    var counter_names = [ "counter1", "counter2", "counter3", "lost", "total" ];
    $.each(counter_names, function(idx, counterName) {
        counters[(counterName)].data = truncate_empty_space(counters[(counterName)].data);
    });

    // pad all arrays to the beginning of total or zoom wont work properly
    var maxLength;
    var tempTotal = [];
    $.each(counter_names.reverse(), function(idx, counterName) {
        console.log("ficken: " + idx);
        if (idx === 0) {
            maxLength = counters[(counterName)].data.length;
            tempTotal = counters[(counterName)].data.reverse();
        } else {
            var tempArray = counters[(counterName)].data.reverse();
            var diff = maxLength - tempArray.length;
            for (i = 0; i < diff; i++) {
                //console.log("pushing " + tempTotal[tempArray.length][0]);
                tempArray.push( [ tempTotal[tempArray.length][0], 0 ] );
            }
            counters[(counterName)].data = tempArray.reverse();
        }
    });

    // draw the graph
    var masterGraph = document.getElementById("masterGraph");
    console.log("Drawing master chart...");
    draw_graph(masterGraph);

}

function draw_consumption_graphs() {
    var total = [];
    var total_cost = { data: [] };
    var rel_cost = { data: [] };
    var rraIdx = 6;
    var opts = {
        title : 'Absolute cost',
        bars : {
            show : true,
            barWidth : 0.8,
        },
        yaxis : {
            tickFormatter : function(val, axisOpts) { return val + " &euro;" },
            min : 0,
        },
        y2axis : {
            tickFormatter : function(val, axisOpts) { return val + " kWh" },
            min : 0,
        },
        xaxis : {
                mode : 'time',
                timeMode : 'local',
                timeUnit : 'month',
/*
            ticks : [
                [1, 'Jan'],
                [2, 'Feb'],
                [3, 'Mar'],
                [4, 'Apr'],
                [5, 'May'],
                [6, 'Jun'],
                [7, 'Jul'],
                [8, 'Aug'],
                [9, 'Sep'],
                [10, 'Oct'],
                [11, 'Nov'],
                [12, 'Dec'],
            ],
            noTicks : 2,
*/
        },
        mouse : cMouseOpts,
    };

    opts.xaxis.tickDecimals = 0;

    // get_next_month muss get_next_day_week_month_year werden, damit dass hier funktioniert!
    oSelRRA=document.getElementById("select_consumption_rra");
    rraIdx=oSelRRA.options[oSelRRA.selectedIndex].value;
    if (!rraIdx) rraIdx = 6;

    for (var dsIdx = 0; dsIdx < 4; dsIdx++) {
        // get RRA info
        var rra = rrd_data.getRRA(rraIdx);
        var ds_name = rrd_data.getDS(dsIdx).getName();
        var rows = rra.getNrRows();
        var last_update = rrd_data.getLastUpdate();
        var step = rra.getStep();
        var ts = (last_update - (step * rows));

        
        for (var i = 0; i < rows; i++) {
            var el = rra.getElFast(i,dsIdx);
            if (isNaN(el)) { el = 0; }
            if (total[(i)]) {
                total[(i)][1] += el * 1800;
            } else {
                total.push( [ ts, el * 1800 ] );
            }
            ts += (step);
        }
    }

    total = truncate_empty_space(total);
    // calculate monthly consumption
    var next_month_start = get_next_month(total[0][0]);
    var this_month_start = total[0][0];
    $.each(total, function(idx, obj) {
        if (obj[0] > next_month_start || idx === total.length - 1) {
            var xVal = new Date((this_month_start) * 1000);
            console.log("pushing " + Math.round(getSeriesTotalConsumption(total, this_month_start, next_month_start) * kWh_cost / 1000));
            total_cost.data.push([
                (xVal.getMonth()),
                Math.round(getSeriesTotalConsumption(total, this_month_start, next_month_start) * kWh_cost / 1000),
            ]);
            rel_cost.data.push([
                (xVal.getMonth()),
                Math.round((getSeriesTotalConsumption(total, this_month_start, next_month_start) * kWh_cost / 1000) - (kWh_paid * kWh_cost / 12)),
            ]);
            this_month_start = next_month_start;
            next_month_start = get_next_month(next_month_start);
        }
    });

    // draw the absolute cost graph
    var monthlyConsumptionGraph = document.getElementById("monthlyConsumptionGraph");
    console.log("Drawing consumption chart...");
    var total_cost_graph = Flotr.draw(monthlyConsumptionGraph, total_cost, opts);

    // draw the relaive cost graph
    opts.yaxis.min = -50;
    opts.yaxis.max = 50;
    opts.title = "Relative cost";
    var monthlyPlusMinusGraph = document.getElementById("monthlyPlusMinusGraph");
    console.log("Drawing plus minus chart...");
    var total_cost_graph = Flotr.draw(monthlyPlusMinusGraph, rel_cost, opts);

}

// This is the callback function that,
// given a binary file object,
// verifies that it is a valid RRD archive
// and 
function update_fname_handler(bf) {
    console.log("update_fname_handler running with file name: " + rrd_file);
    var i_rrd_data=undefined;
    try {
        i_rrd_data=new RRDFile(bf);            
    } catch(err) {
        alert("File at name "+rrd_file+" is not a valid RRD archive!\n"+err);
    }
    if (i_rrd_data!=undefined) {
        rrd_data = i_rrd_data;
        prepare_master_graph();
        draw_consumption_graphs();
        //draw_plusminus_graph();
    }
}


// show a spinner animation to indicate the rrd file is loading
var spinnerTarget = document.getElementById("masterGraph");
var spinner = new Spinner(cSpinnerOpts).spin(spinnerTarget);

// load rrd file and give it to the preprocessor
console.log("Fetching " + rrd_file);
try {
    FetchBinaryURLAsync(rrd_file,update_fname_handler);
} catch (err) {
    alert("Failed loading " + rrd_file + "\n" + err);
}


// vim: expandtab sw=4 ts=4
