angular.module('app')

.factory('StaticDataService', function($http, $q) {

  var StaticDataService = function(dataSet) {
    this.version = dataSet.version;
    this.region = dataSet.region;
    this.matches = dataSet.matches;
    this.championList = null;
    this.itemList = null;
    this.matchList = null;
  };

  _.extend(StaticDataService.prototype, {

    initAllDataAsync: function() {
      var self = this;
      return $q.all([
        this.getChampionListAsync(),
        this.getItemListAsync(),
        this.getMatchesAsync(this.matches),
      ]).then(function() {
        return self;
      });
    },

    getItemListAsync: function() {
      return $http.get('http://ddragon.leagueoflegends.com/cdn/' + this.version + '/data/en_US/item.json')
        .then(function(data) {
          this.itemList = data.data.data;
          return this.itemList;
        }.bind(this));
    },

    getChampionListAsync: function() {
      return $http.get('http://ddragon.leagueoflegends.com/cdn/' + this.version + '/data/en_US/champion.json')
        .then(function(data) {
          var result = data.data.data;
          this.championList = _.values(result);
          return this.championList;
        }.bind(this));
    },

    getChampionList: function () {
      return this.championList;
    },

    getChampionIcon: function(championImageName) {
      return 'http://ddragon.leagueoflegends.com/cdn/' + this.version + '/img/champion/' + championImageName;
    },

    getItemList: function() {
      return this.itemList;
    },

    getItemIcon: function(itemImageName) {
      return 'http://ddragon.leagueoflegends.com/cdn/' + this.version + '/img/item/' + itemImageName;
    },

    getItem: function(itemId) {
      var itemList = this.getItemList();
      return itemList[itemId];
    },

    getChampion: function(championId) {
      var championList = this.getChampionList();
      return _.findWhere(championList, { key: championId + ""});
    },

    getMatchList: function() {
      return this.matchList;
    },

    getMatchesAsync: function(matchIds) {
      var requests = matchIds.map(function(matchId) {
        return this.getMatch(matchId);
      }.bind(this));
      return $q.all(requests)
        .then(function(matches) {
          this.matchList = matches;
          return matches;
        }.bind(this));
    },

    getMatch: function(matchId) {
      var matchApiUrl = wrapApiKey(baseUrl + "/api/lol/na/v2.2/match/" + matchId);
      return $http.get(matchApiUrl)
        .then(function(data) { return data.data; })
    }

  });

  return StaticDataService;
})

