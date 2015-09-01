angular.module('app')

.config(function($routeProvider) {

  $routeProvider
    .when('/',
    {
      templateUrl: "app.html",
      controller: "AppCtrl",
      resolve: {
        dataService: function($q, StaticDataService, DataSet) {
          var staticDataService = new StaticDataService(DataSet.dataSet1);
          return staticDataService.initAllDataAsync();
        },
        dataService2: function(StaticDataService, DataSet) {
          var staticDataService = new StaticDataService(DataSet.dataSet2);
          return staticDataService.initAllDataAsync();
        },
      }
    }
  )
});
