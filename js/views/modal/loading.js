define([
    'jquery',
    'underscore',
    'backbone',
    'views/modal/base',
    'text!templates/modal/loading.html'
], function($, _, Backbone, BaseModal, LoadingTemplate){
    var loadingModal = BaseModal.extend({
        name: 'loading',
        size: 'sm',
        title: 'Loading...',
        body: _.template(LoadingTemplate),
        buttons: '',
    });

    return loadingModal;
});