(function($) {
    var csv = {
        readData: function(data) {
            function readRecord(line) {
                var items = line.split(','), ret={};

                return [
                    items[0].replace(":", "") * 1000, // timestamp
                    parseFloat(items[1]) // value
                ];
            }

            // Split the lines
            var lines = data.split('\n'), records=[];

            lines.shift(); // remove first line with headings

            $.each(lines, function(lineNo, line) {
                records.push(readRecord(line));
            });

            return records;
        }
    };

    var meters = {
        meter1: {
            name: 'Stromzähler 1',
            loaded: false,
            src: 'data/data_meter1_24h.csv',
            data: []
        },
        meter2: {
            name: 'Stromzähler 2',
            loaded: false,
            src: 'data/data_meter2_24h.csv',
            data: []
        },
        meter3: {
            name: 'Stromzähler 3',
            loaded: false,
            src: 'data/data_meter3_24h.csv',
            data: []
        },
        lost: {
            name: 'Packet loss',
            loaded: false,
            src: 'data/data_lost_24h.csv',
            data: []
        },
        total: {
            name: 'Gesamt',
            loaded: false,
            src: 'data/data_total_24h.csv',
            data: []
        }
    };
    // Split the lines

    $(function () {
        var seriesOptions = [],
            yAxisOptions = [],
            seriesCounter = 0,
            colors = Highcharts.getOptions().colors;

        $.each(meters, function(id, meter) {
            $.get(meter.src, function (csvData) {
                var data = csv.readData(csvData);

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

//        $.each(names, function (i, name) {
//            $.getJSON('http://www.highcharts.com/samples/data/jsonp.php?filename=' + name.toLowerCase() + '-c.json&callback=?', function (data) {
//
//                seriesOptions[i] = {
//                    name:name,
//                    data:data
//                };
//
//                // As we're loading the data asynchronously, we don't know what order it will arrive. So
//                // we keep a counter and create the chart when all the data is loaded.
//                seriesCounter++;
//
//                if (seriesCounter == names.length) {
//                    createChart();
//                }
//            });
//        });


        // create the chart when all data is loaded
        function createChart() {
            var chart = new Highcharts.StockChart({
                chart:{
                    renderTo:'container'
                },

                rangeSelector:{
                    selected:4
                },

                yAxis:{
                    labels:{
                        formatter:function () {
                            return (this.value > 0 ? '+' : '') + this.value + '%';
                        }
                    },
                    plotLines:[
                        {
                            value:0,
                            width:2,
                            color:'silver'
                        }
                    ]
                },

                plotOptions:{
                    series:{
                        compare:'percent'
                    }
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
