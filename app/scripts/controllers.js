'use strict';
angular.module('Prayer.controllers', ['angular-underscore', 'angularMoment'])

.controller('IntroCtrl', function ($scope, $state, $ionicSlideBoxDelegate, $ionicPlatform, $ionicNavBarDelegate, $q, DeviceService, ConfigService, LoadingService, NotifyService) {

  var auth = ConfigService.getAuth();
  $ionicNavBarDelegate.showBackButton(false);

  $scope.Device = function () {
    DeviceService.detect()
    .then(function (uuid) {
      if (auth && auth.uuidx === uuid) {
        $state.go('tab.prayer-index', {}, {cache: false, reload: true});
      } else {
        ConfigService.purge();
        NotifyService.purge();
        LoadingService.done();
      }
    }, function () {
      var uuid = 'TESTONLY';
      if (auth && auth.uuidx === uuid) {
        $state.go('tab.prayer-index', {}, {cache: false, reload: true});
      } else {
        ConfigService.purge();
        NotifyService.purge();
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
    ConfigService.purge();
    $state.go('main');
  };

  $ionicPlatform.ready(function () {
    $scope.Device();
  });
})

.controller('LocationCtrl', function ($scope, $state, $stateParams, $ionicPlatform, $ionicPopup, $log, $q, $timeout, $ionicNavBarDelegate, GPSService, ConfigService, LoadingService) {

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
        $timeout(function () {
          $state.go('map', $stateParams);
        }, 200);
      } else {
        LoadingService.log();
      }
    }, function (err) {
      $ionicPopup.alert({
        title: '無法取得 GPS 資訊',
        template: err.message_
      });
      $timeout(function () {
        $state.go('address', $stateParams);
      }, 200);
    });
  };

  $scope.showLogin = function () {
    if ($stateParams && $stateParams.action === 'changeChurch') {
      $scope.showLoginIsNeeded = false;
    } else {
      $scope.showLoginIsNeeded = true;
    }
  };

  $scope.toAddress = function () {
    $state.go('address', $stateParams);
  };

  $scope.toKeyword = function () {
    $state.go('keyword', $stateParams);
  };

  $scope.toMain = function () {
    ConfigService.purge();
    $state.go('main');
  };

  $scope.rerun = function () {
    $scope.GPS();
  };

  $ionicPlatform.ready(function () {
    $scope.showLogin();
    $scope.GPS();
  });

})

.controller('AddressCtrl', function ($scope, $state, $stateParams, $timeout, $ionicPlatform, $ionicModal, $log, $q, $ionicNavBarDelegate, LoadingService, ConfigService, MapService, KeyboardService) {

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

      $scope.map.items = [];
      $scope.map.page = 1;
      $scope.map.total = 0;
      $scope.modalIsOpening = false;

    } catch (err) {
      q.reject(err);
    }

    return q.promise;
  };

  $scope.openModal = function() {
    $scope.modal.show();
    $scope.modalIsOpening = true;
  };

  $scope.closeModal = function() {
    $scope.modal.hide();
    $scope.modalIsOpening = false;
  };

  $scope.fetchList = function (city, region, filter) {
    LoadingService.loading();

    $scope.map.code = 'TW';
    $scope.map.city = city;
    $scope.map.town = region;
    $scope.map.filter = filter;

    $scope.loadMoreData();

    $timeout(function () {
      $scope.openModal();
    }, 100);
  };

  $scope.loadMoreData = function() {
    /*jshint camelcase: false */
    MapService.nearby($scope.map).query( function (resp) {
      $scope.map.total = resp.total;
      $scope.map.lastPage = resp.last_page;
      $scope.map.items = $scope.map.items.concat(resp.data);
      $scope.$broadcast('scroll.infiniteScrollComplete');
      $scope.map.page += 1;

      LoadingService.done();

      if ($scope.map.total === 0) {
        if ($scope.map.filter) {
          LoadingService.msg($scope.map.city + $scope.map.town + '沒有關於「' + $scope.map.filter + '」的資料。');
        } else {
          LoadingService.msg($scope.map.city + $scope.map.town + '尚無資料。');
        }
      }

    }, function () {
      LoadingService.error('無法與伺服器連線');
    });

  };

  $scope.moreDataCanBeLoaded = function () {
    if (!$scope.modalIsOpening) {
      return false;
    }
    if ($scope.map && $scope.map.items && ($scope.map.total > $scope.map.items.length)) {
      return true;
    } else {
      return false;
    }
  };

  $scope.toLocation = function() {
    $state.go('location', $stateParams);
  };

  $scope.toKeyword = function () {
    $state.go('keyword', $stateParams);
  };

  $scope.toMtarget = function (item) {
    $scope.map.item = item;
    $scope.map.items = undefined;
    $scope.closeModal();

    ConfigService.setMap($scope.map);

    if ($stateParams && $stateParams.action === 'changeChurch') {
      if ($scope.map.item) {
        $state.go('reset-church', $stateParams);
      } else {
        $state.go('custom-church', $stateParams);
      }
    } else {
      $state.go('mtarget');
    }
  };

  $scope.init();
})


