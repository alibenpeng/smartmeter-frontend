
// helper functions

function keys(obj)
{
    var keys = [];

    for(var key in obj)
    {
        if(obj.hasOwnProperty(key))
        {
            keys.push(key);
        }
    }

    return keys;
}

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
    //console.log("from: " + from);
    //console.log("to: " + to);


    var values = regionMap(seriesData, from, to, function(rec) { return rec[1]; }),
        sum = values.reduce(function(previousValue, currentValue) {
            return previousValue+currentValue;
        }, 0);

    return sum / values.length;
}


function getSeriesTotalConsumption(seriesData, from, to) {
    if (!from) {
        from = seriesData[seriesData.length - 1][0];
    }
    if (!to) {
        to = seriesData[0][0];
    }
    if (from > to) {
        var tmp = to;
        to = from;
        from = tmp;
    }
    //console.log("avg data: from: " + from + ", to: " + to);
    var duration = to - from;
    //console.log("duration: " + duration);
    var avg = getSeriesAverage(seriesData, from, to);

    return avg * duration / 3600;
}

function get_total(seriesData, from, to) {
    var sum = 0;
    for (i = 0; i < seriesData.length; i++) {
        var rec = seriesData[i];
        if(rec[0] < from || rec[0] > to) { continue; }

        //console.log("adding " + rec + " to sum: " + sum);
        sum += rec[1];
    }
    return sum;
}

function get_next_month(ts) {
    var d = new Date(ts * 1000);
    var next_month = d.getMonth() + 1;
    //console.log("date before conversion: " + d);
    d.setMonth(next_month);
    d.setDate(1);
    d.setHours(0);
    d.setMinutes(0);
    d.setSeconds(0);
    //console.log("date after conversion:  " + d);
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
                //console.log("first value found");
                firstValueSeen = 1;
            }
        }
    });
    return newArray;
}

function write_tr(series, from, to, string) {
    //console.log("writing tr for string: " + string);
    //console.log("counter1 absolute: " + counters.counter1.absolute);
    var tooltip_start = '';
    var tooltip_end = '';
    if (counters[(string)]) {
        tooltip_start = "<div rel=\"tooltip\" title=\"" + strings[(lang)][("counter_reading")] + ":\n" + counters[(string)].absolute.toFixed(2) + " kWh\">",
        tooltip_end = "</div>";
    }
    //console.log("write_tr(): from: " + from + ", to: " + to);
    var oTr=document.getElementById(string);
    var avg = parseFloat(getSeriesAverage(series, from, to));
    var cons = parseFloat(getSeriesTotalConsumption(series, from, to) / 1000);
    var cost = cons * kWh_cost;
    oTr.innerHTML =
        "<td>" + tooltip_start + strings[(lang)][(string)] + tooltip_end + "</td>" +
        "<td align=\"right\">" + avg.toFixed(0) + " W</td>" +
        "<td align=\"right\">" + cons.toFixed(2) + " kWh</td>" +
        "<td align=\"right\">" + cost.toFixed(2) + " " + strings[(lang)][("currency")] + "</td>" +
        tooltip_end;
}

function update_table(min, max) {
    
    var from = new Date(min * 1000);
    var to = new Date(max * 1000);
    var oTr=document.getElementById("timespan");
    oTr.innerHTML =
        "<th colspan=\"4\">" +
        from.toLocaleDateString() + ", " + from.toLocaleTimeString() + " - " +
        to.toLocaleDateString() + ", " + to.toLocaleTimeString() +
        "</th>";
    write_tr(counters.counter1.data, min, max, "counter1");
    write_tr(counters.counter2.data, min, max, "counter2");
    write_tr(counters.counter3.data, min, max, "counter3");
    write_tr(counters.lost.data, min, max, "lost");
    write_tr(counters.total.data, min, max, "total");
}

