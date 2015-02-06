'use strict';

var timeout_ = 10000;


angular.module('Prayer.services', ['ngResource', 'ab-base64', 'underscore', 'angularMoment'])

.factory('TWZipCode', function ($http, $q) {
  return {
    all: function () {
      return $http.get('scripts/twzipcode.json')
      .then(function (res) {
        if (typeof res.data === 'object') {
          return res.data;
        } else {
          return $q.reject(res.data);
        }
      }, function (res) {
        return $q.reject(res.data);
      });
    }
  };
})


.factory('ConfigService', function (localStorageService) {
  return {
    purge: function () {
      localStorageService.clearAll();
    },
    setMap: function (map) {
      localStorageService.set('map', map);
    },
    getMap: function () {
      return localStorageService.get('map');
    },
    setMtarget: function (mtarget) {
      localStorageService.set('mtarget', mtarget);
    },
    getMtarget: function () {
      return localStorageService.get('mtarget');
    },
    clearMtarget: function () {
      localStorageService.set('mtarget', null);
    },
    setAuth: function (auth) {
      localStorageService.set('auth', auth);
    },
    getAuth: function () {
      return localStorageService.get('auth');
    }
  };
})


.factory('LoadingService', function ($rootScope, $ionicLoading, $timeout) {
  return {
    loading: function (duration) {
      //duration = (typeof duration === 'undefined') ? '1000' : duration;

      $ionicLoading.show({
        template: '<i class="icon ion-ios7-reloading"></i>',
        animation: 'fade-in',
        showBackdrop: false,
        showDelay: 0,
        duration: duration,
        hideOnStateChange: true
      });
    },
    done: function () {
      $timeout(function() { $ionicLoading.hide(); }, 1500);
    },
    msg: function (message) {
      $ionicLoading.show({
        template: message,
        animation: 'fade-in',
        showBackdrop: false,
        showDelay: 0,
        duration: 2000,
        hideOnStateChange: false
      });
    },
    error: function (message) {
      $ionicLoading.show({
        template: message,
        animation: 'fade-in',
        showBackdrop: false,
        showDelay: 0,
        duration: 2000,
        hideOnStateChange: true
      });
    },
    log: function () {
      // TODO 記錄到伺服器
      $ionicLoading.show({
        template: '發生錯誤，請重試',
        animation: 'fade-in',
        showBackdrop: false,
        showDelay: 0,
        duration: 2000,
        hideOnStateChange: true
      });
    }
  };
})


.factory('DeviceService', function ($ionicPlatform, $q, $cordovaDevice) {
  return {
    detect: function () {
      var q = $q.defer();
      try {
        var uuid = $cordovaDevice.getUUID();
        q.resolve(uuid);
      } catch (err) {
        q.reject(err);
      }
      return q.promise;
    }
  };
})


.factory('NotifyService', function ($ionicPlatform, $q, $cordovaLocalNotification) {
  var badges = 0;

  return {
    runTest: function (tid, freq, name) {
      return this.run(tid, 10000, name);

    },
    run: function (tid, freq, name) {
      if (freq <= 0) {
        return this.cancel(tid);
      }

      var now = new Date().getTime();
      var title = '一領一禱告認領';
      var message = '你已經有' + (freq / (60*60*24)) + '天沒有為' + name + '禱告囉！';

      try {
        $cordovaLocalNotification.hasPermission().then(function () {
          badges = badges + 1;

          $cordovaLocalNotification.add({
            id:         tid,
            date:       new Date(now + freq*1000).getTime(),
            message:    message,
            title:      title,
            badge:      badges
          });

        });
      } catch (err) {}
    },
    cancel: function (tid) {
      try {
        $cordovaLocalNotification.hasPermission().then(function () {
          $cordovaLocalNotification.cancel(tid.toString());
        });
      } catch (err) {}
    },
    purge: function () {

      try {
        $cordovaLocalNotification.hasPermission().then(function () {
          badges = 0;
          $cordovaLocalNotification.cancelAll();
        });
      } catch (err) {}

    },
    init: function () {
      try {
        // TODO 檢查新版本的變化
        $cordovaLocalNotification.promptForPermission();

        $cordovaLocalNotification.hasPermission().then(function () {
          $cordovaLocalNotification.setDefaults({ autoCancel: true });
          badges = 0;
          $cordovaLocalNotification.cancelAll();
        });
      } catch (err) {}
    }
  };
})


.factory('GPSService', function ($ionicPlatform, $q, $cordovaGeolocation) {
  return {
    run: function () {
      var q = $q.defer();
      try {
        var posOptions = {timeout: 10000, enableHighAccuracy: true};
        $cordovaGeolocation.getCurrentPosition(posOptions)
        .then(function (position) {
          q.resolve(position);
        }, function (err) {
          switch (err.code) {
            case 1:
              err.message = '因拒絕提供 GPS 資訊無法使用本功能';
              q.reject(err);
              break;
            case 2:
              err.message = '請到訊號良好的地方重新取得 GPS 資訊';
              q.reject(err);
              break;
            case 3:
              err.message = '訊號不良，請重新嘗試一次';
              q.reject(err);
              break;
            default:
              q.reject(err);
          }
        });
      } catch (err) {
        q.reject(err);
      }
      return q.promise;
    }
  };
})