.controller('KeywordCtrl', function ($scope, $state, $stateParams, $timeout, $ionicPlatform, $ionicModal, $log, $q, $ionicNavBarDelegate, LoadingService, ConfigService, MapService, KeyboardService) {

  $scope.init = function () {

    var q = $q.defer();

    try {
      KeyboardService.hideAccessoryBar();
      $scope.map = {};

      $ionicModal.fromTemplateUrl('templates/map-addr.html', function ($ionicModal) {
        $scope.modal = $ionicModal;
      }, {
        scope: $scope,
        animation: 'slide-in-up'
      });

      $scope.map.items = [];
      $scope.map.page = 1;
      $scope.map.total = 0;
      $scope.modalIsOpening = false;

    } catch (err) {
      q.reject(err);
    }

    return q.promise;
  };

  $scope.openModal = function() {
    $scope.modal.show();
    $scope.modalIsOpening = true;
  };
  $scope.closeModal = function() {
    $scope.modal.hide();
    $scope.modalIsOpening = false;
  };

  $scope.fetchList = function (keyword) {
    LoadingService.loading();

    $scope.map.keyword = keyword;

    $scope.loadMoreData();

    $timeout(function () {
      $scope.openModal();
    }, 100);
  };

  $scope.loadMoreData = function() {
    /*jshint camelcase: false */
    MapService.keyword($scope.map).query( function (resp) {
      $scope.map.total = resp.total;
      $scope.map.lastPage = resp.last_page;
      $scope.map.items = $scope.map.items.concat(resp.data);
      $scope.$broadcast('scroll.infiniteScrollComplete');
      $scope.map.page += 1;

      LoadingService.done();

      if ($scope.map.total === 0) {
        LoadingService.msg('查無「' + $scope.map.keyword + '」的資料。');
      }

    }, function () {
      LoadingService.error('無法與伺服器連線');
    });

  };

  $scope.moreDataCanBeLoaded = function () {
    if (!$scope.modalIsOpening) {
      return false;
    }
    if ($scope.map && $scope.map.items && ($scope.map.total > $scope.map.items.length)) {
      return true;
    } else {
      return false;
    }
  };

  $scope.toLocation = function() {
    $state.go('location', $stateParams);
  };

  $scope.toMtarget = function (item) {
    $scope.map.item = item;
    $scope.map.items = undefined;
    $scope.closeModal();

    ConfigService.setMap($scope.map);

    if ($stateParams && $stateParams.action === 'changeChurch') {
      if ($scope.map.item) {
        $state.go('reset-church', $stateParams);
      } else {
        $state.go('custom-church', $stateParams);
      }
    } else {
      $state.go('mtarget');
    }
  };

  $scope.init();

})


