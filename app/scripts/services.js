'use strict';

var timeout_ = 10000;


angular.module('Prayer.services', ['ngResource', 'ab-base64', 'underscore', 'angularMoment'])

.factory('LoadingService', function ($ionicLoading, $timeout, $log, NgLog) {
  var self = {
    loading: function (duration) {
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
    log: function (err) {
      $log.warn('錯誤提示：', JSON.stringify(err));
      if (+err.status === 0) {
        //self.msg('無法與伺服器連線');
      } else {

        var data = {
          type: 'error',
          url: window.location.hash,
          localtime: Date.now(),
          error: err
        };

        NgLog.track('exception', data);

        $ionicLoading.show({
          template: '發生錯誤，請重試',
          animation: 'fade-in',
          showBackdrop: false,
          showDelay: 0,
          duration: 2000,
          hideOnStateChange: true
        });
      }

    }
  };

  return self;
})


.factory('globalHttpErrorInterceptor', function ($q, $location, ConfigService) {
  return {
    'responseError': function(response) {
      if (+response.status === 401) {
        ConfigService.purge();
        $location.path('/intro');
      }

      return $q.reject(response);
    }
  };
})


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
    setChurch: function (church) {
      localStorageService.set('church', church);
    },
    getChurch: function () {
      return localStorageService.get('church');
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
      localStorageService.set('mtarget', '');
    },
    setAuth: function (auth) {
      localStorageService.set('auth', auth);
    },
    getAuth: function () {
      return localStorageService.get('auth');
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
    },
    info: function () {
      var q = $q.defer();
      try {
        var platform = $cordovaDevice.getPlatform();
        var model = $cordovaDevice.getModel();
        var version = $cordovaDevice.getVersion();
        var info = platform + ' ' + model + ' ' + version;
        q.resolve(info);
      } catch (err) {
        q.reject(err);
      }
      return q.promise;
    }
  };
})


