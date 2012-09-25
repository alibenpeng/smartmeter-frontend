var rrd_data, graph, x, o;
var rrd_file = "/sm/data/smartmeter.rrd";

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


var counters = {
    counter3: {
        label: 'Counter 3',
        loaded: false,
        color: "#5555ff",
        bars : cBarOpts,
        data: []
    },
    counter1: {
        label: 'Counter 1',
        loaded: false,
        color: "#55ff55",
        bars : cBarOpts,
        data: []
    },
    counter2: {
        label: 'Counter 2',
        loaded: false,
        color: "#eeee44",
        bars : cBarOpts,
        data: []
    },
    lost: {
        label: 'Lost',
        loaded: false,
        color: "#ff5555",
        bars : cBarOpts,
        data: []
    },
    total: {
        label: 'Total',
        loaded: false,
        color: "#dddddd",
        lines: {
            show: true,
            lineWidth : 1,
            stacked: false,
            fill: true,
            fillOpacity : 0.2,
        },
        data: []
    },
};


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
    var cost = parseFloat(getSeriesTotalConsumption(counters.total.data, min, max) / 1000 * 0.23);
    oTotCost.innerHTML = cost.toFixed(2) + " &euro;";
}

function draw_graph(container) {
    var options = {
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
            backgroundColor : '#D2E8FF' // Light blue 
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
        HtmlText : false,
        title : 'Power Consumption',
    };

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

        


// push rrd data into a timestamped array

function prepare_rrd_data() {

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
        cBarOpts.barWidth = step - (step/10);

        console.log("rra: " + rra);
        console.log("rows: " + rows);
        console.log("last_update: " + last_update);
        console.log("step: " + step);
        console.log("ds_name: " + ds_name);

        counters[(ds_name)].data = [];

        
        for (var i = 0; i < f_rows; i++) {
            var el = rra.getElFast(i,dsIdx);
            if (i >= rows - 10) console.log(ds_name + ": " + ts + ": " + el * 1800);
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
    for (var i = 0; i < f_rows; i++) {
        if (counters.total.data[(i)][1] === 0) {
            console.log("deleting datapoint " + counters.total.data[(i)][0]);
            counters.counter1.data.shift();
            counters.counter2.data.shift();
            counters.counter3.data.shift();
            counters.lost.data.shift();
            counters.total.data.shift();
        } else {
            break;
        }
    }
/*
*/


    // this function is invoked when the RRD file name changes
    //var base_el=document.getElementById("mygraph");
    // First clean up anything in the element
    //while (base_el.lastChild!=null) base_el.removeChild(base_el.lastChild);
    var mygraph = document.getElementById("mygraph");
    //console.log("Cleaning up canvas...");
    //while (mygraph.hasChildNodes()) mygraph.removeChild(mygraph.firstChild);
    console.log("Drawing chart...");
    draw_graph(mygraph);

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
        prepare_rrd_data();
    }
}


// load rrd file and give it to the preprocessor
console.log("Fetching " + rrd_file);
try {
    FetchBinaryURLAsync(rrd_file,update_fname_handler);
} catch (err) {
    alert("Failed loading " + rrd_file + "\n" + err);
}


// vim: expandtab sw=4 ts=4