function draw_graph(container) {
    var options = cMainGraphOpts;

    // Draw graph with default options, overwriting with passed options
    function drawGraph (opts) {
        // Clone the options, so the 'options' variable always keeps intact.
        o = Flotr._.extend(Flotr._.clone(options), opts || {});

        o.mouse.trackFormatter = function (o) { return tooltipFormatter(o.x, o.y, o.series.label); };
        if (o.xaxis.min && o.xaxis.max) {
            update_table(o.xaxis.min, o.xaxis.max);
        } else {
            update_table(counters.total.data[0][0], counters.total.data[counters.total.data.length - 1][0]);
        }

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
        //console.log("zoom x: " + area.x1 + " - " + area.x2);
        //console.log("zoom y: " + area.y1 + " - " + area.y2);
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
    var f_counter_names = [];

    oSelRRA=document.getElementById("select_rra");
    rraIdx=oSelRRA.options[oSelRRA.selectedIndex].value;
    if (!rraIdx) rraIdx = 9;
    //console.log("Selected RRA: " + rraIdx);

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

        // push ds name to f_counter_names array
        f_counter_names.push(ds_name);

        // set barWidth according to step size
        cBarOpts.barWidth = step - (step/5);

        //console.log("rra: " + rra);
        //console.log("rows: " + rows);
        //console.log("last_update: " + last_update);
        //console.log("step: " + step);
        //console.log("ds_name: " + ds_name);

        counters[(ds_name)].data = [];

        
        for (var i = 0; i < f_rows; i++) {
            var el = rra.getEl(i,dsIdx);
            el = el * rrd_correction_factor;
            if (isNaN(el)) { el = 0; }
                counters[(ds_name)].data.push( [ ts, el ] );
                if (counters.total.data[(i)]) {
                    counters.total.data[(i)][1] += el ;
                } else {
                    counters.total.data.push( [ ts, el ] );
                }
            ts += (step);
        }
    }



    // truncate empty beginnings of data series
    //var counter_names = [ "counter1", "counter2", "counter3", "lost", "total" ];
/*
    $.each(f_counter_names, function(idx, counterName) {
        counters[(counterName)].data = truncate_empty_space(counters[(counterName)].data);
    });

    // pad all arrays to the beginning of total or zoom wont work properly
    var maxLength;
    var tempTotal = [];
    $.each(f_counter_names.reverse(), function(idx, counterName) {
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
*/

    // draw the graph
    var masterGraph = document.getElementById("masterGraph");
    //console.log("Drawing master chart...");
    draw_graph(masterGraph);

}

