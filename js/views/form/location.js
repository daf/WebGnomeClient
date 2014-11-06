define([
    'jquery',
    'underscore',
    'backbone',
    'views/modal/form',
    'views/location/index',
    'views/modal/loading',
    'model/location',
    'model/gnome',
    'model/outputters/geojson'
], function($, _, Backbone, FormModal, LocationView, LoadingModal, GnomeLocation, GnomeModel, GeojsonOutputter){
    var locationModal = FormModal.extend({
        className: 'modal fade form-modal location-form',
        size: 'lg',
        title: 'Select a Location',

        initialize: function(options){
            FormModal.prototype.initialize.call(this, options);

            this.LocationView = LocationView.extend({
                load: function(options){
                    this.trigger('load');
                    webgnome.model.resetLocation();
                    var locationModel = new GnomeLocation({id: options.slug});
                    locationModel.fetch({
                        success: _.bind(function(){
                            webgnome.model.fetch({
                                success: _.bind(function(){
                                    webgnome.model.setup(_.bind(function(){
                                        this.trigger('loaded');
                                    }, this));
                                }, this)
                            });
                        }, this)
                    });
                }
            });

        },

        events: function(){
            return _.defaults({
                'show.bs.modal': 'renderSubview',
                'shown.bs.modal': 'updateMapSize'
            }, FormModal.prototype.events);
        },

        render: function(){
            this.buttons = null;
            FormModal.prototype.render.call(this);
        },

        renderSubview: function(){
            this.locationView = new this.LocationView({
                dom_target: '.location-form .modal-body',
                className: 'page locations'
            });
            this.locationView.on('load', this.handoff, this);
            this.locationView.on('loaded', this.loaded, this);
        },

        handoff: function(){
            this.hide();
        },

        loaded: function(){
            this.trigger('loaded');
        },

        updateMapSize: function(){
            this.locationView.mapView.map.updateSize();
        },

        close: function(){
            this.locationView.close();
            FormModal.prototype.close.call(this);
        }

    });

    return locationModal;
});