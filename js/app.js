
var baseUrl = 'https://na.api.pvp.net';
var wrapApiKey = function(url) { return url + '?api_key=' + API_KEY; };

angular.module('app', ['ngRoute', 'ui.bootstrap']);
