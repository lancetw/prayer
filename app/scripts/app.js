// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
// 'starter.services' is found in services.js
// 'starter.controllers' is found in controllers.js
'use strict';
angular.module('Prayer', ['ngCordova', 'ionic', 'config', 'Prayer.services', 'Prayer.controllers', 'LocalStorageModule', 'angularMoment'])


.run(function ($rootScope, $ionicPlatform, $log, $cordovaStatusbar, $cordovaNetwork, KeyboardService, NotifyService, LazyService, amMoment) {
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

  $rootScope.$on('$cordovaNetwork:online', function () {
    $rootScope.checkOfflineMode(false);
    LazyService.run();
  });

  $rootScope.$on('$cordovaNetwork:offline', function () {
    $rootScope.checkOfflineMode(true);
  });

})

// base64: http://jasonwatmore.com/post/2014/05/26/AngularJS-Basic-HTTP-Authentication-Example.aspx
.provider('NgLog', function () {
  /* jshint ignore:start */

  this.track = function (name, data) {
    var initInjector = angular.injector(['ng']);
    var $q = initInjector.get('$q');
    var $http = initInjector.get('$http');
    var LOGGER_SERVER = 'http://1and1.ccea.org.tw/api/v1/';

    var q = $q.defer();

    var settingData = {
      email: 'ilancetw@icloud.com',
      uuidx: 'TRACKONLY',
      type: name,
      data: JSON.stringify(data),
      info: 'Global Error Tracking'
    };

    var input = settingData.email + ':' + settingData.uuidx;

    /* Base64 */
    var output = '';
    var keyStr = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    var chr1, chr2, chr3 = '';
    var enc1, enc2, enc3, enc4 = '';
    var i = 0;

    do {
      chr1 = input.charCodeAt(i++);
      chr2 = input.charCodeAt(i++);
      chr3 = input.charCodeAt(i++);

      enc1 = chr1 >> 2;
      enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
      enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
      enc4 = chr3 & 63;

      if (isNaN(chr2)) {
        enc3 = enc4 = 64;
      } else if (isNaN(chr3)) {
        enc4 = 64;
      }

      output = output +
        keyStr.charAt(enc1) +
        keyStr.charAt(enc2) +
        keyStr.charAt(enc3) +
        keyStr.charAt(enc4);
      chr1 = chr2 = chr3 = '';
      enc1 = enc2 = enc3 = enc4 = '';
    } while (i < input.length);
    /* Base64 */

    var authdata = output;

    $http.defaults.headers.common['Authorization'] = 'Basic ' + authdata;
    $http.post(LOGGER_SERVER + 'logs', settingData).
      success(function(data, status, headers, config) {
        $http.defaults.headers.common.Authorization = 'Basic ';
        q.resolve(data);
      }).
      error(function(data, status, headers, config) {
        $http.defaults.headers.common.Authorization = 'Basic ';
        q.reject(data);
      }
    );

    return q.promise;
  };

  this.$get = function() {
    return this;
  };

  /* jshint ignore:end */
})


.config(function($stateProvider, $urlRouterProvider, $ionicConfigProvider, $provide, $httpProvider, localStorageServiceProvider, ENV, NgLogProvider) {

  localStorageServiceProvider.setPrefix('Prayer');

  $ionicConfigProvider.backButton.previousTitleText(false).text('');

  $httpProvider.interceptors.push('globalHttpErrorInterceptor');

  $provide.decorator('$exceptionHandler', ['$delegate', function($delegate) {
    return function(exception, cause) {
      $delegate(exception, cause);

      var data = {
        type: 'angular',
        url: window.location.hash,
        localtime: Date.now()
      };
      if (cause)               { data.cause    = cause;              }
      if (exception) {
        if (exception.message) { data.message  = exception.message;  }
        if (exception.name)    { data.name     = exception.name;     }
        if (exception.stack)   { data.stack    = exception.stack;    }
      }

      if(ENV.debug) {
        console.log('exception', data);
        window.alert('Error: ' + data.message);
      } else {
        NgLogProvider.track('exception', data);
      }
    };
  }]);

  window.onerror = function(message, url, line, col, error) {
    var stopPropagation = ENV.debug ? false : true;
    var data = {
      type: 'javascript',
      url: window.location.hash,
      localtime: Date.now()
    };
    if(message)       { data.message      = message;      }
    if(url)           { data.fileName     = url;          }
    if(line)          { data.lineNumber   = line;         }
    if(col)           { data.columnNumber = col;          }
    if(error){
      if(error.name)  { data.name         = error.name;   }
      if(error.stack) { data.stack        = error.stack;  }
    }

    if(ENV.debug) {
      console.log('exception', data);
      window.alert('Error: '+data.message);
    } else {
      NgLogProvider.track('exception', data);
    }
    return stopPropagation;
  };


  $stateProvider

    .state('intro', {
      url: '/',
      templateUrl: 'templates/intro.html',
      controller: 'IntroCtrl'
    })

    .state('main', {
      url: '/main',
      params: {action: null},
      templateUrl: 'templates/main.html',
      controller: 'MainCtrl'
    })

    .state('location', {
      url: '/location:',
      params: {action: null},
      templateUrl: 'templates/location.html',
      controller: 'LocationCtrl',
    })

    .state('address', {
      url: '/address',
      params: {action: null},
      templateUrl: 'templates/address.html',
      controller: 'AddressCtrl'
    })

    .state('keyword', {
      url: '/keyword',
      params: {action: null},
      templateUrl: 'templates/keyword.html',
      controller: 'KeywordCtrl'
    })

    .state('map', {
      url: '/map',
      params: {action: null},
      templateUrl: 'templates/map.html',
      controller: 'MapCtrl'
    })

    .state('mtarget', {
      url: '/mtarget',
      params: {action: null},
      templateUrl: 'templates/mtarget.html',
      controller: 'MtargetCtrl'
    })

    .state('custom-church', {
      url: '/customchurch',
      params: {action: null},
      templateUrl: 'templates/custom-church.html',
      controller: 'CustomChurchCtrl'
    })

    .state('reset-church', {
      url: '/resetchurch',
      params: {action: null},
      templateUrl: 'templates/reset-church.html',
      controller: 'ResetChurchCtrl'
    })

    .state('tab', {
      url: '/tab',
      abstract: true,
      templateUrl: 'templates/tabs.html'
    })

    .state('tab.prayer-index', {
      url: '/prayer',
      params: {action: null},
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