.factory('UserAction', function ($ionicPlatform, $q, $timeout, LoadingService, UsersService, UserCheckService, SettingsService, ChurchesService, MtargetsService, ActionsService, LazyService, ConfigService) {
  var self = {
    auth: {},
    setAuth: function (auth_) {
      self.auth = auth_;
    },
    addUser: function (user_) {
      var q = $q.defer();
      var user = new UsersService();
      user.email = user_.email;
      user.uuidx = self.auth.uuidx;
      user.$save().then(function (data) {
        return q.resolve(data);
      }, function (err) {
        if (+err.status === 403) {
          LoadingService.error('已經有此使用者，但無法在此裝置上使用。');
        } else {
          LoadingService.error('發生錯誤，錯誤碼為 ' + err.status);
        }
        q.reject(err);
      });

      return q.promise;
    },
    checkUser: function (user_) {
      var q = $q.defer();
      var drv = UserCheckService.init(self.auth);
      LoadingService.loading();
      drv.get().$promise.then(function (data) {
        if (data.email === user_.email) {
          q.resolve(data);
        } else {
          q.reject(data);
        }
      }, function (err) {
        if (+err.status === 0) {
          LoadingService.error('無法與伺服器連線');
        } else {
          LoadingService.error('無法登入，請重試一次');
        }

        q.reject(err);
      });

      return q.promise;
    },
    checkOnline: function () {
      var q = $q.defer();
      var auth = ConfigService.getAuth();
      UserCheckService.alive(auth, function (data) {
        q.resolve(data);
      }, function (err) {
        q.reject(err);
      });

      return q.promise;
    },
    setting: function (user_) {
      var q = $q.defer();
      var settingData = {
        email: user_.email,
        subscription: user_.subscription
      };

      var drv = SettingsService.init(self.auth);
      drv.save(settingData)
      .$promise.then(function (data) {
        q.resolve(data);
      }, function (err) {
        LoadingService.error('無法新增設定，請重試一次');
        q.reject(err);
      });

      return q.promise;
    },
    joinChurch: function (map_) {
      var q = $q.defer();
      var settingData = {
        name: map_.item.ocname,
        lng: map_.item.lng,
        lat: map_.item.lat,
        cid: map_.item.oid
      };
      var drv = ChurchesService.init(self.auth);
      drv.save(settingData)
      .$promise.then(function (data) {
        q.resolve(data);
      }, function (err) {
        LoadingService.error('無法新增教會，請重試一次');
        q.reject(err);
      });

      return q.promise;
    },
    addMtarget: function (mtarget_, skip) {
      var q = $q.defer();
      var settingData = {
        name: mtarget_.name,
        mask: (function () {
          if (mtarget_.name.length > 2) {
            return mtarget_.name[0] + new Array(mtarget_.name.length-1).join('★') + mtarget_.name.slice(-1);
          } else {
            return mtarget_.name[0] + '★';
          }
        }()),
        freq: mtarget_.freq,
        sinner: mtarget_.sinner
      };
      var drv = MtargetsService.init(self.auth);

      drv.save(settingData)
      .$promise.then(function (data) {
        q.resolve(data);
      }, function (err) {
        if (+err.status === 302) {
          if (skip) {
            q.resolve('302');
          } else {
            LoadingService.error('重複的禱告對象');
            q.reject(err);
          }
        } else {
          LoadingService.error('無法新增對象，請重試一次');
          q.reject(err);
        }
      });

      return q.promise;
    },
    updateMtarget: function (mtarget_) {
      var q = $q.defer();
      var settingData = {
        id: mtarget_.id,
        name: mtarget_.name,
        mask: (function () {
          if (mtarget_.name.length > 2) {
            return mtarget_.name[0] + new Array(mtarget_.name.length-1).join('★') + mtarget_.name.slice(-1);
          } else {
            return mtarget_.name[0] + '★';
          }
        }()),
        freq: mtarget_.freq,
        sinner: mtarget_.sinner,
        baptized: mtarget_.baptized,
        meeter: mtarget_.meeter
      };
      var drv = MtargetsService.init(self.auth);
      LoadingService.loading();

      /* 補充先前的延遲上傳資料 */
      LazyService.run();

      drv.update(settingData)
      .$promise.then(function (resp) {
        q.resolve(resp);
      }, function (err) {
        if (+err.status === 0) {
          /* 網路發生問題，啟動延遲上傳機制 */
          MtargetsService.lazy('update', self.auth, settingData);

          $timeout(function () {
            LoadingService.done();
            q.reject(err);
          }, 1000);
        } else {
          q.reject(err);
        }
      });

      return q.promise;
    },
    removeMtarget: function (tid) {
      var q = $q.defer();
      var settingData = {
        id: tid
      };
      var drv = MtargetsService.init(self.auth);
      LoadingService.loading();

      /* 補充先前的延遲上傳資料 */
      LazyService.run();

      drv.delete(settingData)
      .$promise.then(function (data) {
        q.resolve(data);
      }, function (err) {
        if (+err.status === 0) {
          /* 網路發生問題，啟動延遲上傳機制 */
          MtargetsService.lazy('delete', self.auth, settingData);

          $timeout(function () {
            LoadingService.done();
            q.reject(err);
          }, 1000);
        } else {
          q.reject(err);
        }
      });

      return q.promise;
    },
    doAction: function (action) {
      var q = $q.defer();

      var settingData = {
        tid: action.tid
      };

      var drv = ActionsService.init(self.auth);
      LoadingService.loading();

      /* 補充先前的延遲上傳資料 */
      LazyService.run();

      drv.save(settingData)
      .$promise.then(function (data) {
        q.resolve(data);
      }, function (err) {
        if (+err.status === 0) {
          /* 網路發生問題，啟動延遲上傳機制 */
          ActionsService.lazy('save', self.auth, settingData);

          $timeout(function () {
            LoadingService.done();
            q.reject(err);
          }, 1000);

        } else {
          q.reject(err);
        }
      });

      return q.promise;
    }
  };

  return self;
})


.factory('FreqService', function ($resource, $q, $log, _) {
  var table = [
    {name:'尚未設定', val: 0},
    {name:'一天兩次', val: 43200},
    {name:'一天', val: 86400},
    {name:'兩天', val: 86400*2},
    {name:'三天', val: 86400*3},
    {name:'四天', val: 86400*4},
    {name:'五天', val: 86400*5},
    {name:'六天', val: 86400*6},
    {name:'七天', val: 86400*7}
  ];

  return {
    getTable: function () {
      return table;
    },
    getNextFreq: function (freq_) {
      var index = 0;
      var freq = 0;
      _.each(table, function (item) {
        if (item.val === freq_) {
          freq = table[(index+1) % table.length].val;
        } else {
          index++;
        }
      });
      return freq;
    },
    getFreqName: function (freq) {
      var item = _.find(table, function (item) {
        return item.val === +freq;
      });
      if (item) {
        return item.name;
      }
    }
  };
})