.controller('AppCtrl', function($scope, dataService, dataService2) {

  // Alerts
  $scope.alerts = [];
  $scope.closeAlert = function(index) {
    $scope.alerts.splice(index, 1);
  };

  // Shared Logic

  function filterApItems(items) {
    return _(items)
      .map(function(v, k) { v.id = parseInt(k, 10); return v; })
      .values()
      .filter(function(item) {
        var keywords = ['Mana', 'ManaRegen', 'SpellDamage', 'SpellBlock'];
        return _.intersection(item.tags, keywords).length > 0;
      })
      .value();
  }

  function mapReduceStats(matches) {
    var participants = getAllParticipantFromMatches(matches);
    var matchDurations = _.pluck(matches, 'matchDuration');

    var ret = _.reduce(participants, function(total, participant, i) {
      var index = Math.ceil(i/10)-1;
      var matchDuration = matchDurations[index < 0 ? 0 : index];

      total.kills += participant.stats.kills;
      total.magicDamageDealt += participant.stats.magicDamageDealt;
      total.magicDamageDealtToChampions += participant.stats.magicDamageDealtToChampions;
      total.creepsPerMin += participant.stats.minionsKilled / (matchDuration/60);
      total.godPerMin += participant.stats.goldEarned / (matchDuration/60);
      return total;
    }, {
      kills: 0,
      magicDamageDealt: 0,
      magicDamageDealtToChampions: 0,
      creepsPerMin: 0,
      godPerMin: 0
    });

    return _.mapValues(ret, function(v) {
      return (v / matches.length).toFixed(2);
    });
  }

  function getParticipantItems(participant) {
    return [0, 1, 2, 3, 4, 5, 6]
      .map(function(i) {
        return participant.stats['item' + i];
      })
     .filter(function(item) { return item > 0; });
  }

  function getAllParticipantFromMatches(matches) {
    return _.reduce(matches, function(total, match) {
        total = total.concat(match.participants);
        return total;
      }, []);
  }

  function mapReduceApItemStats(items, matches, top) {
    var top = top || 10;
    var apItemIdsDict = _.reduce(filterApItems(items), function(arr, item) {
      arr.push({ id: item.id, uses: 0 });
      return arr;
    }, []);

    // reduce matches ap item use frequency
    var dict = getAllParticipantFromMatches(matches)
      .reduce(function(dict, participant) {
        getParticipantItems(participant).forEach(function(item) {
          var index = _.findIndex(dict, { id: item });
          if (index != -1) dict[index].uses++;
        });
        return dict;
      }, apItemIdsDict);

    return _(dict)
      .sortByOrder(['uses'], ['desc'])
      .take(top)
      .value();

    // return [{ id: 1004, uses: 0}]
  }


  function mapReduceChampionPosition(matches, lane, top) {
    var top = top || 5;
    var participants = getAllParticipantFromMatches(matches);

    var laners = _(participants)
      .groupBy(function(p) {
        return p.timeline.lane;
      })
      .get(lane);

    var ret = _(laners)
      .groupBy(function(l) { return l.championId; })
      .sortBy(function(v, k){ return -v.length; })
      .map(function(v, k) { return { id: v[0].championId, uses: v.length } })
      .take(top)
      .value();

    return ret;

    // return [{championId: 12, uses: 0}]

  }

  // View Models

  // init data from service

  var ViewModel = function(dataService) {
    this.dataService = dataService;
    this.items = dataService.getItemList();
    this.champions = dataService.getChampionList();
    this.matches = dataService.getMatchList();
  };

  _.extend(ViewModel.prototype, {

    mapItemData: function(itemId) {
      var itemData = this.dataService.getItem(itemId);
      return {
        data: itemData,
        icon: this.dataService.getItemIcon(itemData.image.full)
      }
    },

    mapChampionData: function(championId) {
      var champion = this.dataService.getChampion(championId);
      return {
        data: champion,
        icon: this.dataService.getChampionIcon(champion.image.full)
      };
    },

    mapMatchToViewData: function(match) {
      var self = this;

      return match.participants.map(function(participant) {
        var items = getParticipantItems(participant);
        return {
          champion: self.mapChampionData(participant.championId),
          items: items.map(function(item) {return self.mapItemData(item); })
        }
      });
    },

    apItemStats: function() {
      var self = this;

      return mapReduceApItemStats(this.items, this.matches)
        .map(function(item) {
          return _.assign({}, self.mapItemData(item.id), { uses: item.uses });
        });
    },

    topChampionPicks: function() {
      var self = this;
      var lanes = ['MIDDLE', 'TOP', 'BOTTOM', 'JUNGLE'];
      var matches = this.matches;

      return lanes.map(function(lane) {
        return {
          champions: mapReduceChampionPosition(matches, lane)
            .map(function(champion) {
              return {
                champion: self.mapChampionData(champion.id),
                uses: champion.uses
              }
            }),
          lane: lane
        }
      });
    },

    matchesStats: function() {
      return mapReduceStats(this.matches);
    },

    matchesData: function() {
      var self = this;

      return _.map(this.matches, function(match) {
          return {
            matchId: match.matchId,
            participants: self.mapMatchToViewData(match)
          };
        });
    },

  });

  var dataSetOneVM = new ViewModel(dataService);
  var dataSetTwoVM = new ViewModel(dataService2);

  $scope.dataSets = [
    {
      dataService: dataService,
      itemsData: dataSetOneVM.apItemStats(),
      topChampionPicks: dataSetOneVM.topChampionPicks(),
      stats: dataSetOneVM.matchesStats(),
      matchesData: dataSetOneVM.matchesData()
    },
    {
      dataService: dataService2,
      itemsData: dataSetTwoVM.apItemStats(),
      topChampionPicks: dataSetTwoVM.topChampionPicks(),
      stats: dataSetTwoVM.matchesStats(),
      matchesData: dataSetTwoVM.matchesData()
    }
  ];

  // END init hide progress

});
