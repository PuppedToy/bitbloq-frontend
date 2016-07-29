'use strict';

/**
 * @ngdoc function
 * @name bitbloqApp.controller:HelpCtrl
 * @description
 * # HelpCtrl
 * Controller of the bitbloqApp
 */
angular.module('bitbloqApp')
    .controller('HelpCtrl', function($scope, $routeParams, $location, $route, faqsApi, $translate, $log, commonModals) {

        switch ($routeParams.section) {
            case 'forum':
            case 'Forum':
                $scope.currentTab = 2;
                break;
            case 'faq':
            case 'Faq':
            /* falls through */
            default:
                $scope.currentTab = 0;
                $scope.faqAnswer = 0;
        }

        $scope.setTab = function(tab) {
            if ($scope.currentTab !== tab) {
                var section;
                switch (tab) {
                    case 0:
                        section = 'faq';
                        break;
                    case 2:
                        section = 'forum';
                        break;
                }
                $route.current.pathParams.section = section;
                $location.url('/help/' + section);
                $scope.currentTab = tab;
            } else if (tab === 2) {
                $location.url('/help/forum');
            }
        };

        $scope.faqHandler = function(id) {
            if (id === $scope.selectedFaq) {
                $scope.selectedFaq = null;
            } else {
                $scope.selectedFaq = id;
            }
        };

        $scope.currentItem = {};
        $scope.$translate = $translate;
        $scope.commonModals = commonModals;
        $scope.faqsApi = faqsApi;
        $scope.selectedFaq = 0;

        $scope.diwoURL = 'http://diwo.bq.com/';

        $scope.$watch('common.user.language', function(newValue, oldValue) {
            if (newValue && newValue !== oldValue) {
                $scope.diwoURL = 'http://diwo.bq.com/';
            }
        });

    });