.factory('NotifyService', function ($ionicPlatform, $timeout, $q, $log, $cordovaBadge, $cordovaLocalNotification, $ionicPopup) {
  var self = {
    reqPermissionCount: 0,
    maxReqPermissionCount: 3,
    cancel: function (tid) {
      if (!tid) {
        return;
      }

      try {
        $cordovaLocalNotification.hasPermission().then(function () {
          $cordovaLocalNotification.cancel(tid.toString());
        });
      } catch (err) {}
    },
    run: function (mtarget_) {

      if (!mtarget_.id) {
        $ionicPopup.alert({
          title: '新增失敗',
          template: '沒有這個禱告對象'
        });
      }

      if (mtarget_.freq <= 0) {
        return self.cancel(mtarget_.tid);
      }

      var now = new Date().getTime();
      var title = '禱告提醒';
      var days = mtarget_.freq > 43200 ? (mtarget_.freq / (60*60*24)) : '半';
      var message = mtarget_.freq >=43200 ? '您已經超過' + days + '天沒有為' + mtarget_.name + '禱告囉！' : '您已經超過' + (mtarget_.freq / 60) + '分鐘沒有為' + mtarget_.name + '禱告囉！';
      var date = new Date(now + 1000 * mtarget_.freq);
      var repeatType = mtarget_.freq >= 43200 ? 'daily' : 'minutely';
      if (mtarget_.freq >= 86400) {
        repeatType = 'daily';
      }

      try {
        $cordovaLocalNotification.hasPermission().then(function () {

          $cordovaLocalNotification.add({
            id:         mtarget_.id,
            date:       date,
            message:    message,
            title:      title,
            repeat:     repeatType
          });

        }, function () {
          self.reqPermissionCount = self.reqPermissionCount + 1;
          if (self.reqPermissionCount <= self.maxReqPermissionCount) {
            $ionicPopup.alert({
              title: '需要開啟通知權限',
              template: '請開啟一領一禱告認領的通知權限（超過三次將不再提醒）'
            });
          }
        });
      } catch (err) {}
    },
    getScheduledIdsList: function () {
      var q = $q.defer();
      try {
        $cordovaLocalNotification.hasPermission().then(function () {
          $cordovaLocalNotification.getScheduledIds().then(function (scheduledIds) {
            q.resolve(scheduledIds);
          });
        });
      } catch (err) {
        q.reject(err);
      }

      return q.promise;
    },
    getTriggeredIds: function () {
      var q = $q.defer();
      try {
        $cordovaLocalNotification.hasPermission().then(function () {
          $cordovaLocalNotification.getTriggeredIds().then(function (triggeredIds) {
            q.resolve(triggeredIds);
          });
        });
      } catch (err) {
        q.reject(err);
      }

      return q.promise;
    },
    purge: function () {
      try {
        $cordovaLocalNotification.hasPermission().then(function () {
          $cordovaLocalNotification.cancelAll();
        });
      } catch (err) {}
    },
    init: function () {
      try {
        // TODO: 檢查新版本的變化
        $cordovaLocalNotification.promptForPermission();
        $cordovaLocalNotification.hasPermission().then(function () {
          $cordovaLocalNotification.setDefaults({ autoCancel: false });
        });

        $cordovaBadge.hasPermission().then(function () {
          $cordovaBadge.configure({ autoClear: true });
        });

      } catch (err) {}
    }
  };

  return self;
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
          switch (+err.code) {
            case 1:
              err.message_ = '因拒絕提供 GPS 資訊無法使用本功能';
              q.reject(err);
              break;
            case 2:
              err.message_ = '請到訊號良好的地方重新取得 GPS 資訊';
              q.reject(err);
              break;
            case 3:
              err.message_ = '訊號不良，請重新嘗試一次';
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
      return $resource(ENV.apiEndpoint + 'map/nearby/:dist', {code: prams.code, city: prams.city, town: prams.town, dist: prams.dist, lng: prams.lng, filter: prams.filter, lat: prams.lat, page: prams.page}, {'query': {method: 'GET', isArray: false, cache: true, timeout: timeout_}});
    },
    keyword: function (prams) {
      return $resource(ENV.apiEndpoint + 'map/search', {keyword: prams.keyword, page: prams.page}, {'query': {method: 'GET', isArray: false, cache: true, timeout: timeout_}});
    }
  };
})


.factory('LogService', function ($resource, ENV, base64) {
  return {
    init: function (token) {
      var auth = { Authorization: 'Basic ' + base64.encode(token.email + ':' + token.uuidx) };
      return $resource(ENV.apiEndpoint + 'logs', {},
        {'save': { method: 'POST', timeout: timeout_, headers: auth || {} }}
      );
    }
  };
})


.factory('UsersService', function ($resource, ENV) {
  return $resource(ENV.apiEndpoint + 'users', {}, {
    'save': {method: 'POST', timeout: timeout_, headers: {}}
  });
})


