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
            //lineWidth : 1,
            stacked: false,
            fill: true,
        },
        data: []
    }
/*
*/
};


function yTickFormatter(val, axisOpts) {
    if (val < 1000) {
        return val + ' W';
    } else {
        return val / 1000 + ' kW';
    }
}
       

// draw a table with all rrd values
function table_update() {
    ds_idx=0;
    rra_idx=9;
    clm_nr=20;

    // cleanup
    // rows may have been added during previous updates
    var oTable=document.getElementById("infotable");
    while (oTable.rows.length>=4) {
        oTable.deleteRow(3);
    } 

    $.each(rrd_data, function(idx, i_rrd_data) {
        // Generic header info
        oRow=oTable.insertRow(-1);
        var oCell=oRow.insertCell(-1);
        oCell.innerHTML=i_rrd_data.getDS(ds_idx).getName();;
        oCell=oRow.insertCell(-1);
        oCell.innerHTML=rra_idx;

        // get RRA info
        var rra=i_rrd_data.getRRA(rra_idx);
        var rows=rra.getNrRows();

        var oRow=undefined;
        for (var i=0; i<rows;i++) {
            if ((i%clm_nr)==0) {
                // One new row every clm_nr
                oRow=oTable.insertRow(-1);
                var oCell=oRow.insertCell(-1);
                oCell.innerHTML=i;
            }
            var oCell=oRow.insertCell(-1);
            oCell.colSpan=20/clm_nr;
            var el=rra.getElFast(i,ds_idx);
            if (el!=undefined) {
                oCell.innerHTML=Math.round(rra.getElFast(i,ds_idx));
            } else {
                oCell.innerHTML="-";
            }
        }
    });
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

        oAvgCell=document.getElementById("sel_avg");
        oAvgCell.innerHTML = "average: " + getSeriesAverage(counters.counter3.data, o.xaxis.min, o.xaxis.max);

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
            yaxis : { min : area.y1, max : area.y2, autoscale : true },
            bars : cBarOpts,
        });
    });

    // When graph is clicked, draw the graph with default area.
    Flotr.EventAdapter.observe(container, 'flotr:click', function () { graph = drawGraph(); });
}

        


// push rrd data into a timestamped array

function prepare_rrd_data() {

    oSelRRA=document.getElementById("select_rra");
    rraIdx=oSelRRA.options[oSelRRA.selectedIndex].value;
    if (!rraIdx) rraIdx = 9;
    console.log("Selected RRA: " + rraIdx);

    for (var dsIdx = 0; dsIdx < 4; dsIdx++) {
        // get RRA info
        var rra = rrd_data.getRRA(rraIdx);
        var ds_name = rrd_data.getDS(dsIdx).getName();
        var rows = rra.getNrRows();
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

        var firstValueSeen = false;
        
        for (var i = 0; i < rows; i++) {
            var el = rra.getElFast(i,dsIdx);
            if (i >= rows - 10) console.log(ds_name + ": " + ts + ": " + el * 1800);
            if (!isNaN(el)) firstValueSeen = true;
            if (isNaN(el)) el = 0;
            if (firstValueSeen) counters[(ds_name)].data.push( [ ts, el * 1800 ] );
            ts += (step);
        }
    }


    // this function is invoked when the RRD file name changes
    //var base_el=document.getElementById("mygraph");
    // First clean up anything in the element
    //while (base_el.lastChild!=null) base_el.removeChild(base_el.lastChild);
    var mygraph = document.getElementById("mygraph");
    console.log("Cleaning up canvas...");
    while (mygraph.hasChildNodes()) mygraph.removeChild(mygraph.firstChild);
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



// html stuff..

// Remove the Javascript warning
document.getElementById("infotable").deleteRow(0);

// vim: expandtab sw=4 ts=4
