define([
    'jquery',
    'underscore',
    'backbone',
    'moment',
    'model/step',
    'text!templates/model/fate.html',
    'flot',
    'flottime',
    'flotresize',
    'flotstack',
    'flotcrosshair',
    'flotpie'
], function($, _, Backbone, moment, StepModel, FateTemplate){
    var fateView = Backbone.View.extend({
        step: new StepModel(),
        className: 'fate',
        frame: 0,

        events: {
            'shown.bs.tab': 'renderGraphs'
        },

        initialize: function(){
            this.render();
        },

        render: function(){
            var substance = webgnome.model.get('spills').at(0).get('element_type').get('substance');
            var wind = webgnome.model.get('weatherers').findWhere({obj_type: 'gnome.weatherers.evaporation.Evaporation'}).get('wind');
            if(_.isUndefined(wind)){
                wind_speed = '';
            } else if (wind.get('timeseries').length === 1) {
                wind_speed = 'Constant ' + wind.get('timeseries')[0][1][0] + ' ' + wind.get('units');
            } else {
                wind_speed = 'Variable Speed';
            }

            var point_point;
            if(substance.pour_point_min_k === substance.pour_point_max_k){
                pour_point = substance.pour_point_min_k;
            } else if (substance.pour_point_min_k && substance.pour_point_max_k) {
                pour_point = substance.pour_point_min_k + ' - ' + substance.pour_point_max_k;
            } else {
                pour_point = substance.pour_point_min_k + substance.pour_point_max_k;
            }

            var water = webgnome.model.get('weatherers').findWhere({obj_type: 'gnome.weatherers.evaporation.Evaporation'}).get('water');
            var wave_height = 'Computed from wind';
            if(water.get('wave_height')){
                wave_height = water.get('wave_height') + ' ' + water.get('units').wave_height;
            } else if (water.get('fetch')) {
                wave_height = water.get('fetch') + ' ' + water.get('units').fetch;
            }

            var spills = webgnome.model.get('spills');
            var total_released = 0;
            var init_release = moment(spills.at(0).get('release').get('release_time')).unix();
            spills.forEach(_.bind(function(spill){
                var release_time = moment(spill.get('release').get('release_time')).unix();
                if(init_release > release_time){
                    init_release = release_time;
                }

                total_released += this.calcAmountReleased(spill, webgnome.model);
            }, this));
            total_released += ' ' + spills.at(0).get('units');

            var compiled = _.template(FateTemplate, {
                name: substance.name,
                api: substance.api,
                wind_speed: wind_speed,
                pour_point: pour_point,
                wave_height: wave_height,
                water_temp: water.get('temperature') + ' &deg;' + water.get('units').temperature,
                release_time: moment(init_release, 'X').format(webgnome.config.date_format.moment),
                total_released: total_released
            });
            this.$el.html(compiled);
            $.get(webgnome.config.api + '/rewind');
            this.renderLoop();
        },

        renderLoop: function(){
            if(_.isUndefined(this.dataset)){
                this.buildDataset(_.bind(function(dataset){
                    this.renderGraphs();
                }, this));
            } else {
                this.renderGraphs();
            }
        },

        renderGraphs: function(){
            // find active tab and render it's graph.
            var active = this.$('.active a').attr('href');
            if(active == '#budget-graph'){
                this.renderGraphOilBudget(this.dataset);
            } else if(active == '#budget-table') {
                this.renderTableOilBudget(this.dataset);
            }
        },

        renderGraphOilBudget: function(dataset){
            dataset = this.pruneDataset(dataset, ['avg_density', 'amount_released']);
            if(_.isUndefined(this.timelinePlot)){
                this.timelinePlot = $.plot('#budget-graph .timeline .chart', dataset, {
                    grid: {
                        borderWidth: 1,
                        borderColor: '#ddd',
                        hoverable: true,
                        autoHighlight: false
                    },
                    xaxis: {
                        mode: 'time',
                        timezone: 'browser'
                    },
                    series: {
                        stack: true,
                        group: true,
                        groupInterval: 1,
                        lines: {
                            show: true,
                            fill: true,
                            lineWidth: 1
                        },
                        shadowSize: 0
                    },
                    crosshair: {
                        mode: 'x',
                        color: '#999'
                    }
                });
                this.renderPiesTimeout = null;
                this.$('#budget-graph .timeline .chart').on('plothover', _.bind(this.timelineHover, this));

            } else {
                this.timelinePlot.setData(dataset);
                this.timelinePlot.setupGrid();
                this.timelinePlot.draw();
            }
        },

        renderTableOilBudget: function(dataset){
            dataset = this.pruneDataset(dataset, ['avg_density']);
            var table = this.$('#budget-table table');
            table.html('');
            m_date = moment(webgnome.model.get('start_time'));
            for (var row = 0; row < dataset[0].data.length; row++){

                var ts_date = moment(dataset[0].data[row][0]);
                var duration = moment.duration(ts_date.unix() - m_date.unix(), 'seconds');
                if(ts_date.minutes() === 0 && duration.asHours() < 7 ||
                    duration.asHours() <= 24 && ts_date.hours() % 3 === 0 && ts_date.minutes() === 0 ||
                    duration.asHours() > 24 && ts_date.hours() % 6 === 0 && ts_date.minutes() === 0){
                    var row_html = $('<tr></tr>');
                    if(row === 0){
                        row_html.append('<th>Date - Time</th>');
                    } else {
                        row_html.append('<td>' + ts_date.format(webgnome.config.date_format.moment) + '</td>');
                    }

                    for (var set in dataset){
                        if (row === 0) {
                            row_html.append('<th>' + dataset[set].label + '</th>');
                        } else {
                            row_html.append('<td>' + Math.round(dataset[set].data[row][1]) + '</td>');
                        }
                    }
                    table.append(row_html);
                }
            }
        },

        buildDataset: function(cb){
            if(this.frame < webgnome.model.get('num_time_steps')){
                this.step.fetch({
                    success: _.bind(function(){
                        if(this.step){
                            this.frame++;
                            this.buildDataset(cb);
                            this.formatDataset(this.step);
                            cb(this.dataset);
                        }
                    }, this)
                });
            }
        },

        formatDataset: function(step){
            var nominal = step.get('WeatheringOutput').nominal;
            var high = step.get('WeatheringOutput').high;
            var low = step.get('WeatheringOutput').low;

            if(_.isUndefined(this.dataset)){
                this.dataset = [];
                var titles = _.clone(nominal);
                var keys = Object.keys(titles);
                for(var type in keys){
                    this.dataset.push({
                        data: [],
                        high: [],
                        low: [],
                        label: this.formatLabel(keys[type]),
                        name: keys[type]
                    });
                }
            }

            var date = moment(step.get('WeatheringOutput').time_stamp);
            var units = webgnome.model.get('spills').at(0).get('units');

            for(var set in this.dataset){
                var value;
                if(['cubic meters', 'gal', 'bbl'].indexOf(units) !== -1){
                    // value = nucos.convert('Volume', 'kg', units, nominal[this.dataset[set].name]);
                } else {
                    // value = nucos.OilQuantityConvert().toVolume('');
                }

                low_value = low[this.dataset[set].name];
                this.dataset[set].low.push([date.unix() * 1000, low_value]);

                nominal_value = nominal[this.dataset[set].name];
                this.dataset[set].data.push([date.unix() * 1000, nominal_value]);

                high_value = high[this.dataset[set].name];
                this.dataset[set].high.push([date.unix() * 1000, high_value]);
            }
        },

        timelineHover: function(e, pos, item){
            if(!this.renderPiesTimeout){
                this.pos = pos;
                this.renderPiesTimeout =  setTimeout(_.bind(function(){
                    this.renderPies();
                }, this), 50);
            }
        },

        renderPies: function(){
            this.renderPiesTimeout = null;
            var i, j;
            var dataset = this.pruneDataset(this.dataset, ['avg_density', 'amount_released']);
            var pos = this.pos;
            var lowData = this.getPieData(pos, dataset, 'low');
            var nominalData = this.getPieData(pos, dataset, 'data');
            var highData = this.getPieData(pos, dataset, 'high');

            var chartOptions = {
                series: {
                    pie: {
                        show: true,
                        stroke: {
                            width: 0
                        },
                        label: {
                            formatter: _.bind(function(label, series){
                                var units = webgnome.model.get('spills').at(0).get('units');
                                return '<div><span style="background:' + series.color + ';"></span>' + label + '<br>' + this.formatNumber(Math.round(series.data[0][1])) + ' ' + units + ' (' + Math.round(series.percent) + '%)</div>';
                            }, this),
                            radius: 3/4
                        }
                    }
                },
                legend: {
                    show: false
                }
            };

            // possibly rewrite this part to update the data set and redraw the chart
            // might be more effecient than completely reinitalizing
            if(nominalData.length > 0){
                this.lowPlot = $.plot('.fate .minimum', lowData, chartOptions);
                this.nominalPlot = $.plot('.fate .mean', nominalData, chartOptions);
                this.highPlot = $.plot('.fate .maximum', highData, chartOptions);
            }
        },

        getPieData: function(pos, dataset, key){
            d = [];
            for (i = 0; i < dataset.length; ++i) {

                var series = dataset[i];

                for (j = 0; j < series[key].length; ++j) {
                    if (series[key][j][0] > pos.x) {
                        break;
                    }
                }

                var y,
                    p1 = series[key][j - 1],
                    p2 = series[key][j];

                if(!_.isUndefined(p1) && !_.isUndefined(p2)){
                    if (p1 === null) {
                        y = p2[1];
                    } else if (p2 === null) {
                        y = p1[1];
                    } else {
                        y = p1[1] + (p2[1] - p1[1]) * (pos.x - p1[0]) / (p2[0] - p1[0]);
                    }
                    
                    d.push({label: this.formatLabel(series.name), data: y});
                }
            }
            return d;
        },

        pruneDataset: function(dataset, leaves){
            dataset = _.filter(dataset, function(set){
                return leaves.indexOf(set.name) === -1;
            });
            return dataset;
        },

        formatLabel: function(label){
            return label.charAt(0).toUpperCase() + label.slice(1).replace(/_/g, ' ');
        },

        formatNumber: function(number){
            return number.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,').split('.')[0];
        },

        /**
         * Calculate the amount of oil released given the release start and end time in relation to the models end time.
         * @param  {Object} spill      Spill object
         * @param  {Object} model      gnome model object
         * @return {Integer}           Amount of oil released in the models time period, same unit as spill.
         */
        calcAmountReleased: function(spill, model){
            var amount = spill.get('amount');
            var release_start = moment(spill.get('release').get('release_time')).unix();
            var release_end = moment(spill.get('release').get('end_release_time')).unix();
            if(release_start === release_end){
                release_end += 2;
            }
            var model_end = moment(model.get('start_time')).add(model.get('duration'), 's').unix();

            // find the rate of the release per second.
            var release_duration = release_end - release_start;
            var release_per_second = amount / release_duration;

            // find the percentage of the release time that fits in the model 
            var release_run_time;
            if (model_end > release_end){
                release_run_time = release_duration;
            } else {
                var overlap = release_end - model_end;
                release_run_time = release_duration - overlap;
            }

            return release_run_time * release_per_second;
        },

        close: function(){
            this.step = null;
            Backbone.View.prototype.close.call(this);
        }
    });

    return fateView;
});