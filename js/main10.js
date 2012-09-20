var numLoaded = 0;

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
    total: {
        title: 'Total',
        loaded: false,
        src: '/smartmeter_total_watt.rrd',
        color: "#dddddd",
        data: []
    }
};



var rrd_data=[];

// This function updates the Web Page with the data from the RRD archive header
// when a new file is selected
function update_fname() {
    // Finally, update the file name and enable the update button
    //document.getElementById("fname").firstChild.data="Group "+fname_group;

    // the rrdFlot object creates and handles the graph
    var f = new rrdFlotMatrix("mygraph", // placeholder
        [
            ['meter1',rrd_data[0]],
            ['meter2',rrd_data[1]],
            ['meter3',rrd_data[2]],
            ['lost',rrd_data[3]],
            ['total',rrd_data[4]],
        ], // data
        null, // ds_list
        {
            legend: {noColumns: 5},
            stack: false,
            lines: { show: true, steps: true},
            tooltip: true,
            tooltipOpts: { content: "<h4>%s</h4> %x.6:<br>%y.2 W" },
        }, // graph_options
        meters // rrd_graph_options
    );
}

// This is the callback function that,
// given a binary file object,
// verifies that it is a valid RRD archive
// and 
function update_fname_handler(bf,idx) {
    console.log("update_fname_handler running with file idx: " + idx);
    var i_rrd_data=undefined;
    try {
        i_rrd_data=new RRDFile(bf);            
    } catch(err) {
        alert("File at idx "+idx+" is not a valid RRD archive!\n"+err);
    }
    if (i_rrd_data!=undefined) {
        rrd_data[idx]=i_rrd_data;
    }
	numLoaded++;
	console.log("numLoaded: " + numLoaded);
	if (numLoaded == 5) {
    //if ((rrd_data[0]!=undefined) && (rrd_data[1]!=undefined) && (rrd_data[2]!=undefined)) {
        console.log("calling update_fname()");
        element_update();
        update_fname();
    }
}

function element_update() {
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

// Remove the Javascript warning
document.getElementById("infotable").deleteRow(0);

// this function is invoked when the RRD file name changes
var base_el=document.getElementById("mygraph");
// First clean up anything in the element
while (base_el.lastChild!=null) base_el.removeChild(base_el.lastChild);

rrd_data[0] = rrd_data[1] = rrd_data[2] = rrd_data[3] = rrd_data[4] = undefined;

var meterIdx = 0;
$.each(meters, function(meter_name, meter) {
    console.log("Fetching " + meter.src);
    try {
        FetchBinaryURLAsync(meter.src,update_fname_handler,meterIdx++);
    } catch (err) {
        alert("Failed loading " + meter.src + "\n" + err);
    }
});

// vim: expandtab sw=4 ts=4