.factory('UserCheckService', function ($resource, ENV, base64) {
  var self = {
    init: function (token) {
      var auth = { Authorization: 'Basic ' + base64.encode(token.email + ':' + token.uuidx) };
      return $resource(ENV.apiEndpoint + 'users', {},
        {'get': { method: 'GET', timeout: timeout_, headers: auth || {} }}
      );
    },
    alive: function (token, func, errfunc) {
      var user = self.init(token).get(func, errfunc);
      return user;
    }
  };

  return self;
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


.factory('MtargetsService', function ($resource, $q, $log, ENV, base64, _, ConfigService, LazyService) {
  var self = {
    items: {},
    init: function (token) {
      var auth = { Authorization: 'Basic ' + base64.encode(token.email + ':' + token.uuidx) };
      return $resource(ENV.apiEndpoint + 'targets/:id', {id: '@id'},
        {'save': { method: 'POST', timeout: timeout_, headers: auth || {}},
         'query': { method: 'GET', isArray: true, timeout: timeout_, headers: auth || {} },
         'get': { method: 'GET', timeout: timeout_, headers: auth || {} },
         'update': { method: 'PUT', timeout: timeout_, headers: auth || {}},
         'delete': { method: 'DELETE', timeout: timeout_, headers: auth || {}}
        }
      );
    },
    lazy: function (method, auth, settingData) {
      LazyService.add('MtargetsService', method, auth, settingData);
    },
    all: function (token, func, errfunc) {
      self.items = self.init(token).query(func, errfunc);
      return self.items;
    },
    update: function (mtargets) {
      ConfigService.setMtarget(JSON.stringify(mtargets));
      self.items = mtargets;
    },
    item: function (id) {
      return _.filter(self.items, {id: id})[0];
    },
    clean: function () {
      self.items = {};
      ConfigService.setMtarget(null);
    },
    remove: function (tid) {
      self.items = _.reject(self.items, function(e) { return e.tid === tid; });
      ConfigService.setMtarget(JSON.stringify(self.items));
    },
    merge: function (newList, oldList) {

      if (!oldList || oldList.length === 0) {
        return newList;
      }

      var tmpList = _.each(oldList, function (oldone) {
        if (oldone) {
          var newone = _.filter(newList, {id: oldone.id})[0];
          if (newone) {
            newone.keep = oldone.keep;
            newone.past = oldone.past;
            newone.status = oldone.status;
          }
        }
      });

      _.each(newList, function (newone) {
        if (newone) {
          var test = _.filter(oldList, {id: newone.id})[0];
          if (!test) {
            tmpList.unshift(newone);
          }
        }
      });

      self.items = tmpList;

      ConfigService.setMtarget(JSON.stringify(self.items));

      return self.items;
    }
  };

  return self;
})


.factory('ActionsService', function ($resource, ENV, base64, LazyService) {
  return {
    init: function (token) {
      var auth = { Authorization: 'Basic ' + base64.encode(token.email + ':' + token.uuidx) };
      return $resource(ENV.apiEndpoint + 'actions', {},
        {'save': { method: 'POST', timeout: timeout_, headers: auth || {} }}
      );
    },
    lazy: function (method, auth, settingData) {
      /*jshint camelcase: false */
      settingData.created_at = Math.floor(Date.now() / 1000);
      LazyService.add('ActionsService', method, auth, settingData);
    }
  };
})


.factory('LazyService', function ($injector) {
  var self = {
    opts: [],
    run: function () {
      angular.forEach(self.opts, function (opt) {
        var Service = $injector.get(opt.Service);
        var drv = Service.init(opt.auth);
        drv[opt.method](opt.settingData)
        .$promise.then(function () {
          self.opts.splice(self.opts.indexOf(opt), 1);
        });
      });
    },
    add: function (Service, method, auth, settingData) {
      self.opts.push({Service: Service, method: method, auth: auth, settingData: settingData});
    }
  };

  return self;
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
    },
    showAccessoryBar: function () {
      if(window.cordova && window.cordova.plugins.Keyboard) {
        $cordovaKeyboard.hideAccessoryBar(false);
      }
    },
    hideAccessoryBar: function () {
      if(window.cordova && window.cordova.plugins.Keyboard) {
        $cordovaKeyboard.hideAccessoryBar(true);
      }
    }
  };
})


.factory('AlertBadgesService', function (_, $log, ConfigService) {
  var items = [];
  return {
    targets: function () {
      items = ConfigService.getMtarget();
      return _.countBy(items, function (obj) {
        if (obj.past && (obj.freq > 0)) {
          return moment().diff(obj.past) > (obj.freq * 1000) ? 'count' : 'wait';
        } else {
          return obj.freq > 0 ? 'count' : 'wait';
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
