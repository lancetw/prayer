'use strict';
angular.module('Prayer.controllers', ['angular-underscore', 'angularMoment'])

.controller('IntroCtrl', function ($scope, $state, $ionicSlideBoxDelegate, $ionicPlatform, $ionicNavBarDelegate, $q, DeviceService, ConfigService, LoadingService) {

  var auth = ConfigService.getAuth();
  $ionicNavBarDelegate.showBackButton(false);

  $scope.Device = function () {
    LoadingService.loading();
    DeviceService.detect()
    .then(function (uuid) {
      if (auth && auth.uuidx === uuid) {
        $state.go('tab.prayer-index');
      } else {
        ConfigService.purge();
        LoadingService.done();
      }
    }, function () {
      var uuid = 'TESTONLY';
      if (auth && auth.uuidx === uuid) {
        $state.go('tab.prayer-index');
      } else {
        ConfigService.purge();
        LoadingService.done();
      }
    });
  };

  $scope.startApp = function() {
    $state.go('location');
  };

  $scope.next = function() {
    $ionicSlideBoxDelegate.next();
  };

  $scope.previous = function() {
    $ionicSlideBoxDelegate.previous();
  };

  $scope.slideChanged = function (index) {
    $scope.slideIndex = index;
  };

  $scope.toMain = function() {
    $state.go('main');
  };

  $ionicPlatform.ready(function () {
    $scope.Device();
  });
})

.controller('LocationCtrl', function ($scope, $state, $ionicPlatform, $ionicPopup, $log, $q, $timeout, $ionicNavBarDelegate, GPSService, ConfigService, LoadingService) {

  $ionicNavBarDelegate.showBackButton(true);

  $scope.GPS = function() {
    LoadingService.loading();
    GPSService.run()
    .then(function (gps) {
      $scope.map = {
        lat: gps.coords.latitude,
        lng: gps.coords.longitude
      };

      ConfigService.setMap($scope.map);

      if ($scope.map.lat && $scope.map.lng) {
        $timeout(function () { $state.go('map'); }, 200);
      } else {
        LoadingService.log();
      }
    }, function (err) {
      $ionicPopup.alert({
        title: '無法取得 GPS 資訊',
        template: err.message
      });
      $timeout(function () { $state.go('address'); }, 200);
    });
  };

  $scope.toAddress = function() {
    $state.go('address');
  };

  $scope.toMain = function() {
    $state.go('main');
  };

  $scope.rerun = function () {
    $scope.GPS();
  };

  $ionicPlatform.ready(function () {
    $scope.GPS();
  });

})

.controller('AddressCtrl', function ($scope, $state, $timeout, $ionicPlatform, $ionicModal, $log, $q, $ionicNavBarDelegate, LoadingService, ConfigService, MapService, KeyboardService) {

  $scope.init = function () {

    var q = $q.defer();

    try {
      KeyboardService.showAccessoryBar();

      $scope.map = {};

      $ionicModal.fromTemplateUrl('templates/map-addr.html', function ($ionicModal) {
        $scope.modal = $ionicModal;
      }, {
        scope: $scope,
        animation: 'slide-in-up'
      });

    } catch (err) {
      q.reject(err);
    }

    return q.promise;
  };

  $scope.openModal = function() {
    $scope.modal.show();
  };
  $scope.closeModal = function() {
    $scope.modal.hide();
  };

  $scope.fetchList = function (city, region) {
    LoadingService.loading(3000);

    $scope.map.code = 'TW';
    $scope.map.city = city;
    $scope.map.town = region;

    MapService.nearby($scope.map).query( function (data) {
      $scope.map.items = data;

      $timeout($scope.openModal, 100);

    }, function (err) {
      LoadingService.log(err);
    });
  };

  $scope.toLocation = function() {
    $state.go('location');
  };

  $scope.toMtarget = function (item) {
    $scope.map.item = item;
    $scope.map.items = undefined;
    $scope.closeModal();

    ConfigService.setMap($scope.map);

    $state.go('mtarget');
  };

  $ionicPlatform.ready(function () {
    $scope.init();
  });

})

