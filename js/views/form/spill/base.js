define([
	'jquery',
	'underscore',
	'backbone',
	'views/modal/form',
	'views/form/oil/library',
	'views/default/map',
    'text!templates/form/spill/oilInfo.html',
	'nucos',
	'ol',
	'moment',
    'sweetalert',
	'jqueryDatetimepicker'
], function($, _, Backbone, FormModal, OilLibraryView, SpillMapView, OilInfoTemplate, nucos, ol, moment, swal){
	var baseSpillForm = FormModal.extend({

        buttons: '<button type="button" class="cancel" data-dismiss="modal">Cancel</button><button type="button" class="delete">Delete</button><button type="button" class="save">Save</button>',

		mapShown: false,
        
        spillEndSet: function(){
            var startPosition = this.model.get('release').get('start_position');
            var endPosition = this.model.get('release').get('end_position');
            if ((startPosition[0] !== endPosition[0] && startPosition[1] !== endPosition[1])){
                return false;
            }
            return true;
        },

		events: function(){
			return _.defaults({
				'click .oilSelect': 'elementSelect',
                'click .oilName': 'elementSelect',
				'click .locationSelect': 'locationSelect',
				'click #spill-form-map': 'update',
                'contextmenu #spill-form-map': 'update',
				'blur .geo-info': 'manualMapInput',
                'click .delete': 'deleteSpill'
			}, FormModal.prototype.events);
		},

		initialize: function(options, spillModel){
			FormModal.prototype.initialize.call(this, options);
			if (!_.isUndefined(options.model)){
				this.model = options.model;
			} else {
				this.model = spillModel;
			}
            this.model.fetch();
            this.showGeo = (localStorage.getItem('prediction')) === 'fate' ? false : true;
            this.showGeo = ((!_.isUndefined(options.showMap)) ? options.showMap : false) || this.showGeo;
            if(this.model.get('name') == 'Spill'){
                this.model.set('name', 'Spill #' + parseInt(webgnome.model.get('spills').length + 1, 10));
            }
		},

		render: function(options){
			var geoCoords_start = this.model.get('release').get('start_position');
            var geoCoords_end = this.model.get('release').get('end_position');
            var units = this.model.get('units');
            FormModal.prototype.render.call(this, options);

            this.$('#units option[value="' + units + '"]').attr('selected', 'selected');
            var map = webgnome.model.get('map').get('obj_type');
			if (geoCoords_start[0] === 0 && geoCoords_start[1] === 0 && map === 'gnome.map.GnomeMap') {
				this.$('.map').hide();
			} else {
				this.locationSelect();
			}
			this.$('#datetime').datetimepicker({
				format: 'Y/n/j G:i',
			});
		},

        renderOilInfo: function(){
            var oil = this.model.get('element_type').get('substance') ? this.model.get('element_type').get('substance') : {};
            this.$('#oilInfo').html('');
            this.$('#oilInfo').html(_.template(OilInfoTemplate, {oil: oil}));
        },

		update: function(){
            var oilName = this.model.get('element_type').get('substance').get('name');
            this.$('.oilName').val(oilName);

			if(!this.model.isValid()){
				this.error('Error!', this.model.validationError);
			} else {
				this.clearError();
			}
		},

		elementSelect: function(){
            this.hide();
			var oilLibraryView = new OilLibraryView(this.model.get('element_type'));
			oilLibraryView.render();
			oilLibraryView.on('save', _.bind(this.show, this));
			oilLibraryView.on('hidden', _.bind(this.show, this));
		},

        show: function(){
            this.update();
            FormModal.prototype.show.call(this);
        },

        mapRender: function(){
            if (!this.mapShown){
                this.$('.map').show();
                this.source = new ol.source.Vector();
                var draw = new ol.interaction.Draw({
                    source: this.source,
                    type: 'LineString'
                });
                this.layer = new ol.layer.Vector({
                    source: this.source
                });
                this.spillMapView = new SpillMapView({
                    id: 'spill-form-map',
                    zoom: 2,
                    center: [-128.6, 42.7],
                    layers: [
                        new ol.layer.Tile({
                            source: new ol.source.MapQuest({layer: 'osm'})
                        }),
                        this.layer
                    ],
                    interactions: ol.interaction.defaults().extend([draw])
                });
                this.spillMapView.render();
                this.mapShown = true;
                draw.on('drawend', _.bind(function(e){
                    var feature = this.source.forEachFeature(_.bind(function(feature){
                        if (this.source.getFeatures().length > 1){
                            return feature;
                        }
                    }, this));
                    if (feature){
                        this.source.removeFeature(feature);
                    }
                    var coordsArray = e.feature.getGeometry().getCoordinates();
                    for (var i = 0; i < coordsArray.length; i++){
                        coordsArray[i] = new ol.proj.transform(coordsArray[i], 'EPSG:3857', 'EPSG:4326');
                    }
                    var startPoint = coordsArray[0];
                    var endPoint = coordsArray[coordsArray.length - 1];
                    this.model.get('release').set('start_position', startPoint);
                    this.model.get('release').set('end_position', endPoint);
                    this.$('#start-lat').val(startPoint[1]);
                    this.$('#start-lon').val(startPoint[0]);
                    this.$('#end-lat').val(endPoint[1]);
                    this.$('#end-lon').val(endPoint[0]);
                    if ((startPoint[0] === endPoint[0]) && (startPoint[1] === endPoint[1])){
                        var feature = this.source.forEachFeature(_.bind(function(feature){
                                return feature;
                        }, this));
                        this.source.removeFeature(feature);
                        var point = startPoint;
                        point = ol.proj.transform(point, 'EPSG:4326', 'EPSG:3857');
                        var feature = new ol.Feature(new ol.geom.Point(point));
                        feature.setStyle( new ol.style.Style({
                            image: new ol.style.Icon({
                                anchor: [0.5, 1.0],
                                src: '/img/map-pin.png',
                                size: [32, 40]
                            })
                        }));
                        this.source.addFeature(feature);
                    }
                }, this));
                setTimeout(_.bind(function(){
                    this.spillMapView.map.updateSize();
                }, this), 250);
                var startPosition = _.initial(this.model.get('release').get('start_position'));
                if (startPosition[0] !== 0 && startPosition[1] !== 0){
                    var startPoint = this.convertCoords(this.model.get('release').get('start_position'));
                    var endPoint = this.convertCoords(this.model.get('release').get('end_position'));
                    startPoint = ol.proj.transform(startPoint, 'EPSG:4326', 'EPSG:3857');
                    endPoint = ol.proj.transform(endPoint, 'EPSG:4326', 'EPSG:3857');
                    var pointsArray = [startPoint, endPoint];
                    var feature = new ol.Feature(new ol.geom.LineString(pointsArray));
                    feature.set('name', 'start');
                    this.source.addFeature(feature);
                    
                    this.spillMapView.map.getView().setCenter(startPoint);
                    this.spillMapView.map.getView().setZoom(15);
                }
                var start = this.model.get('release').get('start_position');
                var end = this.model.get('release').get('end_position');
                if ((start[0] === end[0]) && (start[1] === end[1])){
                    var feature = this.source.forEachFeature(_.bind(function(feature){
                            return feature;
                    }, this));
                    this.source.removeFeature(feature);
                    var point = _.initial(start);
                    point = ol.proj.transform(point, 'EPSG:4326', 'EPSG:3857');
                    var feature = new ol.Feature(new ol.geom.Point(point));
                    feature.setStyle( new ol.style.Style({
                            image: new ol.style.Icon({
                                anchor: [0.5, 1.0],
                                src: '/img/map-pin.png',
                                size: [32, 40]
                            })
                        }));
                    this.source.addFeature(feature);
                }
            }
        },

		locationSelect: function(){
            this.mapRender();
            var map = webgnome.model.get('map');
            if (!_.isUndefined(map) && map.get('obj_type') !== 'gnome.map.GnomeMap'){
                map.getGeoJSON(_.bind(function(data){
                    this.shorelineSource = new ol.source.GeoJSON({
                        object: data,
                        projection: 'EPSG:3857'
                    });
                    var extent = this.shorelineSource.getExtent();
                    this.shorelineLayer = new ol.layer.Vector({
                        source: this.shorelineSource,
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
                    if(this.spillMapView.map){
                        var startPosition = _.initial(this.model.get('release').get('start_position'));
                        this.spillMapView.map.getLayers().insertAt(1, this.shorelineLayer);
                        this.spillMapView.map.getView().fitExtent(extent, this.spillMapView.map.getSize());
                    }

                }, this));
            }
		},

        convertCoords: function(coordsArray){
            coordsArray = _.clone(coordsArray);
            coordsArray.pop();
            return coordsArray;
        },

        manualMapInput: function(){
            this.mapRender();
            var feature = this.source.forEachFeature(_.bind(function(feature){
                        return feature;
                    }, this));
            if (feature){
                this.source.removeFeature(feature);
            }
            var startCoords = this.coordsParse([this.$('#start-lon').val(), this.$('#start-lat').val()]);
            var endCoords = this.coordsParse([this.$('#end-lon').val(), this.$('#end-lat').val()]);
            startCoords = ol.proj.transform(startCoords, 'EPSG:4326', 'EPSG:3857');
            endCoords = ol.proj.transform(endCoords, 'EPSG:4326', 'EPSG:3857');
            var coordsArray = [startCoords, endCoords];
            feature = new ol.Feature(new ol.geom.LineString(coordsArray));
            var startPosition = [startCoords[0], startCoords[1], 0];
            var endPosition = [endCoords[0], endCoords[1], 0];
            this.model.get('release').set('start_position', startPosition);
            this.model.get('release').set('end_position', endPosition);
            this.source.addFeature(feature);
            this.spillMapView.map.getView().setCenter(startCoords);
            this.spillMapView.map.getView().setZoom(15);
        },

        coordsParse: function(coordsArray){
            for (var i = 0; i < coordsArray.length; i++){
                if (coordsArray[i].indexOf('°') !== -1){
                    coordsArray[i] = nucos.sexagesimal2decimal(coordsArray[i]);
                }
                coordsArray[i] = parseFloat(coordsArray[i]);
            }
            return coordsArray;
        },

        deleteSpill: function(){
            var id = this.model.get('id');
            var spill = webgnome.model.get('spills').get(id);
            swal({
                title: 'Delete "' + spill.get('name') + '"',
                text: 'Are you sure you want to delete this spill?',
                type: 'warning',
                confirmButtonText: 'Delete',
                confirmButtonColor: '#d9534f',
                showCancelButton: true
            }, _.bind(function(isConfirmed){
                if(isConfirmed){
                    webgnome.model.get('spills').remove(id);
                    webgnome.model.trigger('sync');
                    this.hide();
                }
            }, this));
        },

		next: function(){
			$('.xdsoft_datetimepicker:last').remove();
			FormModal.prototype.next.call(this);
		},

		back: function(){
			$('.xdsoft_datetimepicker:last').remove();
			FormModal.prototype.back.call(this);
		},

		close: function(){
			$('.xdsoft_datetimepicker:last').remove();
            if (!_.isUndefined(this.spillMapView)){
                this.spillMapView.close();
            }
			FormModal.prototype.close.call(this);
		}

	});

	return baseSpillForm;
});