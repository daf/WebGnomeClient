define([
    'underscore',
    'backbone',
    'model/weatherers/base'
], function(_, Backbone, BaseModel){
    'use strict';
    var skimWeatherer = BaseModel.extend({
        defaults: {
            'obj_type': 'gnome.weatherers.Skimmer',
            'name': 'Skimmer',
            'efficiency': 0.20,
            'amount': 0,
            'units': 'bbl'
        },

        toTree: function(){
            return '';
        },

        validate: function(attrs, options){
            if (!_.isNumber(parseFloat(attrs.amount)) || isNaN(parseFloat(attrs.amount))){
                return "Recovery amount must be a number!";
            }
        }
    });

    return skimWeatherer;
});