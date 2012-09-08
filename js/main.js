var meters = {
    meter1: {
        name: 'Meter 1',
        loaded: false,
        src: 'data/data_meter1_24h.csv',
        data: []
    },
    meter2: {
        name: 'Meter 2',
        loaded: false,
        src: 'data/data_meter2_24h.csv',
        data: []
    },
    meter3: {
        name: 'Meter 3',
        loaded: false,
        src: 'data/data_meter3_24h.csv',
        data: []
    },
    lost: {
        name: 'Loss',
        loaded: false,
        src: 'data/data_lost_24h.csv',
        data: []
    },
    total: {
        name: 'Total',
        loaded: false,
        src: 'data/data_total_24h.csv',
        data: []
    }
};


(function($) {
    function readCSV(data) {
        function readRecord(line) {
            var items, timestamp, value;

            items = line.split(',');

            timestamp=parseInt(items[0]) * 1000 // highcharts wants ms;
            value=parseFloat(items[1]);

            if(isNaN(timestamp) || isNaN(value)) { throw 'NotANumber'; }

            return [ timestamp, value ];
        }

        var lines = data.split('\n'), records=[];

        lines.shift(); // remove first line with headings
        $.each(lines, function(lineNo, line) {
            try{
                records.push(readRecord(line));
            } catch(ex) { /* huh? */ }
        });

        return records;
    };

    // Split the lines

    $(function () {
        var seriesOptions = [],
            yAxisOptions = [],
            seriesCounter = 0,
            colors = Highcharts.getOptions().colors;

        $.each(meters, function(id, meter) {
            $.get(meter.src, function (csvData) {
                var data = readCSV(csvData);

                meter.loaded = true;
                meter.data = data;

                seriesOptions.push({
                    name:meter.name,
                    data:data
                });

                // As we're loading the data asynchronously, we don't know what order it will arrive. So
                // we keep a counter and create the chart when all the data is loaded.
                seriesCounter++;

                if (seriesCounter == 5) {
                    createChart();
                }
            });
        });

        // create the chart when all data is loaded
        function createChart() {
            Highcharts.setOptions({
                global: {
                    useUTC: false
                }
            });


            var chart = new Highcharts.StockChart({
                chart:{
                    renderTo:'container'
                },

                rangeSelector:{
                    selected:4
                },

                yAxis:{
                    labels:{
                        formatter: function () { return this.value + ' W'; }
                    },
                    plotLines:[{
                        value:0,
                        width:2,
                        color:'silver'
                    }]
                },

                tooltip:{
                    pointFormat:'<span style="color:{series.color}">{series.name}</span>: <b>{point.y}</b> ({point.change}%)<br/>',
                    valueDecimals:2
                },

                series:seriesOptions
            });
        }

    });
} (jQuery));