.factory('MapService', function ($resource, ENV) {
  return {
    find: function (prams) {
      return $resource(ENV.apiEndpoint + 'map', {lng: prams.lng, lat: prams.lat}, {'get': {method: 'GET', cache: true, timeout: timeout_}});
    },
    nearby: function (prams) {
      return $resource(ENV.apiEndpoint + 'map/nearby/:dist', {code: prams.code, city: prams.city, town: prams.town, dist: prams.dist, lng: prams.lng, lat: prams.lat}, {'query': {method: 'GET', isArray: true, cache: true, timeout: timeout_}});
    }
  };
})


.factory('UsersService', function ($resource, $q, ENV) {
  var handleError = function (err) {
    return $q.reject(err);
  };

  return $resource(ENV.apiEndpoint + 'users', {}, {
    'save': {method: 'POST', timeout: timeout_, headers: {}, interceptor: {
      response: function (response) {
        if (response.data.error) {
          return handleError(response);
        }
        return response;
      },
      responseError: handleError
    }}
  });
})


.factory('UserCheckService', function ($resource, ENV, base64) {
  return {
    init: function (token) {
      var auth = { Authorization: 'Basic ' + base64.encode(token.email + ':' + token.uuidx) };
      return $resource(ENV.apiEndpoint + 'users', {},
        {'get': { method: 'GET', timeout: timeout_, headers: auth || {} }}
      );
    }
  };
})


.factory('SettingsService', function ($resource, ENV, base64) {
  return {
    init: function (token) {
      var auth = { Authorization: 'Basic ' + base64.encode(token.email + ':' + token.uuidx) };
      return $resource(ENV.apiEndpoint + 'settings', {},
        {'save': { method: 'POST', timeout: timeout_, headers: auth || {} }}
      );
    }
  };
})


.factory('ChurchesService', function ($resource, ENV, base64) {
  return {
    init: function (token) {
      var auth = { Authorization: 'Basic ' + base64.encode(token.email + ':' + token.uuidx) };
      return $resource(ENV.apiEndpoint + 'churches', {},
        {
          'save': { method: 'POST', timeout: timeout_, headers: auth || {} },
          'get': { method: 'GET', timeout: timeout_, headers: auth || {} }
        }
      );
    }
  };
})


.factory('MtargetsService', function ($resource, $q, $log, ENV, localStorageService, base64, _, ConfigService) {
  var handleError = function (err) {
    return $q.reject(err);
  };

  var items = {};
  return {
    init: function (token) {
      var auth = { Authorization: 'Basic ' + base64.encode(token.email + ':' + token.uuidx) };
      return $resource(ENV.apiEndpoint + 'targets/:id', {id: '@id'},
        {'save': { method: 'POST', timeout: timeout_, headers: auth || {}, interceptor: {
          response: function (response) {
            if (response.data.error) {
              return handleError(response);
            }
            return response;
          },
          responseError: handleError
        }},
         'query': { method: 'GET', isArray: true, timeout: timeout_, headers: auth || {} },
         'get': { method: 'GET', timeout: timeout_, headers: auth || {} },
         'update': { method: 'PUT', timeout: timeout_, headers: auth || {}},
         'delete': { method: 'DELETE', timeout: timeout_, headers: auth || {}}
        }
      );
    },
    all: function (token, func) {
      items = this.init(token).query(func);
      return items;
    },
    update: function (mtargets) {
      ConfigService.setMtarget(JSON.stringify(mtargets));
      items = mtargets;
    },
    item: function (id) {
      return _.filter(items, {id: id})[0];
    },
    clean: function () {
      items = {};
      ConfigService.setMtarget(null);
    },
    remove: function (tid) {
      items = _.reject(items, function(e) { return e.tid === tid; });
      ConfigService.setMtarget(JSON.stringify(items));
    },
    merge: function (newList, oldList) {

      if (!oldList || oldList.length === 0) {
        return newList;
      }

      newList = _.each(oldList, function (oldone) {
        var newone = _.filter(newList, {id: oldone.id})[0];
        newone.keep = oldone.keep;
        newone.past = oldone.past;
        newone.status = oldone.status;
      });

      items = newList;

      ConfigService.setMtarget(JSON.stringify(items));

      return items;
    }
  };
})


.factory('ActionsService', function ($resource, ENV, base64) {
  return {
    init: function (token) {
      var auth = { Authorization: 'Basic ' + base64.encode(token.email + ':' + token.uuidx) };
      return $resource(ENV.apiEndpoint + 'actions', {},
        {'save': { method: 'POST', timeout: timeout_, headers: auth || {} }}
      );
    }
  };
})


.factory('KeyboardService', function ($log, $cordovaKeyboard) {
  return {
    init: function () {
      if(window.cordova && window.cordova.plugins.Keyboard) {
        $cordovaKeyboard.hideAccessoryBar(true);
        $cordovaKeyboard.disableScroll(true);
      }
    },
    close: function () {
      if(window.cordova && window.cordova.plugins.Keyboard) {
        $cordovaKeyboard.close();
      }
    }
  };
})


.factory('AlertBadgesService', function (_, localStorageService, $log, ConfigService) {
  var items = [];
  return {
    targets: function () {
      items = ConfigService.getMtarget();
      return _.countBy(items, function (obj) {
        if (obj.status === true) {
          return 'avail';
        } else {
          return 'clicked';
        }
      });
    }
  };
})


.factory('focus', function($timeout) {
  return function(id) {
    $timeout(function() {
      var element = document.getElementById(id);
      if(element) {
        element.focus();
      }
    });
  };
})

;
