define([
    'jquery',
    'underscore',
    'backbone',
    'model/resources/oilLib',
    'text!templates/default/specificOil.html'
], function($, _, Backbone, OilLib, SpecificOilTemplate){
	var specificOil = Backbone.View.extend({
		id: 'specificOil',

		initialize: function(){
			this.render();
		},

		render: function(){
			var data = this.dataParse(this.model.attributes);
			var compiled = _.template(SpecificOilTemplate, {data: data});
			$('.modal-body').html(compiled);
            this.$('.collapse').collapse({toggle: false});
		},

		dataParse: function(obj){
			for (key in obj){
				if (!obj[key]){
					obj[key] = "--";				
				} else if (_.isArray(obj[key])) {
                    if (obj[key].length === 0){
                        obj[key] = "--";
                    } else {
    					for (var i = 0; i < obj[key].length; i++){
    						for (k in obj[key][i]) {
    							if (!obj[key][i][k]){
    								obj[key][i][k] = "--";
    							}
    						}
    					}
                    }
				}
			}
			return obj;
		},

	});
	return specificOil;
});