.controller('MapCtrl', function ($scope, $state, $ionicPlatform, $log, $timeout, $q, $ionicNavBarDelegate, $ionicScrollDelegate, MapService, LoadingService, ConfigService, KeyboardService) {

  $scope.init = function () {
    var q = $q.defer();

    try {

      KeyboardService.hideAccessoryBar();

      LoadingService.loading();

      $scope.map = ConfigService.getMap();
      $scope.map.dist = 2000;

      var timeoutId = null;
      $scope.$watch('map.dist', function () {
        LoadingService.loading();
        if (timeoutId !== null) {return;}
        timeoutId = $timeout( function () {
          $timeout.cancel(timeoutId);
          timeoutId = null;

          $scope.fetchInfo().then(function () {
            $scope.fetchList();
          });

          $timeout(function () { $ionicScrollDelegate.scrollTop(); }, 50);
        }, 1000);
      });

      q.resolve($scope.map);

    } catch (err) {
      q.reject(err);
    }

    return q.promise;
  };

  $scope.fetchList = function () {
    MapService.nearby($scope.map).query( function (data) {
      $scope.map.items = {};
      if (data.length > 0) {
        $scope.map.items = data;
        LoadingService.done();
      } else {
        LoadingService.error('附近沒有教會，請嘗試增加距離');
      }
    }, function (err) {
      LoadingService.log(err);
    });
  };

  $scope.fetchInfo = function () {
    var q = $q.defer();
    MapService.find($scope.map).get( function (data) {
      $scope.map.code = data.code;
      $scope.map.city = data.city;
      $scope.map.town = data.town;

      q.resolve();
    }, function (err) {
      LoadingService.error('無法與伺服器連線');
      q.reject(err);
    });

    return q.promise;
  };

  $scope.toMtarget = function (item) {
    $scope.map.item = item;
    $scope.map.items = undefined;
    ConfigService.setMap($scope.map);
    $state.go('mtarget');
  };

  $ionicPlatform.ready(function () {
    $scope.init();
  });

})

.controller('MtargetCtrl', function ($scope, $state, $log, $q, $ionicPlatform, $ionicNavBarDelegate, ConfigService) {

  $scope.init = function () {
    var q = $q.defer();

    try {
      $ionicNavBarDelegate.showBackButton(true);

      $scope.map = ConfigService.getMap();

      $scope.mtarget = {};
      $scope.mtarget.sinner = false;
      $scope.mtarget.freqs = [
        {name:'一天', val: 86400},
        {name:'兩天', val: 86400*2},
        {name:'三天', val: 86400*3},
        {name:'四天', val: 86400*4},
        {name:'五天', val: 86400*5},
        {name:'六天', val: 86400*6},
        {name:'七天', val: 86400*7}
      ];
      $scope.mtarget.freq = $scope.mtarget.freqs[2].val;

      q.resolve($scope.mtarget);

    } catch (err) {
      q.reject(err);
    }

    return q.promise;
  };

  $scope.mtargetSetup = function () {

    if (!$scope.map.item) {
      $scope.map.item = {};
      $scope.map.item.ocname = $scope.map.ocname;
      $scope.map.item.lat = 0;
      $scope.map.item.lng = 0;

      ConfigService.setMap($scope.map);
    }

    if ($scope.mtarget.name) {
      ConfigService.setMtarget($scope.mtarget);
      $state.go('main');
    }
  };

  $ionicPlatform.ready(function () {
    $scope.init();
  });

})