function draw_consumption_graphs() {
    var myCounters = {
        counter1 : [],
        counter2 : [],
        counter3 : [],
        lost     : [],
        total    : [],
    };
    var total_cost = { data: [], yaxis : { min : 1e+10, max : 0 }};
    var rel_cost = { data: [], yaxis : { min : 1e+10, max : 0 } };
    var rraIdx = 6;
    var opts = {
        title : strings[(lang)][("absolute_cost")],
        bars : {
            show : true,
        },
        yaxis : {
            tickFormatter : function(val, axisOpts) { return val + " " + strings[(lang)][("currency")] },
            tickDecimals : 0,
            minorTicks : 0,
        },
        xaxis : {
                mode : 'time',
                timeMode : 'local',
        },
        grid : {
            verticalLines : false,
            tickColor : '#bbb',
        },
        mouse : cMouseOpts,
    };

    opts.mouse.trackFormatter = function(fnord) {return fnord.y + " " + strings[(lang)][("currency")] };
    opts.xaxis.tickDecimals = 0;
    opts.xaxis.mode = 'time';
    opts.xaxis.timeMode = 'local';
    opts.bars.fillColor = { colors : [ '#FF0000', '#00FF00' ], start : 'top', end : 'bottom' };
    opts.bars.barWidth = 1.5e+9;
    opts.bars.centered = true;
    opts.bars.lineWidth = 0;
    opts.bars.fillOpacity = 0.8;
    

    // get_next_month needs to become get_next_day_week_month_year for this to work
/*
    oSelRRA=document.getElementById("select_consumption_rra");
    rraIdx=oSelRRA.options[oSelRRA.selectedIndex].value;
*/
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
            var el = rra.getEl(i,dsIdx);
            el = el * rrd_correction_factor ;

            if (isNaN(el)) { el = 0; }

            myCounters[(ds_name)].push( [ ts, el ] );

            if (myCounters[("total")][(i)]) {
                myCounters[("total")][(i)][1] += el;
            } else {
                myCounters[("total")].push( [ ts, el ] );
            }
            ts += (step);
        }
        //console.log("getting total consumption for ds: " + ds_name);
        counters[(ds_name)].absolute = getSeriesTotalConsumption(myCounters[(ds_name)], counters[(ds_name)].ref_ts, last_update) / 1000 + counters[(ds_name)].ref_val;
    }
    //console.log("getting total consumption for total");
    counters[("total")].absolute = getSeriesTotalConsumption(myCounters[("total")], counters[("total")].ref_ts, last_update) / 1000 + counters[("total")].ref_val;

    myCounters[("total")] = truncate_empty_space(myCounters[("total")]);

    // calculate monthly consumption
    var next_month_start = get_next_month(myCounters[("total")][0][0]);
    var this_month_start = myCounters[("total")][0][0];

    $.each(myCounters[("total")], function(idx, obj) {
        if (obj[0] > next_month_start || idx === myCounters[("total")].length - 1) {

            var xVal = new Date((this_month_start) * 1000);

            var yVal = parseFloat(getSeriesTotalConsumption(myCounters[("total")], this_month_start, next_month_start) * kWh_cost / 1000);

            if ((xVal.getSeconds() == 0) && (xVal.getMinutes() == 0) && (xVal.getHours() == 0) && (xVal.getDate() == 1)){
                if ((yVal -5) < total_cost.yaxis.min) {
                    total_cost.yaxis.min = yVal -5;
                }

                if ((yVal +5) > total_cost.yaxis.max) {
                    total_cost.yaxis.max = yVal +5;
                }

                console.log("pushing x: " + xVal.getTime() + ", y: " + yVal.toFixed(2) + ", idx: " + idx);
                total_cost.data.push([
                    (xVal.getTime()),
                    (yVal.toFixed(2)),
                ]);
            }

            yVal = parseFloat((getSeriesTotalConsumption(myCounters[("total")], this_month_start, next_month_start) * kWh_cost / 1000) - (kWh_paid * kWh_cost / 12));

            if ((xVal.getSeconds() == 0) && (xVal.getMinutes() == 0) && (xVal.getHours() == 0) && (xVal.getDate() == 1)){
                if ((yVal -5) < rel_cost.yaxis.min) {
                    rel_cost.yaxis.min = yVal -5;
                }

                if ((yVal +5) > rel_cost.yaxis.max) {
                    rel_cost.yaxis.max = yVal +5;
                }

                rel_cost.data.push([
                    (xVal.getTime()),
                    (yVal.toFixed(2)),
                ]);
            }
            this_month_start = next_month_start;
            next_month_start = get_next_month(next_month_start);
        }
    });

    // draw the absolute cost graph
    var monthlyConsumptionGraph = document.getElementById("monthlyConsumptionGraph");
    //console.log("Drawing consumption chart...");
    opts.yaxis.max = total_cost.yaxis.max;
    opts.yaxis.min = total_cost.yaxis.min;

    console.log(objDump(opts, 4));
    console.log(objDump(total_cost, 4));
    var total_cost_graph = Flotr.draw(monthlyConsumptionGraph, total_cost, opts);

    // draw the relaive cost graph
    var monthly_payment = kWh_cost * kWh_paid / 12;
    opts.yaxis.max = -rel_cost.yaxis.min;
    opts.yaxis.min = rel_cost.yaxis.min;
    //opts.bars.fillColor = { colors : [ '#ff0000', '#00FF00' ], start : 'top', end : 'bottom' };
    //opts.yaxis.max = monthly_payment;
    //opts.yaxis.min = -monthly_payment;
    opts.title = strings[(lang)][("relative_cost")];

    var monthlyPlusMinusGraph = document.getElementById("monthlyPlusMinusGraph");
    //console.log("Drawing plus minus chart...");
    console.log(objDump(opts, 4));
    console.log(objDump(total_cost, 4));
    var total_cost_graph = Flotr.draw(monthlyPlusMinusGraph, rel_cost, opts);

    // update table
    write_tr(myCounters[("total")], last_update - (3600 * 24), last_update, "last_day");
    write_tr(myCounters[("total")], last_update - (3600 * 24 * 7), last_update, "last_week");
    write_tr(myCounters[("total")], last_update - (3600 * 24 * 30), last_update, "last_month");

    return true;

}

// This is the callback function that,
// given a binary file object,
// verifies that it is a valid RRD archive
// and 
function update_fname_handler(bf) {
    //console.log("update_fname_handler running with file name: " + rrd_file);
    var i_rrd_data=undefined;
    try {
        i_rrd_data=new RRDFile(bf);            
    } catch(err) {
        alert("File at name "+rrd_file+" is not a valid RRD archive!\n"+err);
    }
    if (i_rrd_data!=undefined) {
        rrd_data = i_rrd_data;
        draw_consumption_graphs() && prepare_master_graph();
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

// write the table header
var oTh=document.getElementById("header");
oTh.innerHTML = 
    '<td>' +
        '<select id="select_rra" onchange="prepare_master_graph()">' +
            '<option value="0" selected/>' + strings[(lang)][("two_days")] + '</option>' +
            '<option value="3"/>' + strings[(lang)][("two_weeks")] + '</option>' +
            '<option value="6"/>' + strings[(lang)][("six_months")] + '</option>' +
            '<option value="9"/>' + strings[(lang)][("two_years")] + '</option>' +
        '</select>' +
    '</td>' +
    '<th>' + strings[(lang)][("average")] + '</th>' +
    '<th>' + strings[(lang)][("consumption")] + '</th>' +
    '<th>' + strings[(lang)][("cost")] + '</th>';

// vim: expandtab sw=4 ts=4