.controller('MapCtrl', function ($scope, $state, $stateParams, $ionicPlatform, $log, $timeout, $q, $ionicNavBarDelegate, $ionicScrollDelegate, MapService, LoadingService, ConfigService, KeyboardService) {

  $scope.init = function () {
    var q = $q.defer();

    try {

      KeyboardService.hideAccessoryBar();

      LoadingService.loading();

      $scope.map = ConfigService.getMap();
      $scope.map.dist = 2000;
      $scope.map.items = [];
      $scope.map.page = 1;
      $scope.map.total = 0;

      $scope.fetchInfo().then(function () {
        $scope.loadMoreData();
      });

      var timeoutId = null;
      $scope.$watch('map.dist', function () {
        LoadingService.loading();
        if (timeoutId !== null) {return;}
        timeoutId = $timeout( function () {
          $timeout.cancel(timeoutId);
          timeoutId = null;

          $scope.map.items = [];
          $scope.map.page = 1;

          $timeout(function () { $ionicScrollDelegate.scrollTop(); }, 50);
        }, 1000);
      });

      q.resolve($scope.map);

    } catch (err) {
      q.reject(err);
    }

    return q.promise;
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

  $scope.loadMoreData = function() {
    /*jshint camelcase: false */
    MapService.nearby($scope.map).query( function (resp) {
      $scope.map.total = resp.total;
      $scope.map.lastPage = resp.last_page;
      $scope.map.items = $scope.map.items.concat(resp.data);
      $scope.$broadcast('scroll.infiniteScrollComplete');
      $scope.map.page += 1;

      LoadingService.done();

    }, function (err) {
      LoadingService.log(err);
    });

  };

  $scope.moreDataCanBeLoaded = function () {
    if ($scope.map && $scope.map.items && ($scope.map.total > $scope.map.items.length)) {
      return true;
    } else {
      return false;
    }
  };

  $scope.toMtarget = function (item) {
    $scope.map.item = item;
    $scope.map.items = undefined;
    ConfigService.setMap($scope.map);

    if ($stateParams && $stateParams.action === 'changeChurch') {
      if ($scope.map.item) {
        $state.go('reset-church', $stateParams);
      } else {
        $state.go('custom-church', $stateParams);
      }
    } else {
      $state.go('mtarget');
    }
  };

  $scope.init();
})


.controller('CustomChurchCtrl', function ($scope, $state, $stateParams, $ionicPlatform, $log, $timeout, $q, $ionicNavBarDelegate, $ionicScrollDelegate, MapService, LoadingService, ConfigService) {

  $scope.init = function () {
    var q = $q.defer();

    try {
      $ionicNavBarDelegate.showBackButton(true);

      $scope.map = {
        item: {}
      };

      q.resolve('init');

    } catch (err) {
      q.reject(err);
    }

    return q.promise;
  };

  $scope.toResetChurch = function () {
    $scope.map.item.lat = 0;
    $scope.map.item.lng = 0;

    ConfigService.setMap($scope.map);

    if ($stateParams && $stateParams.action === 'changeChurch' && $scope.map.item) {
      $state.go('reset-church', $stateParams);
    } else {
      $state.go('mtarget');
    }
  };

  $scope.init();
})


.controller('MtargetCtrl', function ($scope, $state, $log, $q, $ionicPlatform, $ionicNavBarDelegate, ConfigService, FreqService) {

  $scope.init = function () {
    var q = $q.defer();

    try {
      $ionicNavBarDelegate.showBackButton(true);

      $scope.map = ConfigService.getMap();

      $scope.mtarget = {};
      $scope.mtarget.sinner = false;
      $scope.mtarget.freqs = FreqService.getTable();
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

  $scope.init();
})


.controller('ResetChurchCtrl', function ($scope, $state, $stateParams, $timeout, $ionicHistory, ConfigService, UserAction, LoadingService) {

  $scope.saveChurch = function () {
    $scope.auth = ConfigService.getAuth();
    $scope.map = ConfigService.getMap();

    if (!$scope.map || !$scope.map.item || !$scope.map.item.hasOwnProperty('ocname')) {
      $ionicHistory.clearCache();
      $ionicHistory.clearHistory();
      $timeout(function () {
        $state.go('tab.prayer-index', $stateParams, {cache: false, reload: true});
      }, 1000);

    } else {

      UserAction.setAuth($scope.auth);
      UserAction.joinChurch($scope.map).then(function () {
        $ionicHistory.clearCache();
        $ionicHistory.clearHistory();
        $timeout(function () {
          $state.go('tab.prayer-index', $stateParams, {cache: false, reload: true});
        }, 1000);
      }, function (err) {
        LoadingService.log(err);
        $state.go('location', $stateParams, {cache: false, reload: true});
      });
    }

  };

  if ($stateParams && $stateParams.action === 'changeChurch') {
    $scope.saveChurch();
  }
})


.controller('MainCtrl', function ($scope, $state, $stateParams, $ionicPlatform, $timeout, $log, $q, $location, $ionicHistory, ConfigService, DeviceService, NotifyService, KeyboardService, MtargetsService, LoadingService, UserAction) {

  $scope.init = function () {
    var q = $q.defer();

    $ionicPlatform.ready().then(function () {
      KeyboardService.hideAccessoryBar();
    });

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

      if ($scope.map && $scope.map.item && $scope.map.item.hasOwnProperty('ocname')) {
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

      if ($scope.map && $scope.map.item && $scope.map.item.hasOwnProperty('ocname') && $scope.mtarget.name && $stateParams.action !== 'changeChurch') {
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
        .then(function (data) {
          $scope.mtarget = data;
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
    NotifyService.purge();
    $ionicHistory.clearCache();
    $ionicHistory.clearHistory();
    $timeout(function () {
      $state.go('tab.prayer-index', $stateParams, {cache: false, reload: true});
    }, 1000);
  };

  $scope.toIntro = function () {
    $state.go('intro');
  };

  $ionicPlatform.ready(function () {
    $scope.init();
  });
})

.controller('PrayerIndexCtrl', function ($ionicPlatform, $log, $q, $scope, $rootScope, $cordovaNetwork, $state, $stateParams, $timeout, $ionicPopup, $ionicModal, $ionicListDelegate, $ionicNavBarDelegate, $ionicScrollDelegate, $interval, $ionicHistory, ActionsService, ChurchesService, LoadingService, ConfigService, NotifyService, KeyboardService, UserAction, MtargetsService, FreqService, LazyService) {

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
      $scope.church = ConfigService.getChurch();

      if (!$scope.church || ($stateParams && $stateParams.action === 'changeChurch')) {
        $stateParams.action = '';
        $scope.showChurch();
      }

      if ($stateParams && $stateParams.action === 'forceReload') {
        $stateParams.action = '';
        $rootScope.doRefresh();
      }

      $scope.checkEmptyTips();

      q.resolve($scope.auth);

    } catch (err) {
      q.reject(err);
    }
    return q.promise;
  };

  $scope.checkEmptyTips = function () {
    if (!$scope.mtargets || $scope.mtargets.length === 0) {
      $scope.showEmptyTips = true;
    } else {
      $scope.showEmptyTips = false;
    }
  };

  $rootScope.doRefresh = function () {
    var q = $q.defer();

    $scope.menuIsActive = false;
    $scope.showChurch();
    $scope.prepareTargets(true).then(function () {
      $scope.checkEmptyTips();
      $rootScope.checkOfflineMode(false);
      $scope.$broadcast('scroll.refreshComplete');
      q.resolve('refreshed');
    }, function (err) {
      $scope.checkEmptyTips();
      $rootScope.checkOfflineMode(true);
      $scope.$broadcast('scroll.refreshComplete');
      q.reject(err);
    });

    return q.promise;
  };

  $scope.resetChurch = function () {
    var confirmPopup = $ionicPopup.confirm({
      title: '更換教會確認',
      template: '確定要更換教會？',
      okText: '我確定',
      cancelText: '取消'
    });
    confirmPopup.then(function(res) {
      if(res) {
        LoadingService.loading();
        $rootScope.doRefresh().then(function () {
          LoadingService.done();
          $state.go('location', {action: 'changeChurch'}, {cache: false, reload: true});
        }, function (err) {
          if (+err.status === 0) {
            LoadingService.error('請先連上網路才能更換教會');
          } else {
            LoadingService.log(err);
          }

        });
      }
    });
  };

  $scope.showChurch = function () {
    var q = $q.defer();

    var drv = ChurchesService.init($scope.auth);
    drv.get().$promise.then(function (data) {
      $scope.church = data;
      ConfigService.setChurch($scope.church);
      q.resolve(data);
    }, function (err) {
      q.reject(err);
    });

    return q.promise;
  };

  $scope.openMtargetModal = function () {
    $scope.mtarget = {};
    $scope.mtarget.sinner = false;
    $scope.mtarget.freqs = FreqService.getTable();
    $scope.mtarget.freq = $scope.mtarget.freqs[2].val;

    $scope.modal.show();

    $timeout(function () {
      $scope.menuIsActive = false;
      $ionicListDelegate.showDelete($scope.showDeleteState = false);
    }, 200);

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
      $scope.checkEmptyTips();

      LoadingService.msg('新增完成，開始點擊禱告吧！^_^');

      $scope.closeMtargetModal();
      $ionicScrollDelegate.scrollTop();
      MtargetsService.update($scope.mtargets);

      NotifyService.run($scope.mtarget);

      $timeout(function () {
        LoadingService.done();
      }, 1000);

    }, function (err) {
      if (+err.status === 302) {
        LoadingService.error('重複的禱告對象');
      } else {
        LoadingService.error('請先連上網路，才能新增對象');
      }
    });
  };

  $scope.removeMtargetConfirm = function (index, name, tid) {
    var confirmPopup = $ionicPopup.confirm({
      title: '刪除禱告對象確認',
      template: '確定要刪除「' + name + '」？',
      okText: '我確定',
      cancelText: '取消'
    });
    confirmPopup.then(function(res) {
      if(res) {
        $scope.mtargets.splice(index, 1);
        $scope.removeMtarget(tid);
      }
    });
  };

  $scope.removeMtarget = function (tid) {

    if (!$scope.mtargets || $scope.mtargets.length === 0) {
      $ionicListDelegate.showDelete($scope.showDeleteState = false);
    }

    MtargetsService.remove(tid);

    UserAction.setAuth($scope.auth);
    UserAction.removeMtarget(tid).then(function () {
      NotifyService.cancel(tid);
      ConfigService.setMtarget($scope.mtargets);
      if (!$scope.mtargets || $scope.mtargets.length === 0) {
        NotifyService.purge();
      }
      $scope.checkEmptyTips();
      LoadingService.done();
      $rootScope.checkOfflineMode(false);
    }, function () {
      if (!$scope.mtargets || $scope.mtargets.length === 0) {
        NotifyService.purge();
      }
      $scope.checkEmptyTips();
      $rootScope.checkOfflineMode(true);
    });
  };

  $scope.Action = function () {
    var item = MtargetsService.item($scope.action.tid);
    item.status = false;
    item.past = new Date();

    NotifyService.cancel(item.id);
    NotifyService.run(item);

    MtargetsService.update($scope.mtargets);

    UserAction.setAuth($scope.auth);
    UserAction.doAction($scope.action).then(function () {
      $rootScope.checkOfflineMode(false);
      LoadingService.done();
    }, function () {
      $rootScope.checkOfflineMode(true);
    });

  };

  $scope.prepareTargets = function (force) {
    force = (typeof force === 'undefined') ? false : force;

    var q = $q.defer();

    $scope.now = moment();
    $scope.timedUpdate = $interval(function () {
      $scope.now = moment();
    }, 1000);

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

    UserAction.checkOnline().then(function () {
      try {

        if (force) {
          $scope.mtargets_ = angular.copy($scope.mtargets);
          MtargetsService.clean();
          LazyService.run();
        }

        $scope.mtargets = ConfigService.getMtarget();

        if (!$scope.mtargets || $scope.mtargets === null) {
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

              item.id = +item.id;
              item.sinner = +item.sinner;
              item.baptized = +item.baptized;
              item.meeter = +item.meeter;
              $scope.tracking(item);

              if (index >= $scope.mtargets.length - 1) {
                MtargetsService.update($scope.mtargets);
                q.resolve($scope.mtargets);
              }
            });
          }, function (err) {
            q.reject(err);
          });

        } else {
          MtargetsService.update($scope.mtargets);
          angular.forEach($scope.mtargets, function(item, index) {
            item.id = +item.id;
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

    }, function (err) {
      if (!$scope.mtargets || $scope.mtargets === null) {
        $scope.mtargets = ConfigService.getMtarget();
      }

      angular.forEach($scope.mtargets, function (item, index) {

        if (typeof item.status === 'undefined') { item.status = true; }
        if (typeof item.past === 'undefined') { item.past = 0; }
        if (typeof item.keep === 'undefined') { item.keep = 0; }

        item.id = +item.id;
        item.sinner = +item.sinner;
        item.baptized = +item.baptized;
        item.meeter = +item.meeter;
        $scope.tracking(item);

        if (index >= $scope.mtargets.length - 1) {
          MtargetsService.update($scope.mtargets);
          q.reject(err);
        }
      });
    });

    return q.promise;
  };

  $scope.prayClick = function(tid, e) {
    e.preventDefault();

    $scope.action = {};
    $scope.action.tid = tid;
    return $scope.Action();
  };

  $scope.showDelete = function () {
    if ($scope.mtargets && $scope.mtargets.length > 0) {
      $ionicListDelegate.showDelete($scope.showDeleteState = !$scope.showDeleteState);
    }
  };

  $scope.menuIsActive = false;
  $scope.toogleChurchPanel = function () {
    $ionicListDelegate.showDelete($scope.showDeleteState = false);
    $scope.menuIsActive = !$scope.menuIsActive;
  };

  $scope.init().then(function () {
    $interval(function () {
      $rootScope.checkOfflineMode();
      if (!$rootScope.offlineMode) {
        LazyService.run();
      }
    }, 60000); // 每分鐘檢查一次

    return $scope.prepareTargets();
  }).then(function () {
    $scope.checkEmptyTips();
    LoadingService.done();
    $rootScope.checkOfflineMode(false);
  }, function (err) {
    if (+err.status === 401) {
      $ionicHistory.clearCache();
      $ionicHistory.clearHistory();
      $state.go('intro', {}, {cache: false, reload: true});
    } else if (+err.status === 0) {
      $scope.checkEmptyTips();
      $rootScope.checkOfflineMode(true);
    } else {
      //LoadingService.log(err);
    }

  });


})

.controller('PrayerDetailCtrl', function ($scope, $rootScope, $state, $stateParams, $ionicHistory, $ionicPlatform, $location, $log, $q, $timeout, MtargetsService, LoadingService, ConfigService, FreqService, KeyboardService, UserAction, focus) {

  $scope.init = function () {
    focus();
    var q = $q.defer();
    try {
      $scope.auth = ConfigService.getAuth();
      $scope.mtarget = MtargetsService.item(parseInt($stateParams.mtargetId));
      $scope.mtarget.freqName = FreqService.getFreqName($scope.mtarget.freq);

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
      $rootScope.checkOfflineMode(false);
      $timeout(function () {
        $rootScope.doRefresh().then(function () {
          $ionicHistory.goBack();
        }, function () {
          $ionicHistory.goBack();
        });
      }, 1000);
    }, function (err) {
      if (+err.status === 0) {
        $rootScope.checkOfflineMode(true);
        $timeout(function () {
          $rootScope.doRefresh().then(function () {
            $ionicHistory.goBack();
          }, function () {
            $ionicHistory.goBack();
          });
        }, 1000);
      } else if (+err.status === 403) {
        LoadingService.msg('名稱不能空白');
      } else {
        LoadingService.log(err);
        $timeout(function () {
          $ionicHistory.goBack();
        }, 1000);
      }

    });
  };

  $scope.updateMtargetFreq = function () {
    $scope.mtarget.freq = FreqService.getNextFreq($scope.mtarget.freq);
    $scope.mtarget.freqName = FreqService.getFreqName($scope.mtarget.freq);
  };

  $scope.updateMtargetName = function () {
    $scope.mtarget.name = '';
  };

  $scope.mtargetNameIsModified = false;
  $scope.toogleMtargetNameBox = function () {
    $scope.mtargetNameIsModified = !$scope.mtargetNameIsModified;
  };

  $scope.init();
  if (!$scope.mtarget) {
    $ionicHistory.clearCache();
    $ionicHistory.clearHistory();
    $state.go('intro', {}, {cache: false, reload: true});
  }

})

.controller('MissionsCtrl', function ($ionicPlatform) {
  $ionicPlatform.ready(function () {

  });
})

.controller('ResourcesCtrl', function ($ionicPlatform) {
  $ionicPlatform.ready(function () {

  });
})

.controller('AboutsCtrl', function ($ionicPlatform, $ionicScrollDelegate, $ionicHistory, $cordovaInAppBrowser, $scope, $state, NotifyService, ConfigService, LoadingService) {
  $scope.doLogout = function () {
    $ionicScrollDelegate.scrollTop();
    ConfigService.purge();
    NotifyService.purge();
    $ionicHistory.clearCache();
    $ionicHistory.clearHistory();
    $state.go('intro', {}, {cache: false, reload: true});
  };

  $scope.openDonationModal = function () {
    var options = {
        location: 'no',
        clearcache: 'yes',
        toolbar: 'yes'
      };

    $cordovaInAppBrowser.open('http://www.ccea.org.tw/Content/Page.aspx?t=7&u=201', '_blank', options)
    .then( function () {
    })
    .catch(function (err) {
      LoadingService.log(err);
    });
  };

})


.controller('TWZipCodeCtrl', function ($scope, TWZipCode, KeyboardService) {

  TWZipCode.all().then(function (sel) {
    $scope.twZipCodeData = sel;
  });

  $scope.regionSubmit = function () {
    $scope.twzipcode = {};
    $scope.twzipcode.city = '';
    $scope.twzipcode.region = ($scope.invert($scope.twzipcode.citySel))[$scope.twzipcode.regionSel];

    $scope.each($scope.twZipCodeData, function (_dt, city) {
      if (city) {
        var c = city;
        $scope.each(_dt, function (_zipcode) {
          if (_zipcode === $scope.twzipcode.regionSel) {
            $scope.twzipcode.city = c;
          }
        });
      }
    });

    if ($scope.twzipcode.city && $scope.twzipcode.region) {
      $scope.map.items = [];
      $scope.map.page = 1;
      $scope.map.total = 0;
      $scope.fetchList($scope.twzipcode.city, $scope.twzipcode.region, $scope.twzipcode.filter);
      KeyboardService.close();
    }

  };

})


.controller('InputKeywordCtrl', function ($scope, KeyboardService) {

  $scope.keywordSubmit = function () {
    if ($scope.keyword) {
      KeyboardService.close();
      $scope.map.items = [];
      $scope.map.page = 1;
      $scope.map.total = 0;
      $scope.fetchList($scope.keyword);
    }
  };

})


.controller('TabCtrl', function ($scope, $log, $q, AlertBadgesService) {
  $scope.badges = {};

  $scope.$watch(
    function () {
      return AlertBadgesService.targets().count;
    },
    function (newVal) {
      $scope.badges.prayer = newVal;
    }
  );

})



;