.controller('MainCtrl', function ($scope, $state, $ionicPlatform, $timeout, $log, $q, $location, $ionicHistory, ConfigService, DeviceService, NotifyService, KeyboardService, MtargetsService, LoadingService, UserAction) {

  $scope.init = function () {
    var q = $q.defer();

    try {
      $scope.map = ConfigService.getMap();
      $scope.mtarget = ConfigService.getMtarget();
      $scope.device = {
        uuid: 0
      };
      $scope.user = {
        email: '',
        subscription: false
      };
      $scope.block = {
        user: true,
        church: false,
        mtarget: false
      };

      if ($scope.map && $scope.map.item.hasOwnProperty('ocname')) {
        $scope.block.church = true;
      }
      if ($scope.mtarget && $scope.mtarget.hasOwnProperty('freq')) {
        $scope.block.mtarget = true;
      }

      q.resolve();

    } catch (err) {
      q.reject(err);
    }

    return q.promise;
  };

  $scope.Device = function () {
    var q = $q.defer();

    DeviceService.detect()
    .then(function (uuid) {
      $scope.device.uuid = uuid;
      q.resolve($scope.device.uuid);
    }, function () {
      $scope.device.uuid = 'TESTONLY';
      q.resolve($scope.device.uuid);
    });

    return q.promise;
  };

  $scope.register = function () {
    KeyboardService.close();

    $scope.Device().then(function () {
      LoadingService.loading();

      $scope.auth = {
        email: $scope.user.email,
        uuidx: $scope.device.uuid
      };

      UserAction.setAuth($scope.auth);

      if ($scope.map && $scope.map.item && $scope.map.item.hasOwnProperty('ocname') && $scope.mtarget.name) {
        UserAction.addUser($scope.user)
        .then(function () {
          return UserAction.setting($scope.user);
        })
        .then(function () {
          return UserAction.joinChurch($scope.map);
        })
        .then(function () {
          return UserAction.addMtarget($scope.mtarget, true);
        })
        .then(function () {
          NotifyService.run($scope.mtarget);
          $scope.Login();
        });
      } else {
        UserAction.checkUser($scope.user)
        .then(function () {
          return UserAction.setting($scope.user);
        })
        .then(function () {
          $scope.Login();
        });
      }
    });
  };

  $scope.Login = function () {
    ConfigService.setAuth($scope.auth);
    MtargetsService.clean();

    $state.go('tab.prayer-index');
  };

  $scope.toIntro = function () {
    $state.go('intro');
  };

  $ionicPlatform.ready(function () {
    $scope.init();
  });
})

