define([
    'jquery',
    'underscore',
    'backbone',
    'views/modal/form',
    'text!templates/form/response/type.html',
    'model/weatherers/burn',
    'model/weatherers/disperse',
    'model/weatherers/skim',
    'views/form/response/insituBurn',
    'views/form/response/disperse',
    'views/form/response/skim'
], function($, _, Backbone, FormModal, FormTemplate, InSituBurnModel, DisperseModel, SkimModel, 
    InSituBurnForm, DisperseForm, SkimForm){
    var responseTypeForm = FormModal.extend({
        title: 'Select Response Type',
        className: 'modal fade form-modal responsetype-form',

        events: function(){
            return _.defaults({
                'click .burn': 'burn',
                'click .disperse': 'disperse',
                'click .skim': 'skim'
            }, FormModal.prototype.events);
        },

        render: function(options){
            this.body = _.template(FormTemplate);
            this.buttons = null;
            FormModal.prototype.render.call(this, options);
        },

        burn: function(){
            var insituBurn = new InSituBurnModel();
            this.on('hidden', _.bind(function(){
                var insituBurnForm = new InSituBurnForm(null, insituBurn);
                inSituBurnForm.render();
                inSituBurnForm.on('wizardclose', insituBurnForm.close);
                inSituBurnForm.on('save', function(){
                    webgnome.model.get('weatherers').add(insituBurn);
                    webgnome.model.save();
                    inSituBurnForm.on('hidden', function(){
                        inSituBurnForm.trigger('wizardclose');
                    });
                });
            }, this));
        },

        disperse: function(){
            var disperse = new DisperseModel();
            this.on('hidden', _.bind(function(){
                var disperseForm = new DisperseForm(null, disperse);
                disperseForm.render();
                disperseForm.on('wizardclose', disperseForm.close);
                disperseForm.on('save', function(){
                    webgnome.model.get('weatherers').add(disperse);
                    webgnome.model.save();
                    disperseForm.on('hidden', function(){
                        disperseForm.trigger('wizardclose');
                    });
                });
            }, this));
        },

        skim: function(){
            var skim = new SkimModel();
            this.on('hidden', _.bind(function(){
                var skimForm = new SkimForm(null, skim);
                skimForm.render();
                skimForm.on('wizardclose', skimForm.close);
                skimForm.on('save', function(){
                    webgnome.model.get('weatherers').add(skim);
                    webgnome.model.save();
                    skimForm.on('hidden', function(){
                        skimForm.trigger('wizardclose');
                    });
                });
            }, this));
        }

    });

    return responseTypeForm;
});