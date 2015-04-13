define([
    'jquery',
    'underscore',
    'backbone',
    'text!templates/default/menu.html',
    'views/modal/about',
    'sweetalert',
    'bootstrap'
 ], function($, _, Backbone, MenuTemplate, AboutModal, swal) {
    /*
     `MenuView` handles the drop-down menus on the top of the page. The object
     listens for click events on menu items and fires specialized events, like
     RUN_ITEM_CLICKED, which an `AppView` object listens for.

     Most of these functions exist elsewhere in the application and `AppView`
     calls the appropriate method for whatever functionality the user invoked.
     */

    var menuView = Backbone.View.extend({
        tagName: 'nav',
        className: 'navbar navbar-default',

        initialize: function() {
            this.render();
            this.contextualize();
            if(webgnome.hasModel()){
                webgnome.model.on('sync', this.contextualize, this);
            }
        },

        events: {
            // 'click .navbar-brand': 'home',
            'click .new': 'newModel',
            'click .edit': 'editModel',
            'click .load': 'load',
            'click .locations': 'locations',
            'click .save': 'save',
            'click a.debugView': 'debugView',

            // 'click .run': 'run',
            // 'click .step': 'step',
            // 'click .rununtil': 'rununtil',

            'click .about': 'about',
            'click .overview': 'overview',
            'click .faq': 'faq',

            'click .gnome': 'gnome',
            'click .adios': 'adios',
            'click .home': 'home',

            'click .app-menu-link': 'openAppMenu',
            'click .app-menu-close': 'closeAppMenu'
        },

        openAppMenu: function(event){
            event.preventDefault();
            this.$('.app-menu').addClass('open');
            this.$('.app-menu-close').addClass('open');
            this.$('.app-menu').focus();
        },

        closeAppMenu: function(){
            this.$('.app-menu').removeClass('open');
            this.$('.app-menu-close').removeClass('open');
        },

        gnome: function(event){
            event.preventDefault();
            webgnome.router.navigate('gnome/', true);
        },

        adios: function(event){
            event.preventDefault();
            webgnome.router.navigate('adios/', true);
        },

        nothing: function(event){
            event.preventDefault();
        },

        home: function(event){
            event.preventDefault();
            webgnome.router.navigate('', true);
        },

        newModel: function(event){
            event.preventDefault();
            swal({
                title: 'Create New Model?',
                text:'Creating a new model will delete all data related to any current model.',
                type: 'warning',
                showCancelButton: true,
            }, function(isConfirm){
                if(isConfirm){
                    webgnome.model = null;
                    webgnome.router.navigate('', true);
                    localStorage.setItem('prediction', null);
                    webgnome.router.navigate('setup', true);        
                }
            });
            
        },

        editModel: function(event){
            event.preventDefault();
            webgnome.router.navigate('setup', true);
        },

        load: function(event){
            event.preventDefault();
            webgnome.router.navigate('load', true);
        },

        locations: function(event){
            event.preventDefault();
            webgnome.router.navigate('locations', true);
        },

        save: function(event){
            event.preventDefault();
            window.location.href = webgnome.config.api + '/download';
        },

        debugView: function(event){
            event.preventDefault();
            var checkbox = this.$('input[type="checkbox"]');
            if (checkbox.prop('checked')) {
                checkbox.prop('checked', false);
            } else {
                checkbox.prop('checked', true);
                //this.trigger('debugTreeOn');
            }
            this.trigger('debugTreeToggle');
        },

        about: function(event){
            event.preventDefault();
            new AboutModal().render();
        },

        overview: function(event){
            event.preventDefault();
            webgnome.router.navigate('overview', true);
        },

        faq: function(event){
            event.preventDefault();
            webgnome.router.navigate('faq', true);
        },

        enableMenuItem: function(item){
            this.$el.find('.' + item).show();
        },

        disableMenuItem: function(item){
            this.$el.find('.' + item).hide();
        },

        contextualize: function(){
            if(!webgnome.hasModel() || !webgnome.validModel()){
                this.disableMenuItem('save');
            }
            
            if(webgnome.hasModel()){
                this.enableMenuItem('edit');
            } else {
                this.disableMenuItem('edit');
            }

            if(window.location.href.indexOf('model') != -1){
                this.enableMenuItem('debugView');
            } else {
                this.disableMenuItem('debugView');
            }
        },

        render: function(){
            var compiled = _.template(MenuTemplate);
            $('body').append(this.$el.html(compiled));
            this.$('a').tooltip({
                placement: 'right',
                container: 'body'
            });
        },

        close: function(){
            if(!_.isUndefined(webgnome) && webgnome.model){
                webgnome.model.off('sync', this.contextualize, this);
            }

            Backbone.View.prototype.close.call(this);
        }
    });

    return menuView;
});