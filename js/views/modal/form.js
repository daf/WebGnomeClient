define([
    'jquery',
    'underscore',
    'backbone',
    'views/modal/base',
    'text!templates/default/alert-danger.html',
    'views/default/help'
], function($, _, Backbone, BaseModal, AlertDangerTemplate, HelpView){
    'use strict';
    var formModal = BaseModal.extend({
        className: 'modal fade form-modal',
        buttons: '<button type="button" class="cancel" data-dismiss="modal">Cancel</button><button type="button" class="save">Save</button>',
        form: [],

        events: {
            'click .next': 'save',
            'click .back': 'back',
            'shown.bs.modal': 'ready',
            'hidden.bs.modal': 'hidden',
            'click .modal-header>.close': 'wizardclose',
            'click .save': 'save',
            'click .cancel': 'wizardclose',
            'change input': 'update',
            'keyup input': 'update',
            'click input': 'selectContents',
            'change select': 'update',
            'click .finish': 'finish',
            'click .modal-header .gnome-help': 'showHelp'
        },

        initialize: function(options){
            BaseModal.prototype.initialize.call(this, options);
            if (this.module) {
                this.help = new HelpView({path: this.module.id});
            }
        },

        selectContents: function(e){
            e.preventDefault();
            this.$(e.target).select();
        },

        stickyFooter: function(){
            var modal_offset = this.$el.offset();
            var footer_offset = this.$('.modal-footer:first').offset();
            modal_offset.top += $(window).height();
            footer_offset.top -= modal_offset.top;
            footer_offset.top += this.$('.modal-footer:first').outerHeight();
            var modal_height = this.$('.modal-dialog').height();
            var top = this.$el.scrollTop();
            var bottom;

            if (footer_offset.top > 0 && this.$('.sticky-modal-footer').length === 0){
                var modalClone = this.$('.modal-footer').clone();
                this.$('.modal-content').append(modalClone);
                this.$('.modal-footer:last').addClass('sticky-modal-footer');
                this.$('.modal-footer:last button').addClass('btn-sm btn');
                bottom = (modal_height - top - $(window).height());
                this.$('.sticky-modal-footer').css('bottom', bottom + 30 + 'px');
            } else if (footer_offset.top < 0 && this.$('.sticky-modal-footer').length > 0){
                this.$('.sticky-modal-footer').remove();
            } else {
                bottom = (modal_height - top - $(window).height());
                this.$('.sticky-modal-footer').css('bottom', bottom + 30 + 'px');
            }
        },

        renderHelp: function(){
            if(this.$('.modal-header').length > 0){
                if(this.$('.modal-header .gnome-help').length === 0){
                    var button = '<div class="gnome-help" title="Click for help"></div>';
                    this.$('.modal-header h4').append(button);
                    this.$('.modal-header .gnome-help').tooltip();
                }
            } else {
                this.on('ready', this.renderHelp, this);
            }
        },

        showHelp: function(){
            if(this.$('.gnome-help.alert').length === 0){
                this.$('.modal-body').prepend(this.help.$el);
                this.help.delegateEvents();
            }
        },

        ready: function() {
            this.trigger('ready');
            if(!_.isUndefined(this.help)){
                if(this.help.ready){
                    this.renderHelp();
                } else {
                    this.help.on('ready', this.renderHelp, this);
                }
            }
            if (_.isUndefined(this.scrollEvent)){
                this.scrollEvent = this.$el.on('scroll', _.bind(this.stickyFooter, this));
            }
            this.stickyFooter();
        },

        windowResize: function(){
            BaseModal.prototype.windowResize.call(this);
            this.stickyFooter();
        },

        hidden: function() {
            this.trigger('hidden');
        },

        save: function(callback){
            if(this.model){
                this.model.save(null, {
                    success: _.bind(function(){
                        this.hide();
                        this.trigger('save', [this.model]);
                        if(_.isFunction(callback)) { callback(); }
                    }, this),
                    error: _.bind(function(model, response){
                        this.error('Saving Failed!', 'Server responded with HTTP code: ' + response.status);
                    }, this)
                });
                if (this.model.validationError){
                    this.error('Error!', this.model.validationError);
                    this.$el.scrollTop(0);
                }
            } else {
                this.hide();
                this.trigger('save', [this.model]);
                if(_.isFunction(callback)){ callback(); }
            }
        },

        back: function() {
            this.hide();
            this.trigger('back');
        },

        error: function(strong, message) {
            this.$('.modal-body .alert.validation').remove();
            this.$('.modal-body').prepend(_.template(AlertDangerTemplate, {strong: strong, message: message}));
        },

        clearError: function() {
            this.$('.modal-body .alert.validation').remove();
        },

        isValid: function() {
            if (_.isFunction(this.validate)){
                var valid = this.validate();
                if (_.isUndefined(valid)) {
                    this.validationError = null;
                    return true;
                }
                this.validationError = valid;
                return false;
            } else {
                return true;
            }
        },

        validate: function() {
            if (!_.isUndefined(this.model)) {
                if (this.model.isValid()) {
                    return;
                }
                return this.model.validationError;
            }
        },

        wizardclose: function(){
            if(this.model){
                this.model.fetch();
            }
            this.trigger('wizardclose');
        },

        finish: function(){
            this.on('hidden', function(){
                this.trigger('finish');
                webgnome.model.fetch();
                webgnome.router.navigate('model', true);
            });
            this.hide();
        },

        close: function(){
            this.remove();
            this.unbind();
            this.$el.off('scroll');
        }
    });

    return formModal;
});