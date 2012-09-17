var numLoaded = 0;
var graph, x, o;

var meters = {
    meter1: {
        title: 'Meter 1',
        loaded: false,
        src: '/smartmeter_meter1_watt.rrd',
        color: "#55ff55",
        data: []
    },
    meter2: {
        title: 'Meter 2',
        loaded: false,
        src: '/smartmeter_meter2_watt.rrd',
        color: "#eeee44",
        data: []
    },
    meter3: {
        title: 'Meter 3',
        loaded: false,
        src: '/smartmeter_meter3_watt.rrd',
        color: "#5555ff",
        data: []
    },
    lost: {
        title: 'Lost',
        loaded: false,
        src: '/smartmeter_lost_watt.rrd',
        color: "#ff5555",
        data: []
    },
/*
    total: {
        title: 'Total',
        loaded: false,
        src: '/smartmeter_total_watt.rrd',
        color: "#dddddd",
        data: []
    }
*/
};


       
var rrd_data=[];

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


function draw_graph(container) {
    var options = {
        xaxis : {
            mode : 'time', 
            labelsAngle : 45
        },
        yaxis : {
            autoscale : true,
        },
            selection : {
            mode : 'xy'
        },
        legend : {
            backgroundColor : '#D2E8FF' // Light blue 
        },
        bars : {
            show : true,
            stacked : true,
            horizontal : false,
            barWidth : 0.6,
            lineWidth : 1,
            shadowSize : 0
        },
        grid : {
            verticalLines : false,
            horizontalLines : true
        },
        HtmlText : false,
        title : 'Power Consumption',
    };

    // Draw graph with default options, overwriting with passed options
    function drawGraph (opts) {

        // Clone the options, so the 'options' variable always keeps intact.
        o = Flotr._.extend(Flotr._.clone(options), opts || {});

        // Return a new graph.
        return Flotr.draw(
            container,
            [
                { data : meters.meter1.data, label : 'Meter 1' },
                { data : meters.meter2.data, label : 'Meter 2' },
                { data : meters.meter3.data, label : 'Meter 3' },
                { data : meters.lost.data, label : 'Lost' },
                //{ data : meters.total.data, label : 'Total' },
            ],
            o
        );
    }

    graph = drawGraph();

    // flotr zoom handling
    Flotr.EventAdapter.observe(container, 'flotr:select', function(area){
        console.log("zoom");
        // Draw selected area
        graph = drawGraph({
            xaxis : { min : area.x1, max : area.x2, mode : 'time', labelsAngle : 45 },
            yaxis : { min : area.y1, max : area.y2, autoscale : true }
        });
    });

    // When graph is clicked, draw the graph with default area.
    Flotr.EventAdapter.observe(container, 'flotr:click', function () { graph = drawGraph(); });
}

        

// push rrd data into a timestamped array

function prepare_rrd_data(rrd_data, rraIdx) {
    if (!rraIdx) rraIdx = 0;
    // get RRA info
    var rra = rrd_data.getRRA(rraIdx);
    var rows = rra.getNrRows();
    var last_update = rrd_data.getLastUpdate();
    var ds_name = rrd_data.getDS(0).getName();
    var step = rra.getStep();
    var ts = (last_update - (step * rows)) * 1000;

    console.log("rra: " + rra);
    console.log("ds_name: " + ds_name);
    console.log("rows: " + rows);
    console.log("last_update: " + last_update);
    console.log("step: " + step);

    for (var i = 0; i < rows; i++) {
        var el = rra.getElFast(i,0);
        if (i >= rows - 4) console.log(ts + ": " + Math.round(el));
        if (isNaN(el)) el = 0;
        //meters[(ds_name)].data.push( Math.round(el) );
        meters[(ds_name)].data.push( [ ts, Math.round(el) ] );
        ts += (step * 1000);
    }

    meters[(ds_name)].loaded = true;
    numLoaded++;
    console.log("numLoaded: " + numLoaded);
    if (numLoaded == 4) {
        var mygraph = document.getElementById("mygraph");
        console.log("Drawing chart...");
        graph = draw_graph(mygraph);

    }

}



// This is the callback function that,
// given a binary file object,
// verifies that it is a valid RRD archive
// and 
function update_fname_handler(bf,name) {
    console.log("update_fname_handler running with file name: " + name);
    var i_rrd_data=undefined;
    try {
        i_rrd_data=new RRDFile(bf);            
    } catch(err) {
        alert("File at name "+name+" is not a valid RRD archive!\n"+err);
    }
    if (i_rrd_data!=undefined) {
        prepare_rrd_data(i_rrd_data);
    }
}

rrd_data[0] = rrd_data[1] = rrd_data[2] = rrd_data[3] = rrd_data[4] = undefined;


// load rrd files and give them to the preprocessor
$.each(meters, function(meter_name, meter) {
    console.log("Fetching " + meter.src);
    try {
        FetchBinaryURLAsync(meter.src,update_fname_handler,meter_name);
    } catch (err) {
        alert("Failed loading " + meter.src + "\n" + err);
    }
});



// html stuff..

// Remove the Javascript warning
document.getElementById("infotable").deleteRow(0);

// this function is invoked when the RRD file name changes
var base_el=document.getElementById("mygraph");
// First clean up anything in the element
while (base_el.lastChild!=null) base_el.removeChild(base_el.lastChild);

// vim: expandtab sw=4 ts=4
