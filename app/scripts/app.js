// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
// 'starter.services' is found in services.js
// 'starter.controllers' is found in controllers.js
'use strict';
angular.module('Prayer', ['ngCordova', 'ionic', 'config', 'Prayer.services', 'Prayer.controllers', 'LocalStorageModule', 'angularMoment'])


.run(function($ionicPlatform, $cordovaStatusbar, KeyboardService, NotifyService, $log, amMoment) {
  $ionicPlatform.ready(function () {
    // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
    // for form inputs)
    KeyboardService.init();

    if(window.StatusBar) {
      // org.apache.cordova.statusbar required
      $cordovaStatusbar.overlaysWebView(true);
      $cordovaStatusbar.style(1);
    }

    /* Local Notification */
    NotifyService.init();

    amMoment.changeLocale('zh-tw');

    $ionicPlatform.registerBackButtonAction(function (event) {
      event.preventDefault();
    }, 100);

  });
})

.config(function($stateProvider, $urlRouterProvider, $ionicConfigProvider, $httpProvider, localStorageServiceProvider) {

  localStorageServiceProvider.setPrefix('Prayer');

  $ionicConfigProvider.backButton.previousTitleText(false).text('');

  $httpProvider.interceptors.push('globalHttpErrorInterceptor');

  // Ionic uses AngularUI Router which uses the concept of states
  // Learn more here: https://github.com/angular-ui/ui-router
  // Set up the various states which the app can be in.
  // Each state's controller can be found in controllers.js
  $stateProvider

    .state('intro', {
      url: '/',
      templateUrl: 'templates/intro.html',
      controller: 'IntroCtrl'
    })

    .state('main', {
      url: '/main',
      templateUrl: 'templates/main.html',
      controller: 'MainCtrl'
    })

    .state('location', {
      url: '/location',
      templateUrl: 'templates/location.html',
      controller: 'LocationCtrl'
    })

    .state('address', {
      url: '/address',
      templateUrl: 'templates/address.html',
      controller: 'AddressCtrl'
    })

    .state('map', {
      url: '/map',
      templateUrl: 'templates/map.html',
      controller: 'MapCtrl'
    })

    .state('mtarget', {
      url: '/mtarget',
      templateUrl: 'templates/mtarget.html',
      controller: 'MtargetCtrl'
    })

    .state('tab', {
      url: '/tab',
      abstract: true,
      templateUrl: 'templates/tabs.html'
    })

    .state('tab.prayer-index', {
      url: '/prayer',
      views: {
        'tab-prayer': {
          templateUrl: 'templates/prayer-index.html',
          controller: 'PrayerIndexCtrl'
        }
      }
    })

    .state('tab.prayer-detail', {
      url: '/prayer/:mtargetId',
      views: {
        'tab-prayer': {
          templateUrl: 'templates/prayer-detail.html',
          controller: 'PrayerDetailCtrl'
        }
      }
    })

    .state('tab.missions', {
      url: '/missions',
      views: {
        'tab-missions': {
          templateUrl: 'templates/missions.html',
          controller: 'MissionsCtrl'
        }
      }
    })

    .state('tab.resources', {
      url: '/resources',
      views: {
        'tab-resources': {
          templateUrl: 'templates/resources.html',
          controller: 'ResourcesCtrl'
        }
      }
    })

    .state('tab.rewards', {
      url: '/rewards',
      views: {
        'tab-rewards': {
          templateUrl: 'templates/rewards.html'
        }
      }
    })

    .state('tab.about', {
      url: '/about',
      views: {
        'tab-about': {
          templateUrl: 'templates/about.html',
          controller: 'AboutsCtrl'
        }
      }
    });

  // if none of the above states are matched, use this as the fallback
  $urlRouterProvider.otherwise('/');

})

// Thanks for: http://stackoverflow.com/questions/25596399/set-element-focus-in-angular-way
.directive('eventFocus', function(focus) {
  return function(scope, elem, attr) {
    elem.on(attr.eventFocus, function() {
      focus(attr.eventFocusId);
    });

    scope.$on('$destroy', function() {
      if (typeof element !== 'undefined') {
        element.off(attr.eventFocus);
      }
    });
  };
})

;
