var meters = {
    meter1: {
        name: 'Meter 1',
        loaded: false,
        src: 'data/data_meter1_24h.csv',
        zIndex: 2,
        color: "#45ff55",
        data: []
    },
    meter2: {
        name: 'Meter 2',
        loaded: false,
        src: 'data/data_meter2_24h.csv',
        zIndex: 2,
        color: "#eeee44",
        data: []
    },
    meter3: {
        name: 'Meter 3',
        loaded: false,
        src: 'data/data_meter3_24h.csv',
        zIndex: 2,
        color: "#5555ff",
        data: []
    },
    lost: {
        name: 'Lost',
        loaded: false,
        src: 'data/data_lost_24h.csv',
        zIndex: 5,
        color: "#ff5555",
        data: []
    },
    total: {
        name: 'Total',
        loaded: false,
        src: 'data/data_total_24h.csv',
        type: "areaspline",
        zIndex: 1,
        color: "#dddddd",
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

                seriesOptions.push(meter);

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
                    renderTo:'container',
                    type:'column',
                    zoomType: 'x',
                    events: {
                        'selection' : function(ev) {
                            var min=ev.xAxis[0].min,  max=ev.xAxis[0].max;

                            ev.preventDefault();

                            var duration = (max - min)/1000, // both milliseconds
                                avg = getSeriesAverage(meters.total.data, min, max).toFixed(0),
                                total = getSeriesTotalConsumption(meters.total.data, min, max).toFixed(0)/1000;


                            $.noticeAdd({
                                text: duration.toFixed(0) + 's selected<br>'
                                    + 'Average for selected period: <b>'+avg+' W</b><br>'
                                    + 'Total consumtion: <b> '+total+' kWh (<em>'+(23*total/100).toFixed(2)+'€</em>)</b>',
                                stay: false
                            });

                            function regionMap(seriesData, from, to, fn) {
                                var res=[], rec;

                                for(var i=0,n=seriesData.length; i<n; i++) {
                                    rec = seriesData[i];

                                    if(rec[0] < from || rec[0] > to) { continue; }

                                    res.push(fn(rec));
                                }

                                return res;
                            }

                            function __getTime(rec) { return rec[0]; }
                            function __getValue(rec) { return rec[1]; }

                            function getSeriesAverage(seriesData, from, to) {
                                var values = regionMap(seriesData, from, to, function(rec) { return rec[1]; }),
                                    sum = values.reduce(function(previousValue, currentValue) {
                                        return previousValue+currentValue;
                                    });
                                return sum/values.length;
                            }

                            function getSeriesTotalConsumption(seriesData, from, to) {
                                var duration = (to - from)/1000; // both milliseconds
                                var avg=getSeriesAverage(seriesData, from, to);

                                return avg*duration / 3600;
                            }
                        }
                    }
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
                    pointFormat: '<span style="color:{series.color}">{series.name}</span>: <b>{point.y} W</b><br>',
                    yDecimals: 0
                },

                plotOptions: {
                    column: {stacking: 'normal'},
                    areaspline: {
                        pointStart: 1940,
                        marker: {
                            enabled: false,
                            symbol: 'circle',
                            radius: 2,
                            states: {
                                hover: {
                                    enabled: true
                                }
                            }
                        }
                    },
                    spline: {
                        pointStart: 1940,
                        marker: {
                            enabled: false,
                            symbol: 'circle',
                            radius: 2,
                            states: {
                                hover: {
                                    enabled: true
                                }
                            }
                        }
                    }
                },

                series:seriesOptions
            });
        }

    });
} (jQuery));
// vim: expandtab sw=4 ts=4
