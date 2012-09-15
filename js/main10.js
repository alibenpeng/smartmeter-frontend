var numLoaded = 0;

var meters = {
    meter1: {
        title: 'Meter 1',
        loaded: false,
        src: 'smartmeter_meter1_watt.rrd',
        series: {
            lines: {show: false},
            bars: {show: true, barWidth: 0.6},
        },
        zIndex: 2,
        color: "#55ff55",
        data: []
    },
    meter2: {
        title: 'Meter 2',
        loaded: false,
        src: 'smartmeter_meter2_watt.rrd',
        series: {
            lines: {show: false},
            bars: {show: true, barWidth: 0.6},
        },
        zIndex: 2,
        color: "#eeee44",
        data: []
    },
    meter3: {
        title: 'Meter 3',
        loaded: false,
        src: 'smartmeter_meter3_watt.rrd',
        series: {
            lines: {show: false},
            bars: {show: true, barWidth: 0.6},
        },
        zIndex: 2,
        color: "#5555ff",
        data: []
    },
    lost: {
        title: 'Lost',
        loaded: false,
        src: 'smartmeter_lost_watt.rrd',
        series: {
            lines: {show: false},
            bars: {show: true, barWidth: 0.6},
        },
        zIndex: 5,
        color: "#ff5555",
        data: []
    },
    total: {
        title: 'Total',
        loaded: false,
        src: 'smartmeter_total_watt.rrd',
        type: "areaspline",
        series: {
            lines: {show: false},
            bars: {show: true, barWidth: 0.6},
        },
        zIndex: 1,
        color: "#dddddd",
        data: []
    }
};



rrd_data=[];

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
            stack: true,
            lines: { show: false, steps: false},
            bars: { show: true, barWidth: 0.6 },
            tooltip: true,
            tooltipOpts: { content: "<h4>%s</h4> %x.6:<br>%y.2 W" },
            series: {
                lines: {show: false},
                bars: {show: true, barWidth: 0.6},
            },
        }, // graph_options
        meters // rrd_graph_options
    );
}

// This is the callback function that,
// given a binary file object,
// verifies that it is a valid RRD archive
// and performs the update of the Web page
function update_fname_handler(bf,idx) {
    console.log("update_fname_handler running with file idx: " + idx);
    var i_rrd_data=undefined;
    try {
        var i_rrd_data=new RRDFile(bf);            
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
        update_fname();
    }
}

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