.controller('PrayerIndexCtrl', function ($ionicPlatform, $log, $q, $scope, $state, $timeout, $ionicModal, $ionicListDelegate, $ionicNavBarDelegate, $interval, ActionsService, ChurchesService, LoadingService, ConfigService, NotifyService, KeyboardService, UserAction, MtargetsService) {

  $scope.init = function () {
    var q = $q.defer();
    try {
      $ionicNavBarDelegate.showBackButton(false);

      $ionicModal.fromTemplateUrl('templates/mtarget-new.html', function ($ionicModal) {
        $scope.modal = $ionicModal;
      }, {
        scope: $scope,
        animation: 'slide-in-up'
      });

      NotifyService.init();

      $scope.auth = ConfigService.getAuth();

      q.resolve($scope.auth);

    } catch (err) {
      q.reject(err);
    }
    return q.promise;
  };

  $scope.doRefresh = function () {
    $scope.showChurch();
    $scope.prepareTargets(true).then(function () {
      $scope.$broadcast('scroll.refreshComplete');
    }, function () {
      $scope.$broadcast('scroll.refreshComplete');
    });
  };

  $scope.showChurch = function () {
    var q = $q.defer();
    var drv = ChurchesService.init($scope.auth);
    drv.get().$promise.then(function (data) {
      $scope.church = data;
      q.resolve(data);
    }, function (err) {
      q.reject(err);
    });

    return q.promise;
  };

  $scope.openMtargetModal = function () {
    $scope.mtarget = {};
    $scope.mtarget.sinner = false;
    $scope.mtarget.freqs = [
      {name:'一天', val: 86400},
      {name:'兩天', val: 86400*2},
      {name:'三天', val: 86400*3},
      {name:'四天', val: 86400*4},
      {name:'五天', val: 86400*5},
      {name:'六天', val: 86400*6},
      {name:'七天', val: 86400*7}
    ];
    $scope.mtarget.freq = $scope.mtarget.freqs[2].val;

    $scope.modal.show();
  };

  $scope.closeMtargetModal = function () {
    $scope.modal.hide();
  };

  $scope.createMtarget = function () {
    KeyboardService.close();

    LoadingService.loading();
    UserAction.setAuth($scope.auth);
    UserAction.addMtarget($scope.mtarget).then(function (data) {
      $scope.mtarget = data;
      $scope.mtarget.status = true;
      $scope.mtarget.past = 0;
      $scope.mtarget.keep = 0;
      $scope.mtarget.baptized = 0;
      $scope.mtarget.meeter = 0;
      $scope.mtargets.unshift($scope.mtarget);
      $scope.tracking($scope.mtarget);

      LoadingService.msg('新增完成');
      $scope.closeMtargetModal();
      MtargetsService.update($scope.mtargets);
      LoadingService.done();

    }, function (err) {
      if (+err.status === 302) {
        LoadingService.error('重複的禱告對象');
      } else {
        LoadingService.error('無法新增對象，請重試一次');
      }
    });
  };

  $scope.removeMtarget = function (tid) {
    var settingData = {
      id: tid
    };
    var drv = MtargetsService.init($scope.auth);
    if (!$scope.mtargets || $scope.mtargets.length === 0) {
      $scope.showDeleteState = false;
      $ionicListDelegate.showDelete($scope.showDeleteState);
    }
    MtargetsService.remove(tid);

    drv.delete(settingData)
    .$promise.then(function () {
      NotifyService.cancel(tid);
    }, function (err) {
      LoadingService.log(err);
    });
  };

  $scope.Action = function () {
    var settingData = {
      tid: $scope.action.tid
    };
    var drv = ActionsService.init($scope.auth);
    LoadingService.loading();
    return drv.save(settingData)
    .$promise.then(function () {
      var item = MtargetsService.item($scope.action.tid);
      item.status = false;
      item.past = new Date();

      MtargetsService.update($scope.mtargets);
      NotifyService.run(item);
      LoadingService.done();
    }, function (err) {
      LoadingService.log(err);
    });
  };

  $scope.prepareTargets = function (force) {
    force = (typeof force === 'undefined') ? false : force;

    var q = $q.defer();

    $scope.tracking = function (item) {
      $interval(function () {
        if (!item.status && item.past !== 0) {
          item.keep = $scope.now.diff(item.past);
          if (item.keep > 600000) { // 10 分鐘
            item.status = true;
            MtargetsService.update($scope.mtargets);
          }
        }
      }, 1000);
    };

    $scope.moveItem = function(mtarget, fromIndex, toIndex) {
      $scope.mtargets.splice(fromIndex, 1);
      $scope.mtargets.splice(toIndex, 0, mtarget);
      MtargetsService.update($scope.mtargets);
    };

    try {
      if (force) {
        $scope.mtargets_ = angular.copy($scope.mtargets);
        ConfigService.clearMtarget();
      }

      $scope.now = moment();
      $scope.timedUpdate = $interval(function () {
        $scope.now = moment();
      }, 1000);

      $scope.mtargets = ConfigService.getMtarget();

      if (!$scope.mtargets) {
        $scope.mtargets = MtargetsService.all($scope.auth, function () {

          // 合併新舊資料
          if ($scope.mtargets_) {
            $scope.mtargets = MtargetsService.merge($scope.mtargets, $scope.mtargets_);
          }

          if (!$scope.mtargets || $scope.mtargets.length === 0) {
            q.resolve($scope.mtargets);
          }

          angular.forEach($scope.mtargets, function (item, index) {

            if (typeof item.status === 'undefined') { item.status = true; }
            if (typeof item.past === 'undefined') { item.past = 0; }
            if (typeof item.keep === 'undefined') { item.keep = 0; }

            item.sinner = +item.sinner;
            item.baptized = +item.baptized;
            item.meeter = +item.meeter;
            $scope.tracking(item);

            if (index >= $scope.mtargets.length - 1) {
              MtargetsService.update($scope.mtargets);
              q.resolve($scope.mtargets);
            }
          });
        });

      } else {
        MtargetsService.update($scope.mtargets);
        angular.forEach($scope.mtargets, function(item, index) {
          item.sinner = +item.sinner;
          item.baptized = +item.baptized;
          item.meeter = +item.meeter;
          $scope.tracking(item);

          if (index >= $scope.mtargets.length - 1) {
            q.resolve($scope.mtargets);
          }
        });
      }
    } catch (err) {
      q.reject(err);
    }

    return q.promise;
  };

  $scope.prayClick = function(tid, e) {
    e.preventDefault();

    $scope.action = {};
    $scope.action.tid = tid;
    return $scope.Action();
  };

  $scope.showDelete = function () {
    if ($scope.mtargets.length > 0) {
      $ionicListDelegate.showDelete($scope.showDeleteState = !$scope.showDeleteState);
    }
  };


  $scope.toogleChurchPanel = function () {
    $scope.churchPanelState = !$scope.churchPanelState;
  };

  $ionicPlatform.ready(function () {
    $scope.init()
    .then(function () {
      return $scope.showChurch();
    }).then(function () {
      LoadingService.loading();
      return $scope.prepareTargets();
    }).then(function () {
      LoadingService.done();
    }, function () {
      LoadingService.log();
    });
  });

})

