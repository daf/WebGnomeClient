define([
    'jquery',
    'underscore',
    'backbone',
    'views/modal/form',
    'text!templates/form/response/burn.html',
    'model/weatherers/burn'
], function($, _, Backbone, FormModal, FormTemplate, BurnModel){
    var inSituBurnForm = FormModal.extend({
        title: 'In-Situ Burn Response',
        className: 'modal fade form-modal insituburn-form',

        initialize: function(options, burnModel){
            FormModal.prototype.initialize.call(this, options, burnModel);
            this.model = burnModel;
        },

        render: function(options){
            this.body = _.template(FormTemplate);
            FormModal.prototype.render.call(this, options);
        }
    });

    return inSituBurnForm;
});
