define([
    'jquery',
    'underscore',
    'backbone',
    'lib/text!templates/default/menu.html',
    'lib/bootstrap.min'
 ], function($, _, Backbone, MenuTemplate) {
    /*
     `MenuView` handles the drop-down menus on the top of the page. The object
     listens for click events on menu items and fires specialized events, like
     RUN_ITEM_CLICKED, which an `AppView` object listens for.

     Most of these functions exist elsewhere in the application and `AppView`
     calls the appropriate method for whatever functionality the user invoked.
     */

    var MenuView = Backbone.View.extend({
        initialize: function() {
            $('body').append('<nav class="navbar navbar-default"></nav>');
            this.el = $('nav.navbar');
            this.$el = $('nav.navbar');
            this.render();
            this.contextualize();
        },

        events: {
            'click .navbar-brand': 'nothing',
            'click .new': 'newModel',
            'click .load': 'load',
            'click .locations': 'locations',
            'click .save': 'save',
            'click .preferences': 'preferences',

            'click .run': 'run',
            'click .step': 'step',
            'click .rununtil': 'rununtil',

            'click .about': 'about',
            'click .tutorial': 'tutorial'
        },

        nothing: function(event){
            event.preventDefault();
        },

        newModel: function(event){
            event.preventDefault();
            webgnome.router.navigate('', true);
            //Backbone.history.navigate('route:index', true);
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
            webgnome.router.navigate('save', true);
        },

        preferences: function(event){
            event.preventDefault();
            webgnome.router.navigate('preferences', true);
        },

        run: function(event){

        },

        step: function(event){

        },

        rununtil: function(event){

        },

        about: function(event){

        },

        tutorial: function(event){

        },

        enableMenuItem: function(item){
            this.$el.find('.' + item).show();
        },

        disableMenuItem: function(item){
            this.$el.find('.' + item).hide();
        },

        contextualize: function(){
            if(!webgnome.hasModel()){
                this.disableMenuItem('actions');
                this.disableMenuItem('model');
            }
        },

        render: function(){
            var compiled = _.template(MenuTemplate);
            this.$el.html(compiled);

        }
    });

    return MenuView;
});