.controller('PrayerDetailCtrl', function ($scope, $state, $stateParams, $ionicPlatform, $location, $log, $q, MtargetsService, LoadingService, ConfigService, KeyboardService, UserAction, focus) {

  $scope.init = function () {
    focus();

    var q = $q.defer();
    try {
      $scope.auth = ConfigService.getAuth();
      q.resolve($scope.auth);

      $scope.mtarget = MtargetsService.item($stateParams.mtargetId);

      q.resolve($scope.mtarget);
    } catch (err) {
      q.reject(err);
    }

    return q.promise;
  };

  $scope.saveMtarget = function () {

    KeyboardService.close();

    UserAction.setAuth($scope.auth);
    UserAction.updateMtarget($scope.mtarget)
    .then(function () {
      $state.go('tab.prayer-index');
    });
  };

  $scope.updateMtargetFreq = function () {
    $scope.mtarget.freq = +$scope.mtarget.freq;
    if ($scope.mtarget.freq > 86400 * 6) {
      $scope.mtarget.freq = 0;
    } else {
      $scope.mtarget.freq += 86400;
    }
  };

  $scope.updateMtargetName = function () {
    $scope.mtarget.name = '';
  };

  $ionicPlatform.ready(function () {
    $scope.init();
    if (!$scope.mtarget) {
      $state.go('tab.prayer-index', {}, {reload: true});
    }
  });

})

.controller('MissionsCtrl', function ($ionicPlatform) {
  $ionicPlatform.ready(function () {

  });
})

.controller('ResourcesCtrl', function ($ionicPlatform) {
  $ionicPlatform.ready(function () {

  });
})

.controller('AboutsCtrl', function ($ionicPlatform, $ionicScrollDelegate, $ionicHistory, $scope, $state, ConfigService) {
  $scope.doLogout = function () {
    $ionicScrollDelegate.scrollTop();
    ConfigService.purge();
    $state.go('intro', {}, {reload: true});
  };

  $ionicPlatform.ready(function () {
  });
})


.controller('TWZipCodeCtrl', function ($ionicPopup, $log, $q, $scope, TWZipCode) {

  TWZipCode.all().then(function (sel) {
    $scope.twZipCodeData = sel;
  });

  $scope.regionSubmit = function () {
    $scope.twzipcode.city = '';
    $scope.twzipcode.region = ($scope.invert($scope.twzipcode.citySel))[$scope.twzipcode.regionSel];
    $scope.each($scope.twZipCodeData, function (ele, _city) {
      $scope.each(ele, function (_ele2, _region) {
        if (_region === $scope.twzipcode.region) {
          $scope.twzipcode.city = _city;
        }
      });
    });

    if ($scope.twzipcode.city && $scope.twzipcode.region) {
      $scope.fetchList($scope.twzipcode.city, $scope.twzipcode.region);
    }

  };

})

.controller('TabCtrl', function ($scope, $log, $q, AlertBadgesService) {
  $scope.badges = {};

  $scope.$watch(
    function () {
      return AlertBadgesService.targets().avail;
    },
    function (newVal) {
      $scope.badges.prayer = newVal;
    }
  );

})



;
