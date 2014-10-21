define([
    'jquery',
    'underscore',
    'backbone',
    'moment',
    'ol',
    'masonry',
    'text!templates/model/setup.html',
    'model/gnome',
    'model/environment/wind',
    'model/movers/wind',
    'views/form/wind',
    'text!templates/panel/wind.html',
    'model/map',
    'views/form/map',
    'text!templates/panel/map.html',
    'model/environment/water',
    'views/form/water',
    'text!templates/panel/water.html',
    'model/spill',
    'views/form/spill/type',
    'text!templates/panel/spill.html',
    'views/form/spill/continue',
    'views/form/spill/instant',
    'views/form/location',
    'views/default/map',
    'model/outputters/geojson',
    'model/outputters/weathering',
    'model/weatherers/evaporation',
    'jqueryDatetimepicker',
    'flot',
    'flottime',
    'flotresize',
    'flotdirection',
    'flottooltip'
], function($, _, Backbone, moment, ol, Masonry, AdiosSetupTemplate, GnomeModel,
    WindModel, WindMoverModel, WindForm, WindPanelTemplate,
    MapModel, MapForm, MapPanelTemplate,
    WaterModel, WaterForm, WaterPanelTemplate,
    SpillModel, SpillTypeForm, SpillPanelTemplate, SpillContinueView, SpillInstantView,
    LocationForm, olMapView, GeojsonOutputter, WeatheringOutputter, EvaporationModel){
    var adiosSetupView = Backbone.View.extend({
        className: 'page setup',

        events: {
            'click .icon': 'selectPrediction',
            'click .wind .add': 'clickWind',
            'click .water .add': 'clickWater',
            'click .spill .add': 'clickSpill',
            'click .spill .single': 'loadSpill',
            'click .spill .trash': 'deleteSpill',
            'click .location .add': 'clickLocation',
            'click .response .add': 'clickResponse',
            'blur input': 'updateModel',
            'click .eval': 'evalModel'
        },

        initialize: function(){
            if(webgnome.hasModel()){
                webgnome.model.on('sync', this.updateObjects, this);
                this.render();
            } else {
                webgnome.model = new GnomeModel();
                webgnome.model.setup(_.bind(function(){
                    webgnome.model.on('sync', this.updateObjects, this);
                    this.render();
                }, this));
            }
        },

        render: function(){
            var compiled = _.template(AdiosSetupTemplate, {
                start_time: moment(webgnome.model.get('start_time')).format(webgnome.config.date_format.moment),
                duration: webgnome.model.formatDuration(),
            });

            $('body').append(this.$el.append(compiled));

            
            this.initMason();

            setTimeout(_.bind(function(){
                var pred = localStorage.getItem('prediction');
                if(pred){
                    this.$('.' + pred).click();
                } else {
                    this.$('.fate').click();
                }
            }, this), 1);

            this.updateObjects();

            this.$('.date').datetimepicker({
                format: webgnome.config.date_format.datetimepicker
            });
        },

        initMason: function(){
            if(this.mason){
                this.mason.destroy();
            } else {
                $(window).on('resize', _.bind(this.initMason, this));
            }

            var container = this.$('.model-objects').get(0);
            this.mason = new Masonry(container, {
                columnWidth: function(colwidth){
                    return $('.model-objects .col-md-3:visible').outerWidth();
                }(),
                item: '.object',
            });
        },

        evalModel: function(e){
            e.preventDefault();
            webgnome.router.navigate('model', true);
        },

        updateModel: function(){
            var start_time = moment(this.$('#start_time').val(), webgnome.config.date_format.moment).format('YYYY-MM-DDTHH:mm:ss');
            webgnome.model.set('start_time', start_time);

            var days = this.$('#days').val();
            var hours = this.$('#hours').val();
            var duration = (((parseInt(days, 10) * 24) + parseInt(hours, 10)) * 60) * 60;
            webgnome.model.set('duration', duration);

            webgnome.model.save();
        },

        selectPrediction: function(e){
            var target;
            if(this.$(e.target).hasClass('icon')){
                target = this.$(e.target).attr('class').replace('icon', '').replace('selected', '').trim();
            } else {
                target = this.$(e.target).parent().attr('class').replace('icon', '').replace('selected', '').trim();
            }

            this.configureWeatherers(target);

            if (target == 'fate' && webgnome.model.get('map').get('obj_type') != 'gnome.map.GnomeMap'){
                if(!confirm('Switching to a Fate only model will remove any geospacial objects (map, currents, etc...).')){
                    return;
                }
                webgnome.model.resetLocation();
                webgnome.model.on('reset:location', webgnome.model.save);
            }

            this.$('.icon').removeClass('selected');

            if(this.$(e.target).hasClass('icon')){
                this.$(e.target).addClass('selected');
            } else {
                this.$(e.target).parent().addClass('selected');
            }

            localStorage.setItem('prediction', target);

            if (target == 'fate') {
                this.showFateObjects();
            } else if (target == 'trajectory') {
                this.showTrajectoryObjects();
            } else{
                this.showAllObjects();
            }
            setTimeout(_.bind(function(){
                this.mason.layout();
            }, this), 100);
        },

        showFateObjects: function(){
            this.$('.model-objects > div').hide().addClass('disabled');
            this.$('.wind').show().removeClass('disabled');
            this.$('.water').show().removeClass('disabled');
            this.$('.spill').show().removeClass('disabled');
        },

        showAllObjects: function(){
            this.$('.object').show().removeClass('disabled');
        },

        showTrajectoryObjects: function(){
            this.$('.model-objects > div').hide().addClass('disabled');
            this.$('.wind').show().removeClass('disabled');
            this.$('.spill').show().removeClass('disabled');
            this.$('.location').show().removeClass('disabled');
        },

        updateObjects: function(){
            this.updateWind();
            this.updateLocation();
            this.updateWater();
            this.updateSpill();

            $('.panel-heading .add').tooltip({
                title: function(){
                    var object = $(this).parents('.panel-heading').text().trim();

                    if($(this).parents('.panel').hasClass('complete')){
                        return 'Edit ' + object;
                    } else {
                        return 'Create ' + object;
                    }
                },
                delay: {
                    show: 500,
                    hide: 100
                },
                container: 'body'
            });

            $('.panel-heading .state').tooltip({
                title: function(){
                    var object = $(this).parents('.panel-heading').text().trim();

                    if($(this).parents('.panel').hasClass('complete')){
                        return object + ' requirement met';
                    } else {
                        return object + ' required';
                    }
                },
                container: 'body',
                delay: {
                    show: 500,
                    hide: 100
                }
            });
            

            this.mason.layout();
        },

        clickWind: function(){
            var wind = webgnome.model.get('environment').findWhere({obj_type: 'gnome.environment.wind.Wind'});
            if(_.isUndefined(wind) || wind.length === 0){
                wind = new WindModel();
            }

            var windForm = new WindForm(null, wind);
            windForm.on('hidden', windForm.close);
            windForm.on('save', function(){
                webgnome.model.get('environment').add(wind);
                var evaporation = webgnome.model.get('weatherers').findWhere({obj_type: 'gnome.weatherers.evaporation.Evaporation'});
                evaporation.set('wind', wind);
                evaporation.save();
                var mover = webgnome.model.get('movers').findWhere({obj_type: 'gnome.movers.wind_movers.WindMover'});
                if(_.isUndefined(mover) || mover.get('wind').get('id') != wind.get('id')){
                    var windMover = new WindMoverModel({wind: wind});
                    windMover.save(null, {
                        validate: false,
                        success: function(){
                            webgnome.model.get('movers').add(windMover);
                            webgnome.model.save();
                        }
                    });
                } else {
                    webgnome.model.save();
                }
            });
            windForm.render();
        },

        updateWind: function(){
            var wind = webgnome.model.get('environment').findWhere({obj_type: 'gnome.environment.wind.Wind'});
            if(!_.isUndefined(wind)){
                var compiled;
                this.$('.wind .panel').addClass('complete');
                if(wind.get('timeseries').length == 1){
                    compiled = _.template(WindPanelTemplate, {
                        speed: wind.get('timeseries')[0][1][0],
                        direction: wind.get('timeseries')[0][1][1],
                        units: wind.get('units')
                    });
                    this.$('.wind').removeClass('col-md-6').addClass('col-md-3');
                } else {
                    compiled = '<div class="axisLabel yaxisLabel">' + wind.get('units') + '</div><div class="chart"></div>';
                    var ts = wind.get('timeseries');
                    var data = [];

                    for (var entry in ts){
                        var date = moment(ts[entry][0], 'YYYY-MM-DDTHH:mm:ss').unix() * 1000;
                        data.push([parseInt(date, 10), parseInt(ts[entry][1][0], 10), parseInt(ts[entry][1][1], 10) - 180]);
                    }

                    var dataset = [{
                        data: data,
                        color: 'rgba(151,187,205,1)',
                        hoverable: true,
                        shadowSize: 0,
                        lines: {
                            show: false,
                            lineWidth: 2
                        },
                        direction: {
                            show: true,
                            openAngle: 40,
                            color: '#7a7a7a',
                            fillColor: '#7a7a7a',
                            arrawLength: 5
                        }
                    }];

                    this.$('.wind').removeClass('col-md-3').addClass('col-md-6');
                }
                this.$('.wind .panel-body').html(compiled);
                this.$('.wind .panel-body').show();

                if(!_.isUndefined(dataset)){
                    // set a time out to wait for the box to finish expanding or animating before drawing
                    this.windPlot = $.plot('.wind .chart', dataset, {
                        grid: {
                            borderWidth: 1,
                            borderColor: '#ddd'
                        },
                        xaxis: {
                            mode: 'time',
                            timezone: 'browser',
                            tickColor: '#ddd'
                        },
                        yaxis: {
                            tickColor: '#ddd'
                        }
                    });
                }
            } else {
                this.$('.wind').removeClass('col-md-6').addClass('col-md-3');
                this.$('.wind .panel').removeClass('complete');
                this.$('.wind .panel-body').hide().html('');
            }
        },

        clickWater: function(){
            var water = webgnome.model.get('environment').findWhere({obj_type: 'gnome.environment.environment.Water'});
            if(_.isUndefined(water) || water.length === 0){
                water = new WaterModel();
            }
            var waterForm = new WaterForm(null, water);
            waterForm.on('hidden', waterForm.close);
            waterForm.on('hidden', function(){webgnome.model.trigger('sync');});
            waterForm.on('save', function(){
                webgnome.model.get('environment').add(water);
                var evaporation = webgnome.model.get('weatherers').findWhere({obj_type: 'gnome.weatherers.evaporation.Evaporation'});
                evaporation.set('water', water);
                evaporation.save();
                webgnome.model.save();
            });
            waterForm.render();
        },

        updateWater: function(){
            var water = webgnome.model.get('environment').findWhere({obj_type: 'gnome.environment.environment.Water'});
            if (!_.isUndefined(water)){
                var compiled;
                this.$('.water .panel').addClass('complete');
                compiled = _.template(WaterPanelTemplate, {
                    temperature: water.get('temperature'),
                    salinity: water.get('salinity'),
                    sediment: water.get('sediment'),
                    wave_height: water.get('wave_height'),
                    fetch: water.get('fetch'),
                    units: water.get('units')
                });
                this.$('.water .panel-body').html(compiled);
                this.$('.water .panel-body').show();
            } else {
                this.$('.water .panel').removeClass('complete');
                this.$('.water .panel-body').hide().html('');
            }
        },

        clickSpill: function(){
            var spillTypeForm = new SpillTypeForm();
            spillTypeForm.render();
            spillTypeForm.on('hidden', spillTypeForm.close);
        },

        loadSpill: function(e){
            var spillId = e.currentTarget.attributes[1].value;
            var spill = webgnome.model.get('spills').get(spillId);
            if (spill.get('release').get('release_time') !== spill.get('release').get('end_release_time')){
                var spillView = new SpillContinueView(null, spill);
            } else {
                var spillView = new SpillInstantView(null, spill);
            }
            spillView.on('wizardclose', function(){
                spillView.on('hidden', spillView.close);
            });
            spillView.on('save', function(){
                webgnome.model.trigger('sync');
                setTimeout(_.bind(function(){
                    spillView.close();}, 
                this), 750);
            });
            spillView.render();
        },

        constructModelTimeSeries: function(){
            var start_time = moment(webgnome.model.get('start_time'), 'YYYY-MM-DDTHH:mm:ss').unix();
            var numOfTimeSteps = webgnome.model.get('num_time_steps');
            var timeStep = webgnome.model.get('time_step');
            var timeSeries = [];

            for (var i = 0; i < numOfTimeSteps; i++){
                if (i === 0){
                    timeSeries.push(start_time * 1000);
                } else {
                    var answer = moment(timeSeries[i - 1]).add(timeStep, 's').unix() * 1000;
                    timeSeries.push(answer);
                }
            }
            return timeSeries;
        },

        calculateSpillAmount: function(timeseries){
            var spills = webgnome.model.get('spills');
            var units = spills.models.length ? spills.at(0).get('units') : '';
            var timeStep = webgnome.model.get('time_step');
            var amountArray = [];
            var amount = 0;
            for (var i = 0; i < timeseries.length; i++){
                var upperBound = moment(timeseries[i]).unix();
                var lowerBound = upperBound - timeStep;
                for (var j = 0; j < spills.models.length; j++){
                    var releaseTime = moment(spills.models[j].get('release').get('release_time'), 'YYYY-MM-DDTHH:mm:ss').unix();
                    var endReleaseTime = moment(spills.models[j].get('release').get('end_release_time'), 'YYYY-MM-DDTHH:mm:ss').unix();
                    var timeDiff = endReleaseTime - releaseTime;
                    var spillUnits = spills.models[j].get('units');
                    if (releaseTime >= lowerBound && endReleaseTime < upperBound && timeDiff <= timeStep){
                        amount += spills.models[j].get('amount');
                    } else if (timeDiff > timeStep) {
                        var rateOfRelease = spills.models[j].get('amount') / timeDiff;
                        if (releaseTime >= lowerBound && endReleaseTime >= upperBound && releaseTime <= upperBound){
                            var head = (upperBound - releaseTime);
                            amount += rateOfRelease * head;
                        } else if (releaseTime <= lowerBound && endReleaseTime >= upperBound){
                            amount += rateOfRelease * timeStep;
                        } else if (releaseTime <= lowerBound && endReleaseTime <= upperBound && endReleaseTime >= lowerBound){
                            var tail = endReleaseTime - lowerBound;
                            amount += rateOfRelease * tail;
                        }
                    }
                }
                amountArray.push(amount);
            }
            return amountArray;

        },

        updateSpill: function(){
            var spill = webgnome.model.get('spills');

            this.$('.panel-body').html();
            var timeSeries = this.constructModelTimeSeries();
            var spillArray = this.calculateSpillAmount(timeSeries);
            if(spill.models.length > 0){
                var compiled;
                this.$('.spill .panel').addClass('complete');
                compiled = _.template(SpillPanelTemplate, {spills: spill.models});
                var data = [];

                for (var i = 0; i < timeSeries.length; i++){
                    var date = timeSeries[i];
                    var amount = spillArray[i];
                    data.push([parseInt(date, 10), parseFloat(amount)]);
                }
                
                var dataset = [
                    {
                        data: data,
                        color: 'rgba(100,149,237,1)',
                        hoverable: true,
                        shadowSize: 0,
                        lines: {
                            show: true,
                            lineWidth: 2,
                            fill: true
                        },
                        points: {
                            show: false
                        }
                    }
                ];

                this.$('.spill').removeClass('col-md-3').addClass('col-md-6');
                this.$('.spill .panel-body').html(compiled);
                this.$('.spill .panel-body').show();

                if(!_.isUndefined(dataset)){
                    this.spillPlot = $.plot('.spill .chart', dataset, {
                        grid: {
                            borderWidth: 1,
                            borderColor: '#ddd',
                            hoverable: true
                        },
                        xaxis: {
                            mode: 'time',
                            timezone: 'browser'
                        },
                        tooltip: true,
                            tooltipOpts: {
                                content: function(label, x, y, flotItem){ return "Time: " + moment(x).calendar() + "<br>Amount: " + y ;}
                            },
                            shifts: {
                                x: -30,
                                y: -50
                            }
                    });
                }
                
            } else {
                this.$('.spill .panel').removeClass('complete');
                this.$('.spill .panel-body').hide().html('');
                this.$('.spill').removeClass('col-md-6').addClass('col-md-3');
            }
            
        },

        deleteSpill: function(e){
            e.preventDefault();
            e.stopPropagation();
            var id = e.target.parentNode.dataset.id;
            webgnome.model.get('spills').remove(id);
            webgnome.model.save({
                success: _.bind(function(){
                    this.updateSpill();
                }, this)
            });
        },

        clickLocation: function(){
            var locationForm = new LocationForm();
            locationForm.on('loaded', _.bind(function(){
                locationForm.close();
                this.updateObjects();
                this.configureWeatherers(this.$('.icon.selected').attr('class').replace('icon', '').replace('selected', '').trim());
                webgnome.model.on('sync', this.updateObjects, this);
            }, this));
            locationForm.render();
            webgnome.model.off('sync', this.updateObjects, this);

        },

        updateLocation: function(){
            var map = webgnome.model.get('map');
            if(map && map.get('obj_type') != 'gnome.map.GnomeMap'){
                this.$('.location .panel').addClass('complete');
                map.getGeoJSON(_.bind(function(geojson){
                    this.$('.location .panel-body').show().html('<div class="map" id="mini-locmap"></div>');

                    var shorelineSource = new ol.source.GeoJSON({
                        projection: 'EPSG:3857',
                        object: geojson
                    });

                    var shorelineLayer = new ol.layer.Vector({
                        name: 'modelmap',
                        source: shorelineSource,
                        style: new ol.style.Style({
                            fill: new ol.style.Fill({
                                color: [228, 195, 140, 0.6]
                            }),
                            stroke: new ol.style.Stroke({
                                color: [228, 195, 140, 0.75],
                                width: 1
                            })
                        })
                    });
                    var locationMap = new olMapView({
                        id: 'mini-locmap',
                        controls: [],
                        layers: [
                            new ol.layer.Tile({
                                source: new ol.source.MapQuest({layer: 'osm'})
                            }),
                            shorelineLayer
                        ]
                    });
                    
                    locationMap.render();
                    var extent = shorelineSource.getExtent();
                    locationMap.map.getView().fitExtent(extent, locationMap.map.getSize());
                }, this));
            } else {
                this.$('.location .panel').removeClass('complete');
                this.$('.location .panel-body').hide().html('');
            }
        },

        configureWeatherers: function(prediction){
            if (prediction == 'fate' || prediction == 'both'){
                // turn on weatherers
                webgnome.model.get('weatherers').forEach(function(weatherer, index, list){
                    weatherer.set('on', true);
                    weatherer.save();
                });
            } else if (prediction == 'trajectory') {
                // turn off weatherers
                webgnome.model.get('weatherers').forEach(function(weatherer, index, list){
                    weatherer.set('on', false);
                    weatherer.save();
                });
            }
        },

        close: function(){
            $('.xdsoft_datetimepicker').remove();
            if(!_.isUndefined(this.windPlot)){
                this.windPlot.shutdown();
            }
            if(webgnome.model){
                webgnome.model.off('sync', this.updateObjects, this);
            }
            Backbone.View.prototype.close.call(this);
        }
    });

    return adiosSetupView;
});