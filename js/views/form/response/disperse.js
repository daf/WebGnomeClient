define([
    'jquery',
    'underscore',
    'backbone',
    'module',
    'views/form/response/base',
    'text!templates/form/response/disperse.html',
    'model/weatherers/dispersion',
    'moment',
    'jqueryDatetimepicker',
    'jqueryui/slider'
], function($, _, Backbone, module, ResponseFormModal, FormTemplate, DisperseModel, moment){
    'use strict';
    var disperseForm = ResponseFormModal.extend({
        title: 'Disperse Response',
        className: 'modal response fade form-modal disperse-form',

        initialize: function(options, disperseModel){
            this.module = module;
            ResponseFormModal.prototype.initialize.call(this, options, disperseModel);
            this.model = disperseModel;
        },

        render: function(options){
            var fractSprayed = this.model.get('fraction_sprayed');
            this.body = _.template(FormTemplate,{
                name: this.model.get('name'),
                time: this.model.get('active_start') !== '-inf' ? moment(this.model.get('active_start')).format('YYYY/M/D H:mm') : moment(webgnome.model.get('start_time')).format('YYYY/M/D H:mm'),
                duration: this.parseDuration(this.model.get('active_start'), this.model.get('active_stop')),
                percentSprayed: !_.isUndefined(fractSprayed) ? fractSprayed * 100 : 0
            });
            ResponseFormModal.prototype.render.call(this, options);
        },

        update: function(){
            ResponseFormModal.prototype.update.call(this);

            this.model.set('active_start', this.startTime.format('YYYY-MM-DDTHH:mm:ss'));

            var duration = parseFloat(this.$('#duration').val());
            var endTime = this.startTime.add(duration, 'h').format('YYYY-MM-DDTHH:mm:ss');
            var sprayedOilPercent = this.$('#oilsprayed').val();
            var dispersedOilPercent = this.$('#oildispersed').val();

            this.model.set('active_stop', endTime);
            this.model.set('fraction_sprayed', sprayedOilPercent / 100);
        }
    });

    return disperseForm;
});