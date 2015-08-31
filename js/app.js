
var API_KEY = '8b9cfd7f-7640-4469-bd02-1128b2eab11f';
var baseUrl = 'https://na.api.pvp.net';
var wrapApiKey = function(url) {
  return url + '?api_key=' + API_KEY;
};

angular.module('app', ['ngRoute', 'ui.bootstrap'])

.constant('DataSet', {
    dataSet1: {
      version: '5.11.1',
      region: 'na',
      data: ['1900729148', '1900734999', '1900735484', '1900735825', '1900736607']
    },
    dataSet2: {
      version: '5.14.1',
      region: 'na',
      data: ['1900729148', '1900734999', '1900735484', '1900735825', '1900736607']
    }
  }
)

.config(function($routeProvider) {
  $routeProvider
    .when('/',
    {
      templateUrl: "app.html",
      controller: "AppCtrl",
      resolve: {
        items: function(StaticDataService) {
          return StaticDataService.getItemListAsync();
        },
        champions: function(StaticDataService) {
          return StaticDataService.getChampionListAsync();
        },
        matches: function(MatchService, DataSet) {
          return MatchService.getMatches(DataSet.dataSet1.data);
        },
        matches2: function(MatchService, DataSet) {
          return MatchService.getMatches(DataSet.dataSet2.data);
        }
      }
    }
  )
})

.factory('StaticDataService', function($http) {

  var cachedChampionList = null;
  var cachedItemList = null;
  var version = '';
  var region = '';

  return {

    with: function(version, region) {
      version = version;
      region = region;
    },

    getItemListAsync: function() {
      if (cachedItemList != null) {
        return cachedItemList;
      } else {
        return $http.get('http://ddragon.leagueoflegends.com/cdn/5.14.1/data/en_US/item.json')
          .then(function(data) {
            cachedItemList = data.data.data;
            return cachedItemList;
          });
      }
    },

    getChampionListAsync: function() {
      if (cachedChampionList != null) {
        return cachedChampionList; // use cache instead of make http request
      } else {
        return $http.get('http://ddragon.leagueoflegends.com/cdn/5.14.1/data/en_US/champion.json')
          .then(function(championList) { 
            var result = championList.data.data;
            cachedChampionList = _.values(result); 
            return cachedChampionList;
          });
      }
    },

    getChampionList: function () {
      return cachedChampionList;
    },

    getChampionIcon: function(championImageName) {
      return 'http://ddragon.leagueoflegends.com/cdn/5.14.1/img/champion/' + championImageName;
    },

    getItemList: function() {
      return cachedItemList;
    },

    getItemIcon: function(itemImageName) {
      return 'http://ddragon.leagueoflegends.com/cdn/5.14.1/img/item/' + itemImageName;
    },
  }
})

.factory('ItemService', function($http, StaticDataService) {
  return {
    getItem: function(itemId) {
      var itemList = StaticDataService.getItemList();
      return itemList[itemId];
    }
  }
})

.factory('ChampionService', function($http, StaticDataService) {
  return {
    getChampion: function(championId) {
      var championList = StaticDataService.getChampionList();
      return _.findWhere(championList, { key: championId + ""});
    }
  }
})

.factory('MatchService', function($http, $q) {
  return {
    getMatches: function(matchIds) {
      var requests = matchIds.map(function(matchId) {
        return this.getMatch(matchId);
      }.bind(this));
      return $q.all(requests);
    },
    getMatch: function(matchId) {
      var matchApiUrl = wrapApiKey(baseUrl + "/api/lol/na/v2.2/match/" + matchId);
      return $http.get(matchApiUrl)
        .then(function(data) { return data.data; })
    }
  }
})

.controller('AppCtrl', function($scope, StaticDataService, ChampionService, ItemService, matches, matches2, items, champions) {

  $scope.alerts = [];

  $scope.closeAlert = function(index) {
    $scope.alerts.splice(index, 1);
  };

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

  $scope.stats = mapReduceStats(matches);

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

  function mapReduceApItemStats(matches, top) {
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

  function mapItemData(itemId) {
    var itemData = ItemService.getItem(itemId);
    return {
      data: itemData,
      icon: StaticDataService.getItemIcon(itemData.image.full)
    }
  }

  function mapChampionData(championId) {
    var champion = ChampionService.getChampion(championId);
    return {
      data: champion,
      icon: StaticDataService.getChampionIcon(champion.image.full)
    };
  }

  function mapMatchToViewData(match) {
    return match.participants.map(function(participant) { 
      var items = getParticipantItems(participant);
      return {
        champion: mapChampionData(participant.championId),
        items: items.map(function(item) {return mapItemData(item); })
      }
    });
  }

  // View Models

  $scope.itemsData = mapReduceApItemStats(matches)
    .map(function(item) {
      return _.assign({}, mapItemData(item.id), { uses: item.uses });
    });

  var lanes = ['MIDDLE', 'TOP', 'BOTTOM', 'JUNGLE'];
  $scope.topChampionPicks = lanes.map(function(lane) {
    return {
      champions: mapReduceChampionPosition(matches, lane)
        .map(function(champion) {
          return {
            champion: mapChampionData(champion.id),
            uses: champion.uses
          }
        }),
      lane: lane
    }
  });

  $scope.matchesData = _.map(matches, function(match) {
    return {
      matchId: match.matchId,
      participants: mapMatchToViewData(match)
    };
  });

